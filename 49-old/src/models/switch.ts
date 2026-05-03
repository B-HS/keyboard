import { deserialize } from '@jscad/stl-deserializer'
import { measurements, transforms } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import type { KeyPos } from './layout'

const { measureBoundingBox } = measurements
const { translate, rotateX, rotateY, rotateZ } = transforms

export type SwitchOrient = {
    rotationX: number
    rotationY: number
    rotationZ: number
    mountZOffset: number
}

export const DEFAULT_SWITCH_ORIENT: SwitchOrient = {
    rotationX: Math.PI / 2,
    rotationY: 0,
    rotationZ: 0,
    mountZOffset: -7.7,
}

const stlUrlMap = import.meta.glob('../../docs/models/switch/*.{stl,STL}', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>

const findSwitchStlUrl = (): string | null => {
    const preferred = Object.keys(stlUrlMap).find((p) => /cherry[^/]*mx[^/]*\.stl$/i.test(p))
    if (preferred) return stlUrlMap[preferred]
    const any = Object.keys(stlUrlMap)[0]
    return any ? stlUrlMap[any] : null
}

let cachedGeom: Geom3 | null = null
let loadPromise: Promise<Geom3 | null> | null = null

export const loadSwitchGeom = async (): Promise<Geom3 | null> => {
    if (cachedGeom) return cachedGeom
    if (!loadPromise) {
        loadPromise = (async () => {
            const url = findSwitchStlUrl()
            if (!url) {
                console.warn('Switch STL not found under docs/models/switch/*.stl')
                return null
            }
            const response = await fetch(url)
            const buffer = await response.arrayBuffer()
            const result = deserialize({ output: 'geometry', addColors: false }, new Uint8Array(buffer))
            const geom = (Array.isArray(result) ? result[0] : result) as Geom3
            cachedGeom = geom
            return geom
        })()
    }
    return loadPromise
}

export const normalizeSwitch = (geom: Geom3, orient: SwitchOrient = DEFAULT_SWITCH_ORIENT): Geom3 => {
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

export const placeSwitches = (normalized: Geom3, keys: KeyPos[]): Geom3[] =>
    keys.map((k) => translate([k.cx, k.cy, 0], normalized))
