/**
 * jscad → STL 일괄 export + KiCad PCB STL/Gerber/PCBA 파일 생성.
 *
 *  1. Render STL (jscad) → 49-pcba/export/
 *       plate.stl
 *       top-case.stl
 *       bottom-case.stl
 *  2. KiCad PCB STL → 49-pcba/export/pcb.stl  (viewer 에 끼우기용 실제 PCB)
 *  3. PCB Gerber + drill + pnp + zip → 49-pcba/export/fab/ + fab.zip
 *  4. JLCPCB PCBA (다이오드만) → 49-pcba/export/jlcpcb/
 *       bom.csv  (D × 49, LCSC C81598 = 1N4148W Basic Part)
 *       cpl.csv  (D 위치)
 *
 * STL coplanar polygon 후처리 (cleanupStl) 는 unused — housing/plate 모두 raw 사용
 * (boolean sliver 영역 self-intersecting 회피). 형상 단순화 시 재사용 가능하여 보존.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { $ } from 'bun'
import earcut from 'earcut'
// @ts-expect-error - no types
import * as stlSerializer from '@jscad/stl-serializer'
import { evaluateJscadSource } from '../shared/lib/jscad/jscad-to-three'
import { buildHousingTopGeom, buildHousingBottomGeom } from '../49-pcba/build'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const PCBA_DIR = join(ROOT, '49-pcba')
const OUT_DIR = join(PCBA_DIR, 'export')
const FAB_DIR = join(OUT_DIR, 'fab')
const JLC_DIR = join(OUT_DIR, 'jlcpcb')
const ZIP_PATH = join(OUT_DIR, 'fab.zip')
const PLATE_JSCAD = 'keyboard-plate-extended'

const KICAD_PCB = join(PCBA_DIR, 'no-hotswap-diode-arranged', 'keyboard', 'keyboard.kicad_pcb')
const KICAD_CLI = '/Applications/KiCad/KiCad.app/Contents/MacOS/kicad-cli'

// JLCPCB Basic Part: 1N4148W (SOD-123). 대량 stock, placement 무료.
const DIODE_LCSC = 'C81598'
const DIODE_VALUE = '1N4148W'
const DIODE_FOOTPRINT = 'SOD-123'

// =====================================================================
// STL 후처리 (현재 unused — 보존)
// =====================================================================

type V3 = [number, number, number]
type Tri = { n: V3; v: [V3, V3, V3] }

const PREC = 4
const r = (n: number) => Number(n.toFixed(PREC))
const rN = (n: number) => Number(n.toFixed(3))
const vk = (p: V3) => `${r(p[0])},${r(p[1])},${r(p[2])}`
const ek = (a: V3, b: V3) => `${vk(a)}|${vk(b)}`

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

const remeshPlaneGroup = (group: Tri[]): Tri[] => {
    if (group.length < 2) return group
    const edgeCount = new Map<string, number>()
    for (const t of group) {
        for (let i = 0; i < 3; i++) {
            const a = t.v[i]
            const b = t.v[(i + 1) % 3]
            const k = ek(a, b)
            edgeCount.set(k, (edgeCount.get(k) || 0) + 1)
        }
    }
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
    const n = group[0].n
    const [bu, bv] = makeBasis(n)
    const proj = (p: V3): [number, number] => [
        p[0] * bu[0] + p[1] * bu[1] + p[2] * bu[2],
        p[0] * bv[0] + p[1] * bv[1] + p[2] * bv[2],
    ]
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
            return group
        }
        if (idx.length < 3) return group
        for (let i = 0; i < idx.length; i += 3) {
            result.push({ n, v: [allV[idx[i]], allV[idx[i + 1]], allV[idx[i + 2]]] })
        }
    }
    return result.length > 0 ? result : group
}

// @ts-expect-error - housing/plate 모두 raw STL 사용. 형상 단순화 시 재사용 가능하여 보존.
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
// 실행
// =====================================================================

const serializeRaw = (geom: unknown): Buffer => {
    const data = stlSerializer.serialize({ binary: true }, geom) as ArrayBuffer[]
    return Buffer.concat(data.map((c) => Buffer.from(c)))
}

mkdirSync(OUT_DIR, { recursive: true })

// 이전 export 잔여 파일 정리 (renaming 에 따른 stale)
const STALE = [
    '49-pcba-housing-top.stl',
    '49-pcba-housing-bottom.stl',
    'keyboard-plate-extended.stl',
    'keyboard-fab.zip',
]
for (const f of STALE) {
    const p = join(OUT_DIR, f)
    if (existsSync(p)) rmSync(p)
}

// --- 1. Render STL ---
console.log('=== 1. Render STL ===')

writeFileSync(join(OUT_DIR, 'top-case.stl'), serializeRaw(buildHousingTopGeom()))
writeFileSync(join(OUT_DIR, 'bottom-case.stl'), serializeRaw(buildHousingBottomGeom()))
{
    const source = await Bun.file(join(PCBA_DIR, `${PLATE_JSCAD}.jscad`)).text()
    writeFileSync(join(OUT_DIR, 'plate.stl'), serializeRaw(evaluateJscadSource(source)))
}
for (const name of ['plate.stl', 'top-case.stl', 'bottom-case.stl']) {
    const buf = readFileSync(join(OUT_DIR, name))
    console.log(`  ${name.padEnd(20)} ${(buf.length / 1024).toFixed(1).padStart(7)} KB  tri ${buf.readUInt32LE(80)}`)
}

// --- 2. KiCad PCB STL (viewer 끼우기용) ---
console.log('\n=== 2. KiCad PCB STL ===')
{
    const pcbStl = join(OUT_DIR, 'pcb.stl')
    await $`${KICAD_CLI} pcb export stl --include-tracks --include-pads --include-soldermask --include-silkscreen --force -o ${pcbStl} ${KICAD_PCB}`.quiet()
    const size = ((await Bun.file(pcbStl).size) / 1024 / 1024).toFixed(1)
    console.log(`  pcb.stl (${size} MB)`)
}

// --- 3. Gerber + drill + pnp + zip ---
console.log('\n=== 3. Fabrication outputs (PCB) ===')

if (existsSync(FAB_DIR)) rmSync(FAB_DIR, { recursive: true })
mkdirSync(FAB_DIR, { recursive: true })

const LAYERS = [
    'F.Cu', 'B.Cu',
    'F.Silkscreen', 'B.Silkscreen',
    'F.Mask', 'B.Mask',
    'F.Paste', 'B.Paste',
    'Edge.Cuts',
].join(',')

await $`${KICAD_CLI} pcb export gerbers --output ${FAB_DIR}/ --layers ${LAYERS} --no-x2 --subtract-soldermask ${KICAD_PCB}`.quiet()
await $`${KICAD_CLI} pcb export drill --output ${FAB_DIR}/ --format excellon --excellon-separate-th --excellon-units mm ${KICAD_PCB}`.quiet()
await $`${KICAD_CLI} pcb export pos --output ${FAB_DIR}/keyboard-pnp-top.csv --format csv --units mm --side front ${KICAD_PCB}`.quiet()
await $`${KICAD_CLI} pcb export pos --output ${FAB_DIR}/keyboard-pnp-bottom.csv --format csv --units mm --side back ${KICAD_PCB}`.quiet()

for (const f of readdirSync(FAB_DIR).sort()) {
    console.log(`  ${f}`)
}

if (existsSync(ZIP_PATH)) rmSync(ZIP_PATH)
await $`cd ${FAB_DIR} && zip -r ${ZIP_PATH} .`.quiet()
console.log(`  fab.zip (${((await Bun.file(ZIP_PATH).size) / 1024).toFixed(1)} KB)`)

// --- 4. JLCPCB PCBA (다이오드 only) ---
console.log('\n=== 4. JLCPCB PCBA (diodes only) ===')

if (existsSync(JLC_DIR)) rmSync(JLC_DIR, { recursive: true })
mkdirSync(JLC_DIR, { recursive: true })

type PnpRow = { ref: string; val: string; pkg: string; x: number; y: number; rot: number; side: string }
const parsePnp = (path: string): PnpRow[] => {
    const lines = readFileSync(path, 'utf8').trim().split('\n')
    const rows: PnpRow[] = []
    for (let i = 1; i < lines.length; i++) {
        // Ref,Val,Package,PosX,PosY,Rot,Side  (Ref/Val/Package quoted)
        const m = lines[i].match(/^"([^"]+)","([^"]+)","([^"]+)",([\d.\-]+),([\d.\-]+),([\d.\-]+),(\w+)/)
        if (!m) continue
        rows.push({
            ref: m[1], val: m[2], pkg: m[3],
            x: parseFloat(m[4]), y: parseFloat(m[5]),
            rot: parseFloat(m[6]), side: m[7],
        })
    }
    return rows
}

const pnpAll = [
    ...parsePnp(join(FAB_DIR, 'keyboard-pnp-top.csv')),
    ...parsePnp(join(FAB_DIR, 'keyboard-pnp-bottom.csv')),
]
const diodes = pnpAll.filter((r) => /^D\d+$/.test(r.ref))

// CPL (JLCPCB Component Position List)
const cplLines = ['Designator,Mid X,Mid Y,Layer,Rotation']
for (const d of diodes) {
    const layer = d.side === 'top' ? 'Top' : 'Bottom'
    cplLines.push(`${d.ref},${d.x.toFixed(4)}mm,${d.y.toFixed(4)}mm,${layer},${d.rot}`)
}
writeFileSync(join(JLC_DIR, 'cpl.csv'), cplLines.join('\n') + '\n')

// BOM (JLCPCB)
const designators = diodes.map((d) => d.ref).sort((a, b) => {
    const na = parseInt(a.replace(/\D/g, '')) || 0
    const nb = parseInt(b.replace(/\D/g, '')) || 0
    return na - nb
}).join(',')
const bomLines = [
    'Comment,Designator,Footprint,LCSC Part #',
    `${DIODE_VALUE},"${designators}",${DIODE_FOOTPRINT},${DIODE_LCSC}`,
]
writeFileSync(join(JLC_DIR, 'bom.csv'), bomLines.join('\n') + '\n')

console.log(`  cpl.csv  (${diodes.length} diodes)`)
console.log(`  bom.csv  (1 LCSC part: ${DIODE_LCSC} ${DIODE_VALUE})`)

console.log('\n=== Done ===')
console.log(`  STL:    ${OUT_DIR}/{plate,top-case,bottom-case,pcb}.stl`)
console.log(`  PCB:    ${ZIP_PATH}`)
console.log(`  PCBA:   ${JLC_DIR}/{bom,cpl}.csv`)
