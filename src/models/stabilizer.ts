import { deserialize } from '@jscad/stl-deserializer'
import { measurements, transforms, primitives, booleans } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { DEFAULT_STAB, type KeyPos } from './layout'

const { measureBoundingBox } = measurements
const { translate, rotateX, rotateY, rotateZ } = transforms
const { cuboid } = primitives
const { intersect } = booleans

export type StabilizerOrient = {
    rotationX: number
    rotationY: number
    rotationZ: number
    mountZOffset: number
    spacingAdjust: number
    yOffset: number
    clipBottomZ: number
}

export const DEFAULT_STABILIZER_ORIENT: StabilizerOrient = {
    rotationX: Math.PI / 2,
    rotationY: 0,
    rotationZ: 0,
    mountZOffset: -26.5,
    spacingAdjust: 0,
    yOffset: 0,
    clipBottomZ: -1000,
}

const stlUrlMap = import.meta.glob('../../docs/models/stabilizer/*.{stl,STL}', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>

const findStabStlUrl = (): string | null => {
    const keys = Object.keys(stlUrlMap)
    return keys.length > 0 ? stlUrlMap[keys[0]] : null
}

let cachedGeom: Geom3 | null = null
let loadPromise: Promise<Geom3 | null> | null = null

export const loadStabilizerGeom = async (): Promise<Geom3 | null> => {
    if (cachedGeom) return cachedGeom
    if (!loadPromise) {
        loadPromise = (async () => {
            const url = findStabStlUrl()
            if (!url) {
                console.warn('Stabilizer STL not found under docs/models/stabilizer/*.stl')
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

export const normalizeStabilizer = (geom: Geom3, orient: StabilizerOrient = DEFAULT_STABILIZER_ORIENT): Geom3 => {
    let g = geom
    if (orient.rotationX) g = rotateX(orient.rotationX, g)
    if (orient.rotationY) g = rotateY(orient.rotationY, g)
    if (orient.rotationZ) g = rotateZ(orient.rotationZ, g)
    const [mn, mx] = measureBoundingBox(g)
    const cx = (mn[0] + mx[0]) / 2
    const cy = (mn[1] + mx[1]) / 2
    const cz = mn[2]
    g = translate([-cx, -cy, 1.5 + orient.mountZOffset - cz], g)

    if (orient.clipBottomZ > -999) {
        const [mn2, mx2] = measureBoundingBox(g)
        const clipW = (mx2[0] - mn2[0]) + 20
        const clipL = (mx2[1] - mn2[1]) + 20
        const clipH = (mx2[2] - orient.clipBottomZ) + 20
        const clipCenterX = (mn2[0] + mx2[0]) / 2
        const clipCenterY = (mn2[1] + mx2[1]) / 2
        const clipCenterZ = orient.clipBottomZ + clipH / 2
        const clipper = translate(
            [clipCenterX, clipCenterY, clipCenterZ],
            cuboid({ size: [clipW, clipL, clipH] }),
        )
        g = intersect(g, clipper)
    }
    return g
}

export const placeStabilizers = (
    normalized: Geom3,
    keys: KeyPos[],
    orient: StabilizerOrient = DEFAULT_STABILIZER_ORIENT,
): Geom3[] => {
    const result: Geom3[] = []
    for (const k of keys) {
        const spacing = DEFAULT_STAB.spacingByWidth[k.w]
        if (spacing === undefined) continue
        const effectiveSpacing = spacing + orient.spacingAdjust
        const y = k.cy + DEFAULT_STAB.padOffsetY + orient.yOffset
        result.push(translate([k.cx - effectiveSpacing, y, 0], normalized))
        result.push(translate([k.cx + effectiveSpacing, y, 0], normalized))
    }
    return result
}
