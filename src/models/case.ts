import { primitives, transforms, booleans, extrusions } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { computeBounds, screwPositions, type Bounds, type KeyPos } from './layout'
import type { BuildParams } from './build-params'

const { cuboid, cylinder, polygon, roundedRectangle } = primitives
const { translate, rotateX, rotateY } = transforms
const { union, subtract, intersect } = booleans
const { extrudeLinear } = extrusions

export type CaseParams = {
    caseMarginFront: number
    caseMarginBack: number
    caseMarginLeft: number
    caseMarginRight: number
    plateTiltDeg: number
    plateFrontBottomZ: number

    plateRecessWall: number
    wallThickness: number
    bottomThickness: number
    rimInnerInset: number

    screwPostOuterDiameter: number
    screwPostInsertHoleDiameter: number
    screwPostInsertDepth: number

    usbCutoutWidth: number
    usbCutoutHeight: number
    usbCutoutCenterX: number
    usbCutoutCenterZ: number
    usbCutoutCornerRadius: number
    usbCutoutTaperExpand: number

    batteryDiameter: number
    batteryLength: number
    batterySlotTolerance: number
    batteryGapLength: number
    batteryTrayYCenter: number
    batteryTrayYWidth: number
    batteryTrayXStart: number
    batteryEndWallThickness: number
    batteryTrayUpperWall: number
    batteryTrayFloorFlangeThickness: number

    caseCornerRadius: number

    slideSwitchX: number
    slideSwitchY: number
    slideSwitchCutoutWidth: number
    slideSwitchCutoutLength: number
}

export const DEFAULT_CASE_PARAMS: CaseParams = {
    caseMarginFront: 4,
    caseMarginBack: 3,
    caseMarginLeft: 4,
    caseMarginRight: 4,
    plateTiltDeg: 8,
    plateFrontBottomZ: 10.5,

    plateRecessWall: 6.5,
    wallThickness: 3,
    bottomThickness: 2.4,
    rimInnerInset: 1.5,

    screwPostOuterDiameter: 6,
    screwPostInsertHoleDiameter: 1.5,
    screwPostInsertDepth: 1.0,

    usbCutoutWidth: 12.2,
    usbCutoutHeight: 6.5,
    usbCutoutCenterX: 9.7,
    usbCutoutCenterZ: 6.25,
    usbCutoutCornerRadius: 1.5,
    usbCutoutTaperExpand: 1.0,

    batteryDiameter: 10.5,
    batteryLength: 44.5,
    batterySlotTolerance: 0.2,
    batteryGapLength: 7,
    batteryTrayYCenter: 6,
    batteryTrayYWidth: 12,
    batteryTrayXStart: 73,
    batteryEndWallThickness: 2,
    batteryTrayUpperWall: 1.2,
    batteryTrayFloorFlangeThickness: 1.2,

    caseCornerRadius: 2,

    slideSwitchX: 47,
    slideSwitchY: 6,
    slideSwitchCutoutWidth: 8,
    slideSwitchCutoutLength: 6,
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

const caseHeightAtY = (y: number, plateBounds: Bounds, caseP: CaseParams): number => {
    const plateBottom = plateBottomAtY(y, plateBounds, caseP)
    const plateTop = plateBottom + 1.5
    return plateTop + caseP.plateRecessWall
}

const outerShell = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const hFront = caseHeightAtY(cb.minY, plateBounds, caseP)
    const hBack = caseHeightAtY(cb.maxY, plateBounds, caseP)

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

const upperRimLip = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const wallT = caseP.wallThickness
    const inset = caseP.rimInnerInset
    const extraDown = 0.2
    const extraUp = 0.2

    const plateTopFront = plateBottomAtY(cb.minY, plateBounds, caseP) + 1.5
    const plateTopBack = plateBottomAtY(cb.maxY, plateBounds, caseP) + 1.5
    const rimTopFront = caseHeightAtY(cb.minY, plateBounds, caseP)
    const rimTopBack = caseHeightAtY(cb.maxY, plateBounds, caseP)

    const yMinOuter = cb.minY + wallT
    const yMaxOuter = cb.maxY - wallT
    const xMinOuter = cb.minX + wallT
    const xMaxOuter = cb.maxX - wallT
    const outerPoly = polygon({
        points: [
            [yMaxOuter, plateTopBack - extraDown],
            [yMaxOuter, rimTopBack + extraUp],
            [yMinOuter, rimTopFront + extraUp],
            [yMinOuter, plateTopFront - extraDown],
        ],
    })
    const outerExtruded = extrudeLinear({ height: xMaxOuter - xMinOuter }, outerPoly)
    const outer = translate([xMinOuter, 0, 0], reorient(outerExtruded))

    const yMinInner = yMinOuter + inset
    const yMaxInner = yMaxOuter - inset
    const xMinInner = xMinOuter + inset
    const xMaxInner = xMaxOuter - inset
    const innerPoly = polygon({
        points: [
            [yMaxInner, plateTopBack - (extraDown + 1)],
            [yMaxInner, rimTopBack + (extraUp + 2)],
            [yMinInner, rimTopFront + (extraUp + 2)],
            [yMinInner, plateTopFront - (extraDown + 1)],
        ],
    })
    const innerExtruded = extrudeLinear({ height: xMaxInner - xMinInner }, innerPoly)
    const inner = translate([xMinInner, 0, 0], reorient(innerExtruded))

    return subtract(outer, inner)
}

const innerCavity = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)
    const wallT = caseP.wallThickness
    const hFront = caseHeightAtY(cb.minY, plateBounds, caseP) + 1
    const hBack = caseHeightAtY(cb.maxY, plateBounds, caseP) + 1

    const poly = polygon({
        points: [
            [cb.maxY - wallT, caseP.bottomThickness],
            [cb.maxY - wallT, hBack],
            [cb.minY + wallT, hFront],
            [cb.minY + wallT, caseP.bottomThickness],
        ],
    })
    const extrudeWidth = cb.maxX - cb.minX - wallT * 2
    const extruded = extrudeLinear({ height: extrudeWidth }, poly)
    const cavity = translate([cb.minX + wallT, 0, 0], reorient(extruded))

    if (caseP.caseCornerRadius <= 0) return cavity

    const innerRadius = Math.max(caseP.caseCornerRadius*2 - wallT, 0.5)
    const innerW = cb.maxX - cb.minX - wallT * 2
    const innerL = cb.maxY - cb.minY - wallT * 2
    const maxHeight = Math.max(hFront, hBack) + 10
    const rect2d = roundedRectangle({
        size: [innerW, innerL],
        roundRadius: innerRadius,
        segments: 64,
    })
    const cornerClipper = translate(
        [(cb.minX + cb.maxX) / 2, (cb.minY + cb.maxY) / 2, -5],
        extrudeLinear({ height: maxHeight }, rect2d),
    )
    return intersect(cavity, cornerClipper)
}

const screwPosts = (plateBounds: Bounds, params: BuildParams, caseP: CaseParams): Geom3 => {
    const margin = params.plate.screwHoleMargin
    const positions = screwPositions(plateBounds, margin)
    const overshoot = 2
    const posts = positions.map(([x, y]) => {
        const topZ = plateBottomAtY(y, plateBounds, caseP) + overshoot
        const height = topZ - caseP.bottomThickness
        return translate(
            [x, y, caseP.bottomThickness + height / 2],
            cylinder({ radius: caseP.screwPostOuterDiameter / 2, height }),
        )
    })
    const unionPosts = union(...posts)

    const cb = caseBounds(plateBounds, caseP)
    const bigW = cb.maxX - cb.minX + 20
    const bigL = cb.maxY - cb.minY + 20
    const bigH = 100
    let cube = translate(
        [(cb.minX + cb.maxX) / 2, (cb.minY + cb.maxY) / 2, bigH / 2],
        cuboid({ size: [bigW, bigL, bigH] }),
    )
    const tiltAngle = (caseP.plateTiltDeg * Math.PI) / 180
    const pivotY = plateBounds.minY
    cube = translate([0, -pivotY, 0], cube)
    cube = rotateX(tiltAngle, cube)
    cube = translate([0, pivotY, caseP.plateFrontBottomZ], cube)

    return subtract(unionPosts, cube)
}

const screwInsertHoles = (plateBounds: Bounds, params: BuildParams, caseP: CaseParams): Geom3 => {
    const margin = params.plate.screwHoleMargin
    const positions = screwPositions(plateBounds, margin)
    const tiltRad = (caseP.plateTiltDeg * Math.PI) / 180
    const postRadius = caseP.screwPostOuterDiameter / 2
    const postEdgeRise = postRadius * Math.tan(tiltRad)
    const overshoot = postEdgeRise + 0.3
    const totalDepth = caseP.screwPostInsertDepth + overshoot

    const holes = positions.map(([x, y]) => {
        const topZ = plateBottomAtY(y, plateBounds, caseP) + overshoot
        return translate(
            [x, y, topZ - totalDepth / 2],
            cylinder({ radius: caseP.screwPostInsertHoleDiameter / 2, height: totalDepth }),
        )
    })
    return union(...holes)
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
    const innerY = cb.maxY - wallT
    const outerY = cb.maxY

    const innerDepth = wallT + 0.5
    const innerCut = translate(
        [caseP.usbCutoutCenterX, innerY - 0.01 + innerDepth / 2, caseP.usbCutoutCenterZ],
        makeRoundedHoleAlongY(caseP.usbCutoutWidth, caseP.usbCutoutHeight, innerDepth, caseP.usbCutoutCornerRadius),
    )

    const outerW = caseP.usbCutoutWidth + caseP.usbCutoutTaperExpand * 2
    const outerH = caseP.usbCutoutHeight + caseP.usbCutoutTaperExpand * 2
    const outerRadius = caseP.usbCutoutCornerRadius + caseP.usbCutoutTaperExpand
    const outerDepth = wallT * 0.6 + 0.02
    const outerCut = translate(
        [caseP.usbCutoutCenterX, outerY + 0.01 - outerDepth / 2, caseP.usbCutoutCenterZ],
        makeRoundedHoleAlongY(outerW, outerH, outerDepth, outerRadius),
    )

    return union(innerCut, outerCut)
}

const batteryTray = (caseP: CaseParams): Geom3 => {
    const slot = caseP.batteryLength
    const gap = caseP.batteryGapLength
    const batteryRadius = caseP.batteryDiameter / 2 + caseP.batterySlotTolerance
    const batteryZCenter = caseP.bottomThickness + batteryRadius
    const trayUpperWall = caseP.batteryTrayUpperWall
    const trayZBottom = batteryZCenter
    const trayZTop = batteryZCenter + batteryRadius + trayUpperWall
    const trayHeight = trayZTop - trayZBottom
    const trayZCenter = (trayZBottom + trayZTop) / 2

    const outerRadius = batteryRadius + trayUpperWall
    const cradleBlocks = [0, 1, 2].map((i) => {
        const cx = caseP.batteryTrayXStart + slot / 2 + i * (slot + gap)
        const block = translate(
            [cx, caseP.batteryTrayYCenter, trayZCenter],
            cuboid({ size: [slot, caseP.batteryTrayYWidth, trayHeight] }),
        )
        const rounder = translate(
            [cx, caseP.batteryTrayYCenter, batteryZCenter],
            rotateY(Math.PI / 2, cylinder({ radius: outerRadius, height: slot + 0.01 })),
        )
        return intersect(block, rounder)
    })

    const wallExtraHeight = caseP.batteryDiameter + trayUpperWall
    const wallZCenter = caseP.bottomThickness + wallExtraHeight / 2
    const makeEndWall = (xCenter: number): Geom3 => {
        const block = translate(
            [xCenter, caseP.batteryTrayYCenter, wallZCenter],
            cuboid({ size: [caseP.batteryEndWallThickness, caseP.batteryTrayYWidth, wallExtraHeight] }),
        )
        const rounder = translate(
            [xCenter, caseP.batteryTrayYCenter, batteryZCenter],
            rotateY(Math.PI / 2, cylinder({ radius: outerRadius, height: caseP.batteryEndWallThickness + 0.01 })),
        )
        return intersect(block, rounder)
    }
    const leftWall = makeEndWall(caseP.batteryTrayXStart - caseP.batteryEndWallThickness / 2)
    const rightXMax = caseP.batteryTrayXStart + 3 * slot + 2 * gap
    const rightWall = makeEndWall(rightXMax + caseP.batteryEndWallThickness / 2)

    const batteryCylinders = [0, 1, 2].map((i) => {
        const cx = caseP.batteryTrayXStart + slot / 2 + i * (slot + gap)
        const cylinderAlongZ = cylinder({ radius: batteryRadius, height: slot + 2 })
        const cylinderAlongX = rotateY(Math.PI / 2, cylinderAlongZ)
        return translate([cx, caseP.batteryTrayYCenter, batteryZCenter], cylinderAlongX)
    })

    const flangeThickness = caseP.batteryTrayFloorFlangeThickness
    const flangeXStart = caseP.batteryTrayXStart
    const flangeXEnd = caseP.batteryTrayXStart + 3 * slot + 2 * gap
    const flangeXCenter = (flangeXStart + flangeXEnd) / 2
    const flangeWidth = flangeXEnd - flangeXStart
    const flangeYBack = caseP.batteryTrayYCenter + caseP.batteryTrayYWidth / 2
    const flangeYFront = caseP.batteryTrayYCenter - caseP.batteryTrayYWidth / 2
    const flangeZBottom = caseP.bottomThickness
    const flangeZTop = batteryZCenter
    const flangeHeight = flangeZTop - flangeZBottom
    const flangeZCenter = (flangeZBottom + flangeZTop) / 2
    const backFlange = translate(
        [flangeXCenter, flangeYBack - flangeThickness / 2, flangeZCenter],
        cuboid({ size: [flangeWidth, flangeThickness, flangeHeight] }),
    )
    const frontFlange = translate(
        [flangeXCenter, flangeYFront + flangeThickness / 2, flangeZCenter],
        cuboid({ size: [flangeWidth, flangeThickness, flangeHeight] }),
    )

    const wireHoleRadius = 0.75
    const wireHoleZ = batteryZCenter + batteryRadius + 0.8
    const wireHoleDepth = caseP.batteryEndWallThickness + 0.5
    const leftWireHole = translate(
        [caseP.batteryTrayXStart - caseP.batteryEndWallThickness / 2, caseP.batteryTrayYCenter, wireHoleZ],
        rotateY(Math.PI / 2, cylinder({ radius: wireHoleRadius, height: wireHoleDepth })),
    )
    const rightWireHole = translate(
        [rightXMax + caseP.batteryEndWallThickness / 2, caseP.batteryTrayYCenter, wireHoleZ],
        rotateY(Math.PI / 2, cylinder({ radius: wireHoleRadius, height: wireHoleDepth })),
    )

    let tray = union(...cradleBlocks, leftWall, rightWall, backFlange, frontFlange)
    tray = subtract(tray, ...batteryCylinders, leftWireHole, rightWireHole)
    return tray
}

const slideSwitchBottomCutout = (caseP: CaseParams): Geom3 => {
    return translate(
        [caseP.slideSwitchX, caseP.slideSwitchY, caseP.bottomThickness / 2],
        cuboid({
            size: [caseP.slideSwitchCutoutWidth, caseP.slideSwitchCutoutLength, caseP.bottomThickness + 0.02],
        }),
    )
}

const batteryBottomCutout = (caseP: CaseParams): Geom3 => {
    const slot = caseP.batteryLength
    const gap = caseP.batteryGapLength
    const xStart = caseP.batteryTrayXStart - caseP.batteryEndWallThickness
    const xEnd = caseP.batteryTrayXStart + 3 * slot + 2 * gap + caseP.batteryEndWallThickness
    const cx = (xStart + xEnd) / 2
    const width = xEnd - xStart

    const railStepZ = 1.2
    const outerYWidth = caseP.batteryTrayYWidth + 1
    const innerYWidth = caseP.batteryTrayYWidth + 3

    const outer = translate(
        [cx, caseP.batteryTrayYCenter, railStepZ / 2],
        cuboid({ size: [width, outerYWidth, railStepZ + 0.02] }),
    )
    const inner = translate(
        [cx, caseP.batteryTrayYCenter, (caseP.bottomThickness + railStepZ) / 2],
        cuboid({ size: [width, innerYWidth, caseP.bottomThickness - railStepZ + 0.02] }),
    )
    return union(outer, inner)
}

export const buildCase = (keys: KeyPos[], params: BuildParams, caseP: CaseParams = DEFAULT_CASE_PARAMS): Geom3 => {
    const plateBounds = computeBounds(keys, params.plate.padding)
    let shell = outerShell(plateBounds, caseP)
    const cavity = innerCavity(plateBounds, caseP)
    const posts = screwPosts(plateBounds, params, caseP)
    const insertHoles = screwInsertHoles(plateBounds, params, caseP)
    const usb = usbCutout(plateBounds, caseP)
    const tray = batteryTray(caseP)

    const bottomCutout = batteryBottomCutout(caseP)
    const slideCutout = slideSwitchBottomCutout(caseP)

    shell = subtract(shell, cavity)
    if (caseP.rimInnerInset > 0) {
        shell = union(shell, upperRimLip(plateBounds, caseP))
    }
    shell = union(shell, posts, tray)
    shell = subtract(shell, insertHoles, usb, bottomCutout, slideCutout)

    return shell
}

const ASSEMBLY_SCREW = {
    insertRadius: 2.0,
    insertDepth: 4.5,
    throughRadius: 1.7,
    headRadius: 3.2,
    headDepth: 1.6,
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

const assemblyInsertsFromBelow = (plateBounds: Bounds, params: BuildParams, caseP: CaseParams): Geom3 => {
    const positions = screwPositions(plateBounds, params.plate.screwHoleMargin)
    const z0 = caseP.bottomThickness
    const holes = positions.map(([x, y]) =>
        translate(
            [x, y, z0 + ASSEMBLY_SCREW.insertDepth / 2 - 0.01],
            cylinder({ radius: ASSEMBLY_SCREW.insertRadius, height: ASSEMBLY_SCREW.insertDepth, segments: 32 }),
        ),
    )
    return union(...holes)
}

const assemblyThroughsFromBelow = (plateBounds: Bounds, params: BuildParams, caseP: CaseParams): Geom3 => {
    const positions = screwPositions(plateBounds, params.plate.screwHoleMargin)
    const items: Geom3[] = []
    for (const [x, y] of positions) {
        items.push(
            translate(
                [x, y, caseP.bottomThickness / 2],
                cylinder({ radius: ASSEMBLY_SCREW.throughRadius, height: caseP.bottomThickness + 0.02, segments: 32 }),
            ),
        )
        items.push(
            translate(
                [x, y, ASSEMBLY_SCREW.headDepth / 2 - 0.005],
                cylinder({ radius: ASSEMBLY_SCREW.headRadius, height: ASSEMBLY_SCREW.headDepth, segments: 32 }),
            ),
        )
    }
    return union(...items)
}

export const buildCaseTop = (keys: KeyPos[], params: BuildParams, caseP: CaseParams = DEFAULT_CASE_PARAMS): Geom3 => {
    const full = buildCase(keys, params, caseP)
    const plateBounds = computeBounds(keys, params.plate.padding)
    const slicer = sliceCuboid(plateBounds, caseP.bottomThickness, 500, caseP)
    const sliced = intersect(full, slicer)
    const inserts = assemblyInsertsFromBelow(plateBounds, params, caseP)
    return subtract(sliced, inserts)
}

export const buildCaseBottom = (keys: KeyPos[], params: BuildParams, caseP: CaseParams = DEFAULT_CASE_PARAMS): Geom3 => {
    const full = buildCase(keys, params, caseP)
    const plateBounds = computeBounds(keys, params.plate.padding)
    const slicer = sliceCuboid(plateBounds, -0.5, caseP.bottomThickness, caseP)
    const sliced = intersect(full, slicer)
    const throughs = assemblyThroughsFromBelow(plateBounds, params, caseP)
    return subtract(sliced, throughs)
}

export const getPlateTransform = (plateBounds: Bounds, caseP: CaseParams = DEFAULT_CASE_PARAMS) => ({
    pivotY: plateBounds.minY,
    tiltAngle: (caseP.plateTiltDeg * Math.PI) / 180,
    liftZ: caseP.plateFrontBottomZ,
})
