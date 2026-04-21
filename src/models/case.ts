import { primitives, transforms, booleans, extrusions, modifiers, measurements } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { computeBounds, screwPositions, type Bounds, type KeyPos } from './layout'
import type { BuildParams } from './build-params'

const { cuboid, cylinder, polygon, roundedRectangle } = primitives
const { translate, rotateX, rotateY } = transforms
const { union, subtract, intersect } = booleans
const { extrudeLinear } = extrusions
const { retessellate } = modifiers
const { measureBoundingBox } = measurements

export const plateBoundsFromGeom = (geom: Geom3): Bounds => {
    const [mn, mx] = measureBoundingBox(geom)
    return { minX: mn[0], maxX: mx[0], minY: mn[1], maxY: mx[1] }
}

export type CaseParams = {
    caseMarginFront: number
    caseMarginBack: number
    caseMarginLeft: number
    caseMarginRight: number
    plateTiltDeg: number
    plateFrontBottomZ: number

    plateRecessWall: number
    wallThickness: number
    upperWallInsetX: number
    upperWallInsetY: number
    bottomThickness: number

    sideFastenerSize: number
    sideFastenerHeight: number
    sideFastenerInsertRadius: number
    sideFastenerInsertDepth: number
    sideFastenerThroughRadius: number
    sideFastenerHeadRadius: number
    sideFastenerHeadDepth: number
    sideFastenerYRatios: [number, number]

    plateMountPostRadius: number
    plateMountInsertRadius: number
    plateMountInsertDepth: number
    plateMountHeadRadius: number
    plateMountHeadHeight: number

    usbCutoutWidth: number
    usbCutoutHeight: number
    usbCutoutCenterX: number
    usbCutoutCenterZ: number
    usbCutoutCornerRadius: number
    usbCutoutTaperExpand: number

    caseCornerRadius: number
}

export const DEFAULT_CASE_PARAMS: CaseParams = {
    caseMarginFront: 2,
    caseMarginBack: 2,
    caseMarginLeft: 2,
    caseMarginRight: 2,
    plateTiltDeg: 8,
    plateFrontBottomZ: 10,

    plateRecessWall: 7.5,
    wallThickness: 2,
    upperWallInsetX: 2,
    upperWallInsetY: 2,
    bottomThickness: 2.4,

    sideFastenerSize: 6,
    sideFastenerHeight: 6.0,
    sideFastenerInsertRadius: 1.25,
    sideFastenerInsertDepth: 4.0,
    sideFastenerThroughRadius: 1.7,
    sideFastenerHeadRadius: 2.6,
    sideFastenerHeadDepth: 2.0,
    sideFastenerYRatios: [0.5, 0.75],

    plateMountPostRadius: 2.5,
    plateMountInsertRadius: 1.25,
    plateMountInsertDepth: 4.0,
    plateMountHeadRadius: 2.6,
    plateMountHeadHeight: 2.5,

    usbCutoutWidth: 12.2,
    usbCutoutHeight: 5.5,
    usbCutoutCenterX: 9.7,
    usbCutoutCenterZ: 7.0,
    usbCutoutCornerRadius: 1.5,
    usbCutoutTaperExpand: 0.5,

    caseCornerRadius: 2,
}

export const SLA_CASE_PARAMS: CaseParams = {
    ...DEFAULT_CASE_PARAMS,
    plateMountPostRadius: 3.0,
    plateMountInsertRadius: 1.8,
    plateMountInsertDepth: 7.0,
    sideFastenerInsertRadius: 1.8,
    sideFastenerInsertDepth: 7.0,
    sideFastenerHeight: 8.0,
}

const reorient = (geom: Geom3): Geom3 => rotateX(Math.PI / 2, rotateY(Math.PI / 2, geom))

export const caseBounds = (plateBounds: Bounds, caseP: CaseParams): Bounds => ({
    minX: plateBounds.minX - caseP.caseMarginLeft,
    maxX: plateBounds.maxX + caseP.caseMarginRight,
    minY: plateBounds.minY - caseP.caseMarginFront,
    maxY: plateBounds.maxY + caseP.caseMarginBack,
})

const tiltTan = (caseP: CaseParams): number => Math.tan((caseP.plateTiltDeg * Math.PI) / 180)

const plateBottomAtY = (y: number, plateBounds: Bounds, caseP: CaseParams): number => {
    const yFromPivot = y - plateBounds.minY
    return caseP.plateFrontBottomZ + yFromPivot * tiltTan(caseP)
}

const caseHeightAtY = (y: number, plateBounds: Bounds, caseP: CaseParams, plateThickness: number): number => {
    const plateBottom = plateBottomAtY(y, plateBounds, caseP)
    const plateTop = plateBottom + plateThickness
    return plateTop + caseP.plateRecessWall
}

export const caseFrontTopZ = (
    plateBounds: Bounds,
    caseP: CaseParams = DEFAULT_CASE_PARAMS,
    plateThickness = 1.5,
): number =>
    caseHeightAtY(caseBounds(plateBounds, caseP).minY, plateBounds, caseP, plateThickness)

const outerShell = (plateBounds: Bounds, caseP: CaseParams, plateThickness: number): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const hFront = caseHeightAtY(cb.minY, plateBounds, caseP, plateThickness)
    const hBack = caseHeightAtY(cb.maxY, plateBounds, caseP, plateThickness)

    const poly = polygon({
        points: [
            [cb.maxY, 0],
            [cb.maxY, hBack],
            [cb.minY, hFront],
            [cb.minY, 0],
        ],
    })
    const extrudeWidth = cb.maxX - cb.minX
    const extruded = extrudeLinear({ height: extrudeWidth }, poly)
    const shell = translate([cb.minX, 0, 0], reorient(extruded))

    if (caseP.caseCornerRadius <= 0) return shell

    const maxHeight = Math.max(hFront, hBack) + 10
    const rect2d = roundedRectangle({
        size: [cb.maxX - cb.minX, cb.maxY - cb.minY],
        roundRadius: caseP.caseCornerRadius,
        segments: 64,
    })
    const cornerClipper = translate(
        [(cb.minX + cb.maxX) / 2, (cb.minY + cb.maxY) / 2, -5],
        extrudeLinear({ height: maxHeight }, rect2d),
    )
    return intersect(shell, cornerClipper)
}

const innerCavityRect = (
    plateBounds: Bounds,
    caseP: CaseParams,
    extraInsetX: number,
    extraInsetY: number,
): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const wallTX = caseP.wallThickness + extraInsetX
    const wallTY = caseP.wallThickness + extraInsetY
    const innerMinX = cb.minX + wallTX
    const innerMaxX = cb.maxX - wallTX
    const innerMinY = cb.minY + wallTY
    const innerMaxY = cb.maxY - wallTY
    const innerW = innerMaxX - innerMinX
    const innerH = innerMaxY - innerMinY
    const cx = (innerMinX + innerMaxX) / 2
    const cy = (innerMinY + innerMaxY) / 2
    const maxWallT = Math.max(wallTX, wallTY)
    const innerRadius = Math.max(caseP.caseCornerRadius * 2 - maxWallT, 0.5)
    const maxHeight = 400
    const rect2d = roundedRectangle({
        size: [innerW, innerH],
        roundRadius: innerRadius,
        segments: 64,
    })
    return translate(
        [cx, cy, caseP.bottomThickness],
        extrudeLinear({ height: maxHeight }, rect2d),
    )
}

const tiltedSlabAtPlateLocalZ = (
    plateBounds: Bounds,
    caseP: CaseParams,
    zTopLocal: number,
): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const W = cb.maxX - cb.minX + 200
    const L = cb.maxY - cb.minY + 200
    const H = 400
    const cx = (cb.minX + cb.maxX) / 2
    const cy = (cb.minY + cb.maxY) / 2
    const slabLocal = translate(
        [cx, cy, zTopLocal - H / 2],
        cuboid({ size: [W, L, H] }),
    )
    return applyPlateTiltToLocal(slabLocal, plateBounds, caseP)
}

const steppedInnerCavity = (plateBounds: Bounds, caseP: CaseParams, plateThickness: number): Geom3 => {
    const lowerFull = innerCavityRect(plateBounds, caseP, 0, 0)
    const upperFull = innerCavityRect(plateBounds, caseP, caseP.upperWallInsetX, caseP.upperWallInsetY)
    const belowPlateTop = tiltedSlabAtPlateLocalZ(plateBounds, caseP, plateThickness)
    const lower = intersect(lowerFull, belowPlateTop)
    const upper = subtract(upperFull, belowPlateTop)
    return union(lower, upper)
}

const makeRoundedHoleAlongY = (width: number, height: number, depth: number, cornerRadius: number): Geom3 => {
    const r = Math.min(cornerRadius, width / 2 - 0.01, height / 2 - 0.01)
    const rect = roundedRectangle({ size: [width, height], roundRadius: r, segments: 32 })
    const extruded = extrudeLinear({ height: depth }, rect)
    return rotateX(Math.PI / 2, translate([0, 0, -depth / 2], extruded))
}

const usbCutout = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const wallT = caseP.wallThickness
    const depth = wallT + 2
    const centerY = cb.maxY - wallT / 2
    return translate(
        [caseP.usbCutoutCenterX, centerY, caseP.usbCutoutCenterZ],
        makeRoundedHoleAlongY(caseP.usbCutoutWidth, caseP.usbCutoutHeight, depth, caseP.usbCutoutCornerRadius),
    )
}

const sideFastenerCenters = (plateBounds: Bounds, caseP: CaseParams): Array<[number, number]> => {
    const cb = caseBounds(plateBounds, caseP)
    const wallT = caseP.wallThickness
    const s = caseP.sideFastenerSize
    const xLo = cb.minX + wallT + s / 2
    const xHi = cb.maxX - wallT - s / 2
    const yRange = cb.maxY - cb.minY
    const [r1, r2] = caseP.sideFastenerYRatios
    const y1 = cb.minY + yRange * r1
    const y2 = cb.minY + yRange * r2
    return [
        [xLo, y1],
        [xHi, y1],
        [xLo, y2],
        [xHi, y2],
    ]
}

const sideFastenerBosses = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const s = caseP.sideFastenerSize
    const h = caseP.sideFastenerHeight
    const zCenter = caseP.bottomThickness + h / 2
    const positions = sideFastenerCenters(plateBounds, caseP)
    const blocks = positions.map(([x, y]) =>
        translate([x, y, zCenter], cuboid({ size: [s, s, h] })),
    )
    return union(...blocks)
}

const sideFastenerInsertHoles = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const r = caseP.sideFastenerInsertRadius
    const depth = caseP.sideFastenerInsertDepth
    const zCenter = caseP.bottomThickness + depth / 2 - 0.01
    const positions = sideFastenerCenters(plateBounds, caseP)
    const holes = positions.map(([x, y]) =>
        translate([x, y, zCenter], cylinder({ radius: r, height: depth, segments: 32 })),
    )
    return union(...holes)
}

const sideFastenerThroughs = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const tr = caseP.sideFastenerThroughRadius
    const hr = caseP.sideFastenerHeadRadius
    const hd = caseP.sideFastenerHeadDepth
    const positions = sideFastenerCenters(plateBounds, caseP)
    const items: Geom3[] = []
    for (const [x, y] of positions) {
        items.push(
            translate(
                [x, y, caseP.bottomThickness / 2],
                cylinder({ radius: tr, height: caseP.bottomThickness + 0.02, segments: 32 }),
            ),
        )
        items.push(
            translate(
                [x, y, hd / 2 - 0.005],
                cylinder({ radius: hr, height: hd, segments: 32 }),
            ),
        )
    }
    return union(...items)
}

export const plateMountPositions = (
    plateBounds: Bounds,
    screwHoleMargin: number,
): Array<[number, number]> => screwPositions(plateBounds, screwHoleMargin)

const applyPlateTiltToLocal = (geom: Geom3, plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const { pivotY, tiltAngle, liftZ } = getPlateTransform(plateBounds, caseP)
    let t = translate([0, -pivotY, 0], geom)
    t = rotateX(tiltAngle, t)
    t = translate([0, pivotY, liftZ], t)
    return t
}

const plateMountPillars = (
    plateBounds: Bounds,
    caseP: CaseParams,
    screwHoleMargin: number,
): Geom3 => {
    const r = caseP.plateMountPostRadius
    const positions = plateMountPositions(plateBounds, screwHoleMargin)
    const pivotY = plateBounds.minY
    const theta = (caseP.plateTiltDeg * Math.PI) / 180
    const liftZ = caseP.plateFrontBottomZ

    const pillars = positions.map(([xLocal, yLocal]) => {
        const yShifted = yLocal - pivotY
        const yCase = pivotY + yShifted * Math.cos(theta)
        const zCaseTop = liftZ + yShifted * Math.sin(theta)
        const height = zCaseTop + 2
        return translate(
            [xLocal, yCase, height / 2],
            cylinder({ radius: r, height, segments: 48 }),
        )
    })

    const fullPillars = union(...pillars)
    const belowPlateBottom = tiltedSlabAtPlateLocalZ(plateBounds, caseP, 0)
    return intersect(fullPillars, belowPlateBottom)
}

const plateMountInsertPockets = (
    plateBounds: Bounds,
    caseP: CaseParams,
    screwHoleMargin: number,
): Geom3 => {
    const r = caseP.plateMountInsertRadius
    const depth = caseP.plateMountInsertDepth
    const positions = plateMountPositions(plateBounds, screwHoleMargin)
    const pocketsLocal = positions.map(([xLocal, yLocal]) =>
        translate(
            [xLocal, yLocal, -depth / 2 + 0.01],
            cylinder({ radius: r, height: depth, segments: 32 }),
        ),
    )
    return applyPlateTiltToLocal(union(...pocketsLocal), plateBounds, caseP)
}

const plateMountHeadClearance = (
    plateBounds: Bounds,
    caseP: CaseParams,
    screwHoleMargin: number,
    plateThickness: number,
): Geom3 => {
    const r = caseP.plateMountHeadRadius
    const h = caseP.plateMountHeadHeight + 0.5
    const positions = plateMountPositions(plateBounds, screwHoleMargin)
    const cylindersLocal = positions.map(([xLocal, yLocal]) =>
        translate(
            [xLocal, yLocal, plateThickness + h / 2 - 0.01],
            cylinder({ radius: r, height: h, segments: 32 }),
        ),
    )
    return applyPlateTiltToLocal(union(...cylindersLocal), plateBounds, caseP)
}

const sliceCuboid = (plateBounds: Bounds, zMin: number, zMax: number, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const cx = (cb.minX + cb.maxX) / 2
    const cy = (cb.minY + cb.maxY) / 2
    const W = cb.maxX - cb.minX + 40
    const L = cb.maxY - cb.minY + 40
    const H = zMax - zMin
    return translate([cx, cy, (zMin + zMax) / 2], cuboid({ size: [W, L, H] }))
}

export const buildCaseTop = (
    keys: KeyPos[],
    params: BuildParams,
    caseP: CaseParams = DEFAULT_CASE_PARAMS,
    plateBoundsOverride?: Bounds,
): Geom3 => {
    const plateBounds = plateBoundsOverride ?? computeBounds(keys, params.plate.padding)
    const plateThickness = params.plate.thickness
    const screwHoleMargin = params.plate.screwHoleMargin

    let shell = outerShell(plateBounds, caseP, plateThickness)
    const topSlicer = sliceCuboid(plateBounds, caseP.bottomThickness, 500, caseP)
    shell = intersect(shell, topSlicer)

    const cavity = steppedInnerCavity(plateBounds, caseP, plateThickness)
    shell = subtract(shell, cavity)

    shell = union(shell, sideFastenerBosses(plateBounds, caseP))
    shell = subtract(
        shell,
        usbCutout(plateBounds, caseP),
        sideFastenerInsertHoles(plateBounds, caseP),
        plateMountHeadClearance(plateBounds, caseP, screwHoleMargin, plateThickness),
    )

    return retessellate(shell)
}

const floorSlab = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const W = cb.maxX - cb.minX
    const L = cb.maxY - cb.minY
    const cx = (cb.minX + cb.maxX) / 2
    const cy = (cb.minY + cb.maxY) / 2
    const rect2d = roundedRectangle({
        size: [W, L],
        roundRadius: caseP.caseCornerRadius,
        segments: 64,
    })
    return translate(
        [cx, cy, caseP.bottomThickness / 2],
        extrudeLinear({ height: caseP.bottomThickness }, rect2d),
    )
}

export const buildCaseBottom = (
    keys: KeyPos[],
    params: BuildParams,
    caseP: CaseParams = DEFAULT_CASE_PARAMS,
    plateBoundsOverride?: Bounds,
): Geom3 => {
    const plateBounds = plateBoundsOverride ?? computeBounds(keys, params.plate.padding)
    const screwHoleMargin = params.plate.screwHoleMargin
    void params.plate.thickness

    const floor = floorSlab(plateBounds, caseP)
    const pillars = plateMountPillars(plateBounds, caseP, screwHoleMargin)

    let bottom = union(floor, pillars)
    bottom = subtract(
        bottom,
        plateMountInsertPockets(plateBounds, caseP, screwHoleMargin),
        sideFastenerThroughs(plateBounds, caseP),
    )

    return retessellate(bottom)
}

export const getPlateTransform = (plateBounds: Bounds, caseP: CaseParams = DEFAULT_CASE_PARAMS) => ({
    pivotY: plateBounds.minY,
    tiltAngle: (caseP.plateTiltDeg * Math.PI) / 180,
    liftZ: caseP.plateFrontBottomZ,
})
