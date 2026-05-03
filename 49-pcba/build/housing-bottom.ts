import * as jscadModeling from '@jscad/modeling'
import {
    generalize,
    reorientYZExtrude,
    retessellate,
    type Geom3,
} from '@shared/lib/jscad'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'

const { cuboid, polygon, roundedRectangle } = jscadModeling.primitives
const { translate } = jscadModeling.transforms
const { extrudeLinear } = jscadModeling.extrusions
const { subtract, union } = jscadModeling.booleans

/**
 * 49-pcba Housing Bottom — floor + 측벽 + wedge supportRing + magnet
 *
 * - floor: 평면 (desk 안착).
 * - 측벽 (wall): floor 위 bottomWallHeight 만큼 ring 형태 — 자석 pocket z 공간 확보.
 * - supportRing: PCB 외곽 4면 둘러쌈, 윗면 sloped (PCB tilt 따라감), 아랫면 평면.
 *   ring bottom 을 floor top 안쪽으로 supportRingFloorOverlap 만큼 묻음.
 * - 자석 pocket: 측벽 안 4코너, 결합 면 (z = MATING_Z) 노출.
 */
export const buildHousingBottomGeom = (): Geom3 => {
    const G = KEYBOARD_GEOMETRY

    const WALL_THICKNESS = G.magnetSizeY + 2 * (G.magnetClearance + G.magnetEdgeMargin)

    const PLATE_W = G.plateWidth
    const PLATE_D = G.plateDepth
    const CENTER_X = G.plateCenterX
    const CENTER_Y = G.plateCenterY

    const FLOOR_BOTTOM_Z = G.caseFloorBottomZ
    const FLOOR_TOP_Z = FLOOR_BOTTOM_Z + G.caseFloorThickness
    const MATING_Z = FLOOR_TOP_Z + G.bottomWallHeight

    const INNER_W = PLATE_W + 2 * G.plateClearance
    const INNER_D = PLATE_D + 2 * G.plateClearance
    const OUTER_W = INNER_W + 2 * WALL_THICKNESS
    const OUTER_D = INNER_D + 2 * WALL_THICKNESS

    const HALF_OUT_X = OUTER_W / 2
    const HALF_OUT_Y = OUTER_D / 2

    // === Tilt 함수 (PCB 하면 z at y) ===
    const tiltRad = (G.plateTiltDeg * Math.PI) / 180
    const pcbBottomAtY = (y: number): number =>
        G.pcbFrontBottomZ + (y - G.plateMinY) * Math.tan(tiltRad)

    // === Floor + 측벽 단일 polyhedron ===
    // 외곽 OUTER prism (z=[FLOOR_BOTTOM_Z, MATING_Z]) 에서 측벽 안쪽 hollow 만 빼냄.
    // floor + 측벽을 union 으로 합치지 않아 외측 OUTER 면이 단일 평면 → boolean coplanar
    // 영역 / sliver 사라짐.
    const outerPrism = translate(
        [CENTER_X, CENTER_Y, FLOOR_BOTTOM_Z],
        extrudeLinear(
            { height: MATING_Z - FLOOR_BOTTOM_Z },
            roundedRectangle({
                size: [OUTER_W, OUTER_D],
                roundRadius: G.caseCornerRadius,
                segments: G.caseCornerSegments,
            }),
        ),
    ) as Geom3
    // 측벽 안쪽 hollow: floor top 위 ~ MATING_Z. floor 영역 침범 X.
    const wallHollowZBottom = FLOOR_TOP_Z
    const wallHollow = translate(
        [CENTER_X, CENTER_Y, wallHollowZBottom],
        extrudeLinear(
            { height: MATING_Z - wallHollowZBottom + 0.01 },
            roundedRectangle({
                size: [INNER_W, INNER_D],
                roundRadius: G.caseCornerRadius,
                segments: G.caseCornerSegments,
            }),
        ),
    ) as Geom3

    // === supportRing — wedge ring (윗면 sloped) ===
    const yFront = G.plateMinY
    const yBack = G.plateMinY + PLATE_D
    const ringBottomZ = FLOOR_TOP_Z - G.supportRingFloorOverlap

    const outerSidePoly = polygon({
        points: [
            [yFront, ringBottomZ],
            [yBack, ringBottomZ],
            [yBack, pcbBottomAtY(yBack)],
            [yFront, pcbBottomAtY(yFront)],
        ],
    })
    const outerExtruded = extrudeLinear(
        { height: PLATE_W },
        outerSidePoly,
    ) as unknown as Geom3
    const ringOuter = translate(
        [CENTER_X - PLATE_W / 2, 0, 0],
        reorientYZExtrude(outerExtruded),
    ) as Geom3

    const innerW = PLATE_W - 2 * G.supportRingWidth
    const innerYFront = G.plateMinY + G.supportRingWidth
    const innerYBack = G.plateMinY + PLATE_D - G.supportRingWidth
    const innerSidePoly = polygon({
        points: [
            [innerYFront, ringBottomZ - 1],
            [innerYBack, ringBottomZ - 1],
            [innerYBack, pcbBottomAtY(innerYBack) + 1],
            [innerYFront, pcbBottomAtY(innerYFront) + 1],
        ],
    })
    const innerExtruded = extrudeLinear(
        { height: innerW },
        innerSidePoly,
    ) as unknown as Geom3
    const ringInner = translate(
        [CENTER_X - innerW / 2, 0, 0],
        reorientYZExtrude(innerExtruded),
    ) as Geom3

    const supportRing = subtract(ringOuter, ringInner) as Geom3

    // === 자석 pocket (4코너, 측벽 안, 결합 면 z = MATING_Z 노출) ===
    const magnetCornerInsetX = (G.magnetSizeX + 2 * G.magnetClearance) / 2 + G.magnetEdgeMargin
    const magnetSidewallInsetY = WALL_THICKNESS / 2
    const magnetPositions: [number, number][] = [
        [CENTER_X - HALF_OUT_X + magnetCornerInsetX, CENTER_Y + HALF_OUT_Y - magnetSidewallInsetY],
        [CENTER_X + HALF_OUT_X - magnetCornerInsetX, CENTER_Y + HALF_OUT_Y - magnetSidewallInsetY],
        [CENTER_X - HALF_OUT_X + magnetCornerInsetX, CENTER_Y - HALF_OUT_Y + magnetSidewallInsetY],
        [CENTER_X + HALF_OUT_X - magnetCornerInsetX, CENTER_Y - HALF_OUT_Y + magnetSidewallInsetY],
    ]
    const pocketX = G.magnetSizeX + 2 * G.magnetClearance
    const pocketY = G.magnetSizeY + 2 * G.magnetClearance
    const pocketZ = G.magnetSizeZ + G.magnetClearance + G.magnetZRecess
    // pocket top = MATING_Z (결합 면). 아래로 pocketZ 깊이.
    // 자석은 pocket 안에서 magnetZRecess 만큼 매립 → 결합 면에서 자석 face 가 안쪽으로 들어감.
    const magnetPocketZCenter = MATING_Z - pocketZ / 2
    const magnetPockets = magnetPositions.map(([x, y]) =>
        translate(
            [x, y, magnetPocketZCenter],
            cuboid({ size: [pocketX, pocketY, pocketZ] }),
        ),
    )

    // outer prism - wallHollow = floor + 측벽 단일 형상.
    // 그 위에 supportRing union, 자석 pocket subtract.
    const floorPlusWall = subtract(outerPrism, wallHollow) as Geom3
    const positives = union(floorPlusWall, supportRing) as Geom3
    const negatives = union(...magnetPockets) as Geom3
    return retessellate(
        generalize({ snap: true, triangulate: false }, subtract(positives, negatives)),
    )
}
