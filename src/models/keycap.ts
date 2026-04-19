import { deserialize } from '@jscad/stl-deserializer'
import { measurements, transforms } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { U, type KeyPos } from './layout'

const { measureBoundingBox } = measurements
const { translate, rotateX, rotateY, rotateZ } = transforms

export type KeycapOrient = {
    rotationX: number
    rotationY: number
    rotationZ: number
    mountZOffset: number
}

export const DEFAULT_KEYCAP_ORIENT: KeycapOrient = {
    rotationX: Math.PI / 2,
    rotationY: 0,
    rotationZ: 0,
    mountZOffset: 6.0,
}

const stlUrlMap = import.meta.glob('../../docs/models/keycap/STL/*.stl', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>

const ROW_TO_PROFILE: Record<number, number> = { 0: 1, 1: 2, 2: 3, 3: 4 }

const rowOfKey = (k: KeyPos): number => {
    const idx = Math.round(-k.cy / U)
    return Math.max(0, Math.min(3, idx))
}

const keyFileName = (widthU: number, row: number): string => {
    const profile = ROW_TO_PROFILE[row] ?? row + 1
    return `1x${widthU} R${profile}.stl`
}

const findStlUrl = (fileName: string): string | null => {
    for (const path in stlUrlMap) {
        if (path.endsWith('/' + fileName)) return stlUrlMap[path]
    }
    return null
}

const rawCache = new Map<string, Geom3>()

const loadStlGeom = async (url: string): Promise<Geom3> => {
    const response = await fetch(url)
    const buffer = await response.arrayBuffer()
    const result = deserialize({ output: 'geometry', addColors: false }, new Uint8Array(buffer))
    return (Array.isArray(result) ? result[0] : result) as Geom3
}

export const loadKeycapGeoms = async (keys: KeyPos[]): Promise<void> => {
    const needed = new Set<string>()
    for (const k of keys) needed.add(keyFileName(k.w, rowOfKey(k)))
    await Promise.all(
        Array.from(needed).map(async (fname) => {
            if (rawCache.has(fname)) return
            const url = findStlUrl(fname)
            if (!url) {
                console.warn('Missing keycap STL:', fname)
                return
            }
            const geom = await loadStlGeom(url)
            rawCache.set(fname, geom)
        }),
    )
}

const orientGeom = (geom: Geom3, orient: KeycapOrient): Geom3 => {
    let g = geom
    if (orient.rotationX) g = rotateX(orient.rotationX, g)
    if (orient.rotationY) g = rotateY(orient.rotationY, g)
    if (orient.rotationZ) g = rotateZ(orient.rotationZ, g)
    const [mn, mx] = measureBoundingBox(g)
    const cx = (mn[0] + mx[0]) / 2
    const cy = (mn[1] + mx[1]) / 2
    const cz = mn[2]
    return translate([-cx, -cy, 1.5 + orient.mountZOffset - cz], g)
}

export const buildKeycapsForKeys = (
    keys: KeyPos[],
    orient: KeycapOrient = DEFAULT_KEYCAP_ORIENT,
): Geom3[] => {
    const out: Geom3[] = []
    for (const k of keys) {
        const fname = keyFileName(k.w, rowOfKey(k))
        const raw = rawCache.get(fname)
        if (!raw) continue
        const normalized = orientGeom(raw, orient)
        out.push(translate([k.cx, k.cy, 0], normalized))
    }
    return out
}
