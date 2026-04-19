import { deserialize } from '@jscad/stl-deserializer'
import { measurements, transforms } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import stlUrl from './assets/cherry-mx-keycap.stl?url'
import type { KeyPos } from './layout'

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
    rotationZ: (3 * Math.PI) / 2,
    mountZOffset: 6.0,
}

let cachedGeom: Geom3 | null = null
let loadPromise: Promise<Geom3> | null = null

export const loadKeycapGeom = async (): Promise<Geom3> => {
    if (cachedGeom) return cachedGeom
    if (!loadPromise) {
        loadPromise = (async () => {
            const response = await fetch(stlUrl)
            const buffer = await response.arrayBuffer()
            const result = deserialize({ output: 'geometry', addColors: false }, new Uint8Array(buffer))
            const geom = (Array.isArray(result) ? result[0] : result) as Geom3
            cachedGeom = geom
            return geom
        })()
    }
    return loadPromise
}

export const normalizeKeycap = (geom: Geom3, orient: KeycapOrient = DEFAULT_KEYCAP_ORIENT): Geom3 => {
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

export const placeKeycaps = (normalized: Geom3, keys: KeyPos[]): Geom3[] =>
    keys.map((k) => translate([k.cx, k.cy, 0], normalized))
