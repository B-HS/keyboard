/**
 * jscad → STL/DXF 일괄 export + STL coplanar polygon 병합 후처리
 * CSG가 분할한 동일 평면 인접 삼각형들을 하나의 큰 polygon으로 재구성 후 fan 삼각화 →
 * STL viewer에서 외곽 edge만 보이고 내부 분할선이 사라짐.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as jscadModeling from '@jscad/modeling'
import earcut from 'earcut'
// @ts-expect-error - no types
import * as stlSerializer from '@jscad/stl-serializer'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const SRC_DIR = join(ROOT, '49-pcba')
const OUT_DIR = join(SRC_DIR, 'export')

const STL_FILES = ['49-pcba-housing-top', '49-pcba-housing-bottom', 'keyboard-plate-extended']
const PLATE_FILE = 'keyboard-plate-extended'

const requireShim = (id: string): unknown => {
    if (id === '@jscad/modeling') return jscadModeling
    throw new Error(`Unsupported require('${id}')`)
}

const evaluateMain = (source: string): unknown => {
    const factory = new Function('require', 'module', 'exports', source) as (
        req: typeof requireShim,
        mod: { exports: Record<string, unknown> },
        exp: Record<string, unknown>,
    ) => void
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} }
    factory(requireShim, moduleObj, moduleObj.exports)
    const main = moduleObj.exports.main as (() => unknown) | undefined
    if (typeof main !== 'function') throw new Error('main() not exported')
    return main()
}

const evaluatePlate2d = (source: string): unknown => {
    const wrapped = source + '\nmodule.exports.plate2d = plate2d;'
    const factory = new Function('require', 'module', 'exports', wrapped) as (
        req: typeof requireShim,
        mod: { exports: Record<string, unknown> },
        exp: Record<string, unknown>,
    ) => void
    const moduleObj: { exports: Record<string, unknown> } = { exports: {} }
    factory(requireShim, moduleObj, moduleObj.exports)
    if (!moduleObj.exports.plate2d) throw new Error('plate2d not found')
    return moduleObj.exports.plate2d
}

// =====================================================================
// STL 후처리: 동일 평면 인접 삼각형 병합 → fan 삼각화로 깔끔한 외곽 edge만 남김
// =====================================================================

type V3 = [number, number, number]
type Tri = { n: V3; v: [V3, V3, V3] }

const PREC = 4 // 좌표 라운드 자릿수
const r = (n: number) => Number(n.toFixed(PREC))
const rN = (n: number) => Number(n.toFixed(3))
const vk = (p: V3) => `${r(p[0])},${r(p[1])},${r(p[2])}`
const ek = (a: V3, b: V3) => `${vk(a)}|${vk(b)}` // 방향 있는 edge

const parseStl = (buf: Buffer): Tri[] => {
    const count = buf.readUInt32LE(80)
    const tris: Tri[] = []
    for (let i = 0; i < count; i++) {
        const o = 84 + i * 50
        tris.push({
            n: [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)],
            v: [
                [buf.readFloatLE(o + 12), buf.readFloatLE(o + 16), buf.readFloatLE(o + 20)],
                [buf.readFloatLE(o + 24), buf.readFloatLE(o + 28), buf.readFloatLE(o + 32)],
                [buf.readFloatLE(o + 36), buf.readFloatLE(o + 40), buf.readFloatLE(o + 44)],
            ],
        })
    }
    return tris
}

const writeStl = (tris: Tri[]): Buffer => {
    const buf = Buffer.alloc(84 + tris.length * 50)
    buf.writeUInt32LE(tris.length, 80)
    for (let i = 0; i < tris.length; i++) {
        const o = 84 + i * 50
        const t = tris[i]
        buf.writeFloatLE(t.n[0], o)
        buf.writeFloatLE(t.n[1], o + 4)
        buf.writeFloatLE(t.n[2], o + 8)
        for (let j = 0; j < 3; j++) {
            buf.writeFloatLE(t.v[j][0], o + 12 + j * 12)
            buf.writeFloatLE(t.v[j][1], o + 16 + j * 12)
            buf.writeFloatLE(t.v[j][2], o + 20 + j * 12)
        }
    }
    return buf
}

const planeKey = (t: Tri): string => {
    const nx = rN(t.n[0])
    const ny = rN(t.n[1])
    const nz = rN(t.n[2])
    const d = rN(t.n[0] * t.v[0][0] + t.n[1] * t.v[0][1] + t.n[2] * t.v[0][2])
    return `${nx}|${ny}|${nz}|${d}`
}

// 평면 normal로 직교 basis 생성
const makeBasis = (n: V3): [V3, V3] => {
    const ax = Math.abs(n[0])
    const ay = Math.abs(n[1])
    const az = Math.abs(n[2])
    let u: V3
    if (ax <= ay && ax <= az) u = [0, n[2], -n[1]]
    else if (ay <= az) u = [n[2], 0, -n[0]]
    else u = [n[1], -n[0], 0]
    const ul = Math.hypot(u[0], u[1], u[2]) || 1
    u = [u[0] / ul, u[1] / ul, u[2] / ul]
    const v: V3 = [n[1] * u[2] - n[2] * u[1], n[2] * u[0] - n[0] * u[2], n[0] * u[1] - n[1] * u[0]]
    return [u, v]
}

// 평면 그룹 → 외곽 directed edge 추출 → loop stitch → earcut 삼각화
const remeshPlaneGroup = (group: Tri[]): Tri[] => {
    if (group.length < 2) return group

    // 1. 양방향 edge 카운트로 boundary 판별 (boundary edge = 그룹 내 한 번만 등장)
    const edgeCount = new Map<string, number>()
    for (const t of group) {
        for (let i = 0; i < 3; i++) {
            const a = t.v[i]
            const b = t.v[(i + 1) % 3]
            const k = ek(a, b)
            edgeCount.set(k, (edgeCount.get(k) || 0) + 1)
        }
    }

    // boundary edge: 정방향 1번 + 역방향 0번 (= 다른 삼각형이 공유 안 함)
    const directedBoundary: [V3, V3][] = []
    for (const t of group) {
        for (let i = 0; i < 3; i++) {
            const a = t.v[i]
            const b = t.v[(i + 1) % 3]
            const fwd = ek(a, b)
            const rev = ek(b, a)
            if ((edgeCount.get(fwd) || 0) === 1 && (edgeCount.get(rev) || 0) === 0) {
                directedBoundary.push([a, b])
            }
        }
    }
    if (directedBoundary.length < 3) return group

    // 2. directed edge로 closed loop 합치기
    const startMap = new Map<string, [V3, V3]>()
    for (const e of directedBoundary) startMap.set(vk(e[0]), e)
    const usedEdges = new Set<[V3, V3]>()
    const loops: V3[][] = []
    for (const start of directedBoundary) {
        if (usedEdges.has(start)) continue
        const loop: V3[] = []
        let cur: [V3, V3] | undefined = start
        const startK = vk(start[0])
        while (cur && !usedEdges.has(cur)) {
            usedEdges.add(cur)
            loop.push(cur[0])
            const nextK = vk(cur[1])
            if (nextK === startK) break
            cur = startMap.get(nextK)
        }
        if (loop.length >= 3) loops.push(loop)
    }
    if (loops.length === 0) return group

    // 2-b. collinear vertex 제거 (직선 위 중간점 제거 → earcut이 최소 삼각형 출력)
    const simplifyLoop = (loop: V3[]): V3[] => {
        if (loop.length < 4) return loop
        const cross = (a: V3, b: V3, c: V3): number => {
            const d1: V3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]
            const d2: V3 = [c[0] - a[0], c[1] - a[1], c[2] - a[2]]
            const cx = d1[1] * d2[2] - d1[2] * d2[1]
            const cy = d1[2] * d2[0] - d1[0] * d2[2]
            const cz = d1[0] * d2[1] - d1[1] * d2[0]
            return Math.hypot(cx, cy, cz)
        }
        // 반복적으로 collinear vertex 제거
        let cur = loop.slice()
        let changed = true
        while (changed && cur.length > 3) {
            changed = false
            const next: V3[] = []
            for (let i = 0; i < cur.length; i++) {
                const prev = cur[(i - 1 + cur.length) % cur.length]
                const c = cur[i]
                const nxt = cur[(i + 1) % cur.length]
                if (cross(prev, c, nxt) > 1e-4) next.push(c)
                else changed = true
            }
            if (next.length >= 3) cur = next
            else break
        }
        return cur
    }
    for (let i = 0; i < loops.length; i++) loops[i] = simplifyLoop(loops[i])

    // 3. 평면 normal 기준 basis로 2D 투영
    const n = group[0].n
    const [bu, bv] = makeBasis(n)
    const proj = (p: V3): [number, number] => [
        p[0] * bu[0] + p[1] * bu[1] + p[2] * bu[2],
        p[0] * bv[0] + p[1] * bv[1] + p[2] * bv[2],
    ]

    // 4. 각 loop의 signed area로 outer/hole 분류 (양수 = outer, 음수 = hole)
    const signedArea = (loop: V3[]): number => {
        let s = 0
        for (let i = 0; i < loop.length; i++) {
            const [x1, y1] = proj(loop[i])
            const [x2, y2] = proj(loop[(i + 1) % loop.length])
            s += x1 * y2 - x2 * y1
        }
        return s / 2
    }
    const outers: V3[][] = []
    const holes: V3[][] = []
    for (const l of loops) {
        if (signedArea(l) > 0) outers.push(l)
        else holes.push(l)
    }
    if (outers.length === 0) return group

    // 5. 각 outer에 대해 어느 hole이 속하는지 분류 후 earcut 삼각화
    const result: Tri[] = []
    const pointInPoly = (pt: [number, number], poly: [number, number][]): boolean => {
        let inside = false
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i][0]
            const yi = poly[i][1]
            const xj = poly[j][0]
            const yj = poly[j][1]
            const intersect =
                yi > pt[1] !== yj > pt[1] && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi
            if (intersect) inside = !inside
        }
        return inside
    }

    for (const outer of outers) {
        const outerProj = outer.map(proj)
        const myHoles = holes.filter((h) => {
            const hp = proj(h[0])
            return pointInPoly(hp, outerProj)
        })

        const flat: number[] = []
        const allV: V3[] = []
        for (const p of outer) {
            const [x2, y2] = proj(p)
            flat.push(x2, y2)
            allV.push(p)
        }
        const holeIndices: number[] = []
        for (const h of myHoles) {
            holeIndices.push(allV.length)
            for (const p of h) {
                const [x2, y2] = proj(p)
                flat.push(x2, y2)
                allV.push(p)
            }
        }
        let idx: number[]
        try {
            idx = earcut(flat, holeIndices)
        } catch {
            return group // earcut 실패 시 원본 유지
        }
        if (idx.length < 3) return group
        for (let i = 0; i < idx.length; i += 3) {
            result.push({ n, v: [allV[idx[i]], allV[idx[i + 1]], allV[idx[i + 2]]] })
        }
    }
    return result.length > 0 ? result : group
}

const cleanupStl = (buf: Buffer): Buffer => {
    if (buf.length < 84) return buf
    const tris = parseStl(buf)
    const groups = new Map<string, Tri[]>()
    for (const t of tris) {
        const k = planeKey(t)
        if (!groups.has(k)) groups.set(k, [])
        groups.get(k)!.push(t)
    }
    const newTris: Tri[] = []
    for (const grp of groups.values()) {
        newTris.push(...remeshPlaneGroup(grp))
    }
    return writeStl(newTris)
}

// =====================================================================
// DXF (plate 2D)
// =====================================================================

type Pt = [number, number]
type Side = [Pt, Pt]

const extractLoops = (sides: Side[]): Pt[][] => {
    const key = (p: Pt) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`
    const startMap = new Map<string, Side>()
    for (const s of sides) startMap.set(key(s[0]), s)
    const used = new Set<Side>()
    const loops: Pt[][] = []
    for (const start of sides) {
        if (used.has(start)) continue
        const loop: Pt[] = [start[0]]
        let cur = start
        while (!used.has(cur)) {
            used.add(cur)
            loop.push(cur[1])
            const next = startMap.get(key(cur[1]))
            if (!next || used.has(next)) break
            cur = next
        }
        if (loop.length >= 3) loops.push(loop)
    }
    return loops
}

const buildCompleteDxf = (geom2: unknown): string => {
    const sides = jscadModeling.geometries.geom2.toSides(
        geom2 as Parameters<typeof jscadModeling.geometries.geom2.toSides>[0],
    ) as Side[]
    const loops = extractLoops(sides)
    let handleCounter = 0x100
    const nextHandle = () => (handleCounter++).toString(16).toUpperCase()
    const lines: string[] = []
    const w = (...vals: (string | number)[]) => {
        for (const v of vals) lines.push(String(v))
    }
    w('0', 'SECTION', '2', 'HEADER')
    w('9', '$ACADVER', '1', 'AC1015')
    w('9', '$INSUNITS', '70', 4)
    w('9', '$HANDSEED', '5', 'FFFF')
    w('0', 'ENDSEC')
    w('0', 'SECTION', '2', 'CLASSES', '0', 'ENDSEC')
    w('0', 'SECTION', '2', 'TABLES')
    w('0', 'TABLE', '2', 'VPORT', '5', '8', '330', '0', '100', 'AcDbSymbolTable', '70', 0, '0', 'ENDTAB')
    w('0', 'TABLE', '2', 'LTYPE', '5', '5', '330', '0', '100', 'AcDbSymbolTable', '70', 1)
    w('0', 'LTYPE', '5', '14', '330', '5', '100', 'AcDbSymbolTableRecord',
        '100', 'AcDbLinetypeTableRecord', '2', 'CONTINUOUS', '70', 0, '3', 'Solid line',
        '72', 65, '73', 0, '40', 0.0)
    w('0', 'ENDTAB')
    w('0', 'TABLE', '2', 'LAYER', '5', '2', '330', '0', '100', 'AcDbSymbolTable', '70', 1)
    w('0', 'LAYER', '5', '10', '330', '2', '100', 'AcDbSymbolTableRecord',
        '100', 'AcDbLayerTableRecord', '2', '0', '70', 0, '62', 7, '6', 'CONTINUOUS')
    w('0', 'ENDTAB')
    w('0', 'TABLE', '2', 'STYLE', '5', '3', '330', '0', '100', 'AcDbSymbolTable', '70', 0, '0', 'ENDTAB')
    w('0', 'TABLE', '2', 'VIEW', '5', '6', '330', '0', '100', 'AcDbSymbolTable', '70', 0, '0', 'ENDTAB')
    w('0', 'TABLE', '2', 'UCS', '5', '7', '330', '0', '100', 'AcDbSymbolTable', '70', 0, '0', 'ENDTAB')
    w('0', 'TABLE', '2', 'APPID', '5', '9', '330', '0', '100', 'AcDbSymbolTable', '70', 1)
    w('0', 'APPID', '5', '12', '330', '9', '100', 'AcDbSymbolTableRecord',
        '100', 'AcDbRegAppTableRecord', '2', 'ACAD', '70', 0)
    w('0', 'ENDTAB')
    w('0', 'TABLE', '2', 'DIMSTYLE', '5', 'A', '330', '0', '100', 'AcDbSymbolTable', '70', 0,
        '100', 'AcDbDimStyleTable', '0', 'ENDTAB')
    w('0', 'TABLE', '2', 'BLOCK_RECORD', '5', '1', '330', '0', '100', 'AcDbSymbolTable', '70', 1)
    w('0', 'BLOCK_RECORD', '5', '1F', '330', '1', '100', 'AcDbSymbolTableRecord',
        '100', 'AcDbBlockTableRecord', '2', '*MODEL_SPACE')
    w('0', 'BLOCK_RECORD', '5', '1B', '330', '1', '100', 'AcDbSymbolTableRecord',
        '100', 'AcDbBlockTableRecord', '2', '*PAPER_SPACE')
    w('0', 'ENDTAB', '0', 'ENDSEC')
    w('0', 'SECTION', '2', 'BLOCKS')
    w('0', 'BLOCK', '5', '20', '330', '1F', '100', 'AcDbEntity', '8', '0',
        '100', 'AcDbBlockBegin', '2', '*MODEL_SPACE', '70', 0,
        '10', 0.0, '20', 0.0, '30', 0.0, '3', '*MODEL_SPACE', '1', '')
    w('0', 'ENDBLK', '5', '21', '330', '1F', '100', 'AcDbEntity', '8', '0', '100', 'AcDbBlockEnd')
    w('0', 'BLOCK', '5', '1C', '330', '1B', '100', 'AcDbEntity', '67', 1, '8', '0',
        '100', 'AcDbBlockBegin', '2', '*PAPER_SPACE', '70', 0,
        '10', 0.0, '20', 0.0, '30', 0.0, '3', '*PAPER_SPACE', '1', '')
    w('0', 'ENDBLK', '5', '1D', '330', '1B', '100', 'AcDbEntity', '67', 1, '8', '0', '100', 'AcDbBlockEnd')
    w('0', 'ENDSEC')
    w('0', 'SECTION', '2', 'ENTITIES')
    for (const loop of loops) {
        const pts = loop[0][0] === loop[loop.length - 1][0] && loop[0][1] === loop[loop.length - 1][1]
            ? loop.slice(0, -1)
            : loop
        const handle = nextHandle()
        w('0', 'LWPOLYLINE', '5', handle, '330', '1F', '100', 'AcDbEntity', '8', '0',
            '100', 'AcDbPolyline', '90', pts.length, '70', 1)
        for (const [x, y] of pts) {
            w('10', x.toFixed(4), '20', y.toFixed(4))
        }
    }
    w('0', 'ENDSEC')
    w('0', 'SECTION', '2', 'OBJECTS')
    w('0', 'DICTIONARY', '5', 'C', '330', '0', '100', 'AcDbDictionary', '281', 1,
        '3', 'ACAD_GROUP', '350', 'D')
    w('0', 'DICTIONARY', '5', 'D', '330', 'C', '100', 'AcDbDictionary', '281', 1)
    w('0', 'ENDSEC')
    w('0', 'EOF')
    return lines.join('\r\n') + '\r\n'
}

mkdirSync(OUT_DIR, { recursive: true })

for (const name of STL_FILES) {
    const inPath = join(SRC_DIR, `${name}.jscad`)
    const outPath = join(OUT_DIR, `${name}.stl`)
    const source = await Bun.file(inPath).text()
    const geom = evaluateMain(source)
    const data = stlSerializer.serialize({ binary: true }, geom) as ArrayBuffer[]
    const raw = Buffer.concat(data.map((c) => Buffer.from(c)))
    const beforeCount = raw.readUInt32LE(80)
    const cleaned = cleanupStl(raw)
    const afterCount = cleaned.readUInt32LE(80)
    writeFileSync(outPath, cleaned)
    console.log(`✓ ${name}.stl  ${cleaned.length}B  tri ${beforeCount}→${afterCount}`)
}

{
    const inPath = join(SRC_DIR, `${PLATE_FILE}.jscad`)
    const outPath = join(OUT_DIR, `${PLATE_FILE}.dxf`)
    const source = await Bun.file(inPath).text()
    const plate2d = evaluatePlate2d(source)
    const dxf = buildCompleteDxf(plate2d)
    writeFileSync(outPath, dxf)
    console.log(`✓ ${PLATE_FILE}.dxf (${dxf.length} bytes)`)
}

console.log(`\nExported to ${OUT_DIR}`)
