import { primitives, transforms, booleans, extrusions } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { deserialize } from '@jscad/stl-deserializer'
import { computeBounds, screwPositions, stabbedKeys, type Bounds, type KeyPos, type Padding, type StabSpec } from './layout'

const { roundedRectangle, circle } = primitives
const { translate } = transforms
const { union, subtract } = booleans
const { extrudeLinear } = extrusions

const plateStlUrlMap = import.meta.glob('../../docs/models/plate/*.{stl,STL}', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>

const findPlateStlUrl = (): string | null => {
    const keys = Object.keys(plateStlUrlMap)
    return keys.length > 0 ? plateStlUrlMap[keys[0]] : null
}

let cachedPlateGeom: Geom3 | null = null
let plateLoadPromise: Promise<Geom3 | null> | null = null

export const loadPlateGeom = async (): Promise<Geom3 | null> => {
    if (cachedPlateGeom) return cachedPlateGeom
    if (!plateLoadPromise) {
        plateLoadPromise = (async () => {
            const url = findPlateStlUrl()
            if (!url) {
                console.warn('Plate STL not found under docs/models/plate/*.stl')
                return null
            }
            const response = await fetch(url)
            const buffer = await response.arrayBuffer()
            const result = deserialize(
                { output: 'geometry', addColors: false },
                new Uint8Array(buffer),
            )
            const geom = (Array.isArray(result) ? result[0] : result) as Geom3
            cachedPlateGeom = geom
            return geom
        })()
    }
    return plateLoadPromise
}

export type PlateParams = {
    thickness: number
    padding: Padding
    cornerRadius: number
    switchCutoutSize: number
    switchCutoutCornerRadius: number
    screwHoleRadius: number
    screwHoleMargin: number
    stabilizer: StabSpec
}

export const outlineRect = (bounds: Bounds, cornerRadius: number) => {
    const width = bounds.maxX - bounds.minX
    const height = bounds.maxY - bounds.minY
    const cx = (bounds.maxX + bounds.minX) / 2
    const cy = (bounds.maxY + bounds.minY) / 2
    return translate([cx, cy, 0], roundedRectangle({ size: [width, height], roundRadius: cornerRadius }))
}

export const buildPlate2d = (keys: KeyPos[], params: PlateParams) => {
    const bounds = computeBounds(keys, params.padding)
    const outline = outlineRect(bounds, params.cornerRadius)

    const switchCuts = keys.map((k) =>
        translate(
            [k.cx, k.cy, 0],
            roundedRectangle({
                size: [params.switchCutoutSize, params.switchCutoutSize],
                roundRadius: params.switchCutoutCornerRadius,
            }),
        ),
    )

    const stabPads = stabbedKeys(keys, params.stabilizer).flatMap((k) => {
        const spacing = params.stabilizer.spacingByWidth[k.w]
        const pad = roundedRectangle({
            size: params.stabilizer.padSize,
            roundRadius: params.stabilizer.padCornerRadius,
        })
        const y = k.cy + params.stabilizer.padOffsetY
        return [translate([k.cx - spacing, y, 0], pad), translate([k.cx + spacing, y, 0], pad)]
    })

    const screws = params.screwHoleRadius > 0
        ? screwPositions(bounds, params.screwHoleMargin).map((pos) =>
            translate([pos[0], pos[1], 0], circle({ radius: params.screwHoleRadius })),
        )
        : []

    const cutouts = union(...switchCuts, ...stabPads, ...screws)
    return subtract(outline, cutouts)
}

export const buildPlate = (keys: KeyPos[], params: PlateParams): Geom3 => {
    const plate2d = buildPlate2d(keys, params)
    return extrudeLinear({ height: params.thickness }, plate2d)
}
