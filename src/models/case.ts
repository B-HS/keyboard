import { primitives, transforms, booleans, extrusions, modifiers } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { computeBounds, U, type Bounds, type KeyPos } from './layout'
import type { BuildParams } from './build-params'
import { buildPlate } from './plate'

const { cuboid, cylinder, polygon, roundedRectangle } = primitives
const { translate, rotateX, rotateY } = transforms
const { union, subtract, intersect } = booleans
const { extrudeLinear } = extrusions
const { retessellate } = modifiers

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

    topDeckThickness: number
    topDeckKeyClearance: number

    cornerBossSize: number
    cornerBossHeight: number
    cornerBossInsertRadius: number
    cornerBossInsertDepth: number
    cornerBossThroughRadius: number
    cornerBossHeadRadius: number
    cornerBossHeadDepth: number

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
    slideSwitchZ: number
    slideSwitchCutoutWidth: number
    slideSwitchCutoutHeight: number
}

export const DEFAULT_CASE_PARAMS: CaseParams = {
    caseMarginFront: 2,
    caseMarginBack: 0,
    caseMarginLeft: 2,
    caseMarginRight: 2,
    plateTiltDeg: 8,
    plateFrontBottomZ: 11.25,

    plateRecessWall: 7.5,
    wallThickness: 2,
    bottomThickness: 2.4,

    topDeckThickness: 1.0,
    topDeckKeyClearance: 0.2,

    cornerBossSize: 6,
    cornerBossHeight: 5,
    cornerBossInsertRadius: 1.75,
    cornerBossInsertDepth: 4.0,
    cornerBossThroughRadius: 1.7,
    cornerBossHeadRadius: 3.2,
    cornerBossHeadDepth: 1.6,

    screwPostOuterDiameter: 6,
    screwPostInsertHoleDiameter: 1.5,
    screwPostInsertDepth: 1.0,

    usbCutoutWidth: 12.2,
    usbCutoutHeight: 5.5,
    usbCutoutCenterX: 9.7,
    usbCutoutCenterZ: 7.0,
    usbCutoutCornerRadius: 1.5,
    usbCutoutTaperExpand: 0.5,

    batteryDiameter: 10.5,
    batteryLength: 44.5,
    batterySlotTolerance: 0.2,
    batteryGapLength: 2,
    batteryTrayYCenter: 3,
    batteryTrayYWidth: 12,
    batteryTrayXStart: 73,
    batteryEndWallThickness: 2,
    batteryTrayUpperWall: 1.3,
    batteryTrayFloorFlangeThickness: 1.5,

    caseCornerRadius: 2,

    slideSwitchX: 47,
    slideSwitchY: 8.6,
    slideSwitchZ: 4.0,
    slideSwitchCutoutWidth: 8,
    slideSwitchCutoutHeight: 6,
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

export const caseFrontTopZ = (plateBounds: Bounds, caseP: CaseParams = DEFAULT_CASE_PARAMS): number =>
    caseHeightAtY(caseBounds(plateBounds, caseP).minY, plateBounds, caseP)

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

const topDeck = (keys: KeyPos[], plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const cb = caseBounds(plateBounds, caseP)

    const deckTopZAt = (y: number): number => caseHeightAtY(y, plateBounds, caseP)
    const deckBottomZAt = (y: number): number => plateBottomAtY(y, plateBounds, caseP) + 1.5

    const bFront = deckBottomZAt(cb.minY)
    const tFront = deckTopZAt(cb.minY)
    const bBack = deckBottomZAt(cb.maxY)
    const tBack = deckTopZAt(cb.maxY)

    const slabPoly = polygon({
        points: [
            [cb.maxY, bBack],
            [cb.maxY, tBack],
            [cb.minY, tFront],
            [cb.minY, bFront],
        ],
    })
    const slabExtruded = extrudeLinear({ height: cb.maxX - cb.minX }, slabPoly)
    const slab = translate([cb.minX, 0, 0], reorient(slabExtruded))

    const extra = caseP.topDeckKeyClearance
    let minCx = Infinity
    let maxCx = -Infinity
    let minCy = Infinity
    let maxCy = -Infinity
    for (const k of keys) {
        const halfW = (k.w * U) / 2 + extra
        const halfH = (k.h * U) / 2 + extra
        if (k.cx - halfW < minCx) minCx = k.cx - halfW
        if (k.cx + halfW > maxCx) maxCx = k.cx + halfW
        if (k.cy - halfH < minCy) minCy = k.cy - halfH
        if (k.cy + halfH > maxCy) maxCy = k.cy + halfH
    }

    const zPad = 10
    const cutZBottomLocal = 1.5 - zPad
    const cutZTopLocal = 1.5 + caseP.plateRecessWall + zPad
    const cutoutCornerR = Math.max(caseP.caseCornerRadius * 2 - caseP.wallThickness, 0.5)
    const cutout2d = translate(
        [(minCx + maxCx) / 2, (minCy + maxCy) / 2],
        roundedRectangle({
            size: [maxCx - minCx, maxCy - minCy],
            roundRadius: cutoutCornerR,
            segments: 48,
        }),
    )
    const localCutout = translate(
        [0, 0, cutZBottomLocal],
        extrudeLinear({ height: cutZTopLocal - cutZBottomLocal }, cutout2d),
    )
    const { pivotY, tiltAngle, liftZ } = getPlateTransform(plateBounds, caseP)
    let bigCutout = translate([0, -pivotY, 0], localCutout)
    bigCutout = rotateX(tiltAngle, bigCutout)
    bigCutout = translate([0, pivotY, liftZ], bigCutout)

    const perforated = subtract(slab, bigCutout)

    const clipRect = roundedRectangle({
        size: [cb.maxX - cb.minX, cb.maxY - cb.minY],
        roundRadius: caseP.caseCornerRadius,
        segments: 64,
    })
    const clipper = translate(
        [(cb.minX + cb.maxX) / 2, (cb.minY + cb.maxY) / 2, -10],
        extrudeLinear({ height: 400 }, clipRect),
    )
    return intersect(perforated, clipper)
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

    const cradleOuterHalfY = batteryRadius + trayUpperWall
    const cradleYWidth = cradleOuterHalfY * 2
    const outerRadius = batteryRadius + trayUpperWall
    const cradleBlocks = [0, 1, 2].map((i) => {
        const cx = caseP.batteryTrayXStart + slot / 2 + i * (slot + gap)
        const block = translate(
            [cx, caseP.batteryTrayYCenter, trayZCenter],
            cuboid({ size: [slot, cradleYWidth, trayHeight] }),
        )
        const rounder = translate(
            [cx, caseP.batteryTrayYCenter, batteryZCenter],
            rotateY(Math.PI / 2, cylinder({ radius: outerRadius, height: slot + 0.01, segments: 48 })),
        )
        return intersect(block, rounder)
    })

    const wallExtraHeight = batteryRadius * 2 + trayUpperWall
    const wallZCenter = caseP.bottomThickness + wallExtraHeight / 2
    const makeEndWall = (xCenter: number): Geom3 => {
        const block = translate(
            [xCenter, caseP.batteryTrayYCenter, wallZCenter],
            cuboid({ size: [caseP.batteryEndWallThickness, cradleYWidth, wallExtraHeight] }),
        )
        const rounder = translate(
            [xCenter, caseP.batteryTrayYCenter, batteryZCenter],
            rotateY(Math.PI / 2, cylinder({ radius: outerRadius, height: caseP.batteryEndWallThickness + 0.01, segments: 48 })),
        )
        return intersect(block, rounder)
    }
    const leftWall = makeEndWall(caseP.batteryTrayXStart - caseP.batteryEndWallThickness / 2)
    const rightXMax = caseP.batteryTrayXStart + 3 * slot + 2 * gap
    const rightWall = makeEndWall(rightXMax + caseP.batteryEndWallThickness / 2)

    const batteryCylinders = [0, 1, 2].map((i) => {
        const cx = caseP.batteryTrayXStart + slot / 2 + i * (slot + gap)
        const cylinderAlongZ = cylinder({ radius: batteryRadius, height: slot + 0.5 })
        const cylinderAlongX = rotateY(Math.PI / 2, cylinderAlongZ)
        return translate([cx, caseP.batteryTrayYCenter, batteryZCenter], cylinderAlongX)
    })

    const flangeThickness = caseP.batteryTrayFloorFlangeThickness
    const flangeXStart = caseP.batteryTrayXStart
    const flangeXEnd = caseP.batteryTrayXStart + 3 * slot + 2 * gap
    const flangeXCenter = (flangeXStart + flangeXEnd) / 2
    const flangeWidth = flangeXEnd - flangeXStart
    const flangeYBack = caseP.batteryTrayYCenter + cradleOuterHalfY
    const flangeYFront = caseP.batteryTrayYCenter - cradleOuterHalfY
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

export const batteryCoverOpening = (caseP: CaseParams) => {
    const switchLeft = caseP.slideSwitchX - caseP.slideSwitchCutoutWidth / 2 - 2
    const trayLeft = caseP.batteryTrayXStart - caseP.batteryEndWallThickness
    const trayRight = caseP.batteryTrayXStart + 3 * caseP.batteryLength + 2 * caseP.batteryGapLength + caseP.batteryEndWallThickness
    const bosses = magnetBossCenters(caseP)
    const bossLeft = Math.min(...bosses.map(([x]) => x)) - magnetBossSizeX / 2
    const bossRight = Math.max(...bosses.map(([x]) => x)) + magnetBossSizeX / 2
    const xStart = Math.min(switchLeft, trayLeft, bossLeft)
    const xEnd = Math.max(trayRight, bossRight)
    const yStart = caseP.batteryTrayYCenter - caseP.batteryTrayYWidth / 2 - 1
    const yEnd = caseP.batteryTrayYCenter + caseP.batteryTrayYWidth / 2 + 1
    return { xStart, xEnd, yStart, yEnd }
}

export const MAGNET_SIZE_X = 10
export const MAGNET_SIZE_Y = 5
export const MAGNET_HEIGHT = 2
export const MAGNET_CLEARANCE = 0.2
export const COVER_THICKNESS = 2
export const MAGNET_POCKET_DEPTH_CASE = 2 * MAGNET_HEIGHT + COVER_THICKNESS - 2.4 + 0.1

const MAGNET_BOSS_WALL = 1.5
export const magnetBossSizeX = MAGNET_SIZE_X + MAGNET_CLEARANCE + 2 * MAGNET_BOSS_WALL
export const magnetBossSizeY = MAGNET_SIZE_Y + MAGNET_CLEARANCE + 2 * MAGNET_BOSS_WALL
export const magnetBossHeight = MAGNET_POCKET_DEPTH_CASE + MAGNET_BOSS_WALL

export const magnetBossCenters = (caseP: CaseParams): Array<[number, number]> => {
    const trayLeft = caseP.batteryTrayXStart - caseP.batteryEndWallThickness
    const trayRight = caseP.batteryTrayXStart + 3 * caseP.batteryLength + 2 * caseP.batteryGapLength + caseP.batteryEndWallThickness
    const leftX = trayLeft - magnetBossSizeX / 2
    const rightX = trayRight + magnetBossSizeX / 2
    return [
        [leftX, caseP.batteryTrayYCenter],
        [rightX, caseP.batteryTrayYCenter],
    ]
}

export const coverMagnetCenters = (caseP: CaseParams): Array<[number, number]> => {
    return magnetBossCenters(caseP).map(([bx, by]) => [bx, by] as [number, number])
}

const batteryBottomCutout = (_plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const o = batteryCoverOpening(caseP)
    const cx = (o.xStart + o.xEnd) / 2
    const cy = (o.yStart + o.yEnd) / 2
    const width = o.xEnd - o.xStart
    const height = o.yEnd - o.yStart
    return translate(
        [cx, cy, caseP.bottomThickness / 2],
        cuboid({ size: [width, height, caseP.bottomThickness + 0.02] }),
    )
}

const batteryCoverCaseMagnetPockets = (caseP: CaseParams): Geom3 => {
    const pocketZCenter = caseP.bottomThickness + MAGNET_POCKET_DEPTH_CASE / 2 - 0.01
    const pockets = coverMagnetCenters(caseP).map(([mx, my]) =>
        translate(
            [mx, my, pocketZCenter],
            cuboid({
                size: [
                    MAGNET_SIZE_X + MAGNET_CLEARANCE,
                    MAGNET_SIZE_Y + MAGNET_CLEARANCE,
                    MAGNET_POCKET_DEPTH_CASE,
                ],
            }),
        ),
    )
    return union(...pockets)
}

const magnetBosses = (caseP: CaseParams): Geom3 => {
    const zCenter = caseP.bottomThickness + magnetBossHeight / 2
    const blocks = magnetBossCenters(caseP).map(([bx, by]) =>
        translate(
            [bx, by, zCenter],
            cuboid({ size: [magnetBossSizeX, magnetBossSizeY, magnetBossHeight] }),
        ),
    )
    return union(...blocks)
}

const cornerBossCenters = (plateBounds: Bounds, caseP: CaseParams): Array<[number, number]> => {
    const cb = caseBounds(plateBounds, caseP)
    const wallT = caseP.wallThickness
    const s = caseP.cornerBossSize
    const xLo = cb.minX + wallT + s / 2
    const xHi = cb.maxX - wallT - s / 2
    const yLo = cb.minY + wallT + s / 2
    const yHi = cb.maxY - wallT - s / 2
    return [
        [xLo, yLo],
        [xHi, yLo],
        [xLo, yHi],
        [xHi, yHi],
    ]
}

const cornerBosses = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const s = caseP.cornerBossSize
    const h = caseP.cornerBossHeight
    const zCenter = caseP.bottomThickness + h / 2
    const positions = cornerBossCenters(plateBounds, caseP)
    const blocks = positions.map(([x, y]) =>
        translate([x, y, zCenter], cuboid({ size: [s, s, h] })),
    )
    return union(...blocks)
}

const cornerBossInsertHoles = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const r = caseP.cornerBossInsertRadius
    const depth = caseP.cornerBossInsertDepth
    const zCenter = caseP.bottomThickness + depth / 2 - 0.01
    const positions = cornerBossCenters(plateBounds, caseP)
    const holes = positions.map(([x, y]) =>
        translate([x, y, zCenter], cylinder({ radius: r, height: depth, segments: 32 })),
    )
    return union(...holes)
}

const cornerBossThroughs = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const tr = caseP.cornerBossThroughRadius
    const hr = caseP.cornerBossHeadRadius
    const hd = caseP.cornerBossHeadDepth
    const positions = cornerBossCenters(plateBounds, caseP)
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

export const buildCase = (keys: KeyPos[], params: BuildParams, caseP: CaseParams = DEFAULT_CASE_PARAMS): Geom3 => {
    const plateBounds = computeBounds(keys, params.plate.padding)
    let shell = outerShell(plateBounds, caseP)
    const cavity = innerCavity(plateBounds, caseP)
    const usb = usbCutout(plateBounds, caseP)
    const tray = batteryTray(caseP)

    const bottomCutout = batteryBottomCutout(plateBounds, caseP)

    shell = subtract(shell, cavity)
    if (caseP.topDeckThickness > 0) {
        shell = union(shell, topDeck(keys, plateBounds, caseP))
    }

    const plateLocal = buildPlate(keys, { ...params.plate, screwHoleRadius: 0 })
    const { pivotY, tiltAngle, liftZ } = getPlateTransform(plateBounds, caseP)
    let plateTilted = translate([0, -pivotY, 0], plateLocal)
    plateTilted = rotateX(tiltAngle, plateTilted)
    plateTilted = translate([0, pivotY, liftZ], plateTilted)

    shell = union(shell, tray, plateTilted, cornerBosses(plateBounds, caseP), magnetBosses(caseP))
    shell = subtract(shell, usb, bottomCutout, cornerBossInsertHoles(plateBounds, caseP), batteryCoverCaseMagnetPockets(caseP))

    return retessellate(shell)
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

export const buildCaseTop = (keys: KeyPos[], params: BuildParams, caseP: CaseParams = DEFAULT_CASE_PARAMS): Geom3 => {
    const full = buildCase(keys, params, caseP)
    const plateBounds = computeBounds(keys, params.plate.padding)
    const slicer = sliceCuboid(plateBounds, caseP.bottomThickness, 500, caseP)
    return intersect(full, slicer)
}

export const buildCaseBottom = (keys: KeyPos[], params: BuildParams, caseP: CaseParams = DEFAULT_CASE_PARAMS): Geom3 => {
    const full = buildCase(keys, params, caseP)
    const plateBounds = computeBounds(keys, params.plate.padding)
    const slicer = sliceCuboid(plateBounds, -0.5, caseP.bottomThickness, caseP)
    const sliced = intersect(full, slicer)
    return subtract(sliced, cornerBossThroughs(plateBounds, caseP))
}

export const getPlateTransform = (plateBounds: Bounds, caseP: CaseParams = DEFAULT_CASE_PARAMS) => ({
    pivotY: plateBounds.minY,
    tiltAngle: (caseP.plateTiltDeg * Math.PI) / 180,
    liftZ: caseP.plateFrontBottomZ,
})
