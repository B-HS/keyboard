import * as jscadModeling from '@jscad/modeling'
import {
    applyPlateTransform,
    generalize,
    reorientYZExtrude,
    retessellate,
    type Geom3,
} from '@shared/lib/jscad'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'

const { cuboid, polygon, roundedRectangle } = jscadModeling.primitives
const { translate } = jscadModeling.transforms
const { extrudeLinear } = jscadModeling.extrusions
const { intersect, subtract, union } = jscadModeling.booleans

/**
 * 49-pcba Housing Top — wedge 외관 + 분할 cavity + magnet 결합
 *
 * cavity 분할:
 *  - plateCavity: plate frame z=[0, plateThickness+ε], plate 외곽 + clearance.
 *    회전 후 plate 외곽이 cavity 와 정확히 plateClearance 갭.
 *  - pcbCavity: PCB frame z=[-(pcbFrontBottomZ - MATING_Z + 1), pcbThickness+ε],
 *    PCB 외곽 + clearance. 외벽 바닥 관통 + PCB 영역 정렬.
 *  - gapCavity: plate frame z=[-(plateFrontBottomZ - pcbFrontBottomZ - pcbThickness), ε],
 *    plate ↔ PCB 사이 갭(3.5mm) 공간 cover (plate 외곽 정렬).
 *  - 셋 union → 회전 후 plate / PCB 모두 자기 외곽 + clearance 정확히 감쌈.
 */
export const buildHousingTopGeom = (): Geom3 => {
    const G = KEYBOARD_GEOMETRY

    // === 측벽 두께 (자석 pocket Y + 살벽 양쪽) ===
    const WALL_THICKNESS = G.magnetSizeY + 2 * (G.magnetClearance + G.magnetEdgeMargin)

    const CENTER_X = G.plateCenterX
    const CENTER_Y = G.plateCenterY
    const PLATE_W = G.plateWidth
    const PLATE_D = G.plateDepth

    const INNER_W = PLATE_W + 2 * G.plateClearance
    const INNER_D = PLATE_D + 2 * G.plateClearance
    const OUTER_W = INNER_W + 2 * WALL_THICKNESS
    const OUTER_D = INNER_D + 2 * WALL_THICKNESS
    const RECESS_W = INNER_W - 2 * G.lipOverhang
    const RECESS_D = INNER_D - 2 * G.lipOverhang

    const HALF_OUT_X = OUTER_W / 2
    const HALF_OUT_Y = OUTER_D / 2

    // === Z (수평 기준값) ===
    const FLOOR_BOTTOM_Z = G.caseFloorBottomZ
    const FLOOR_TOP_Z = FLOOR_BOTTOM_Z + G.caseFloorThickness
    // bottom housing 측벽 위에 top housing 외벽 시작 — 자석 pocket 공간 확보.
    const MATING_Z = FLOOR_TOP_Z + G.bottomWallHeight

    // === Tilt 함수 ===
    const tiltRad = (G.plateTiltDeg * Math.PI) / 180
    const pivotY = G.plateMinY
    const plateBottomAtY = (y: number): number =>
        G.plateFrontBottomZ + (y - pivotY) * Math.tan(tiltRad)
    const caseTopAtY = (y: number): number =>
        plateBottomAtY(y) + G.plateThickness + G.lipThickness

    // === 외곽 wedge shell (yz polygon → X extrude → corner round 사각 prism intersect) ===
    const yCaseMin = pivotY - G.plateClearance - WALL_THICKNESS
    const yCaseMax = pivotY + PLATE_D + G.plateClearance + WALL_THICKNESS
    const hFront = caseTopAtY(yCaseMin)
    const hBack = caseTopAtY(yCaseMax)
    const hMax = Math.max(hFront, hBack) + 5

    const sidePoly = polygon({
        points: [
            [yCaseMin, MATING_Z],
            [yCaseMax, MATING_Z],
            [yCaseMax, hBack],
            [yCaseMin, hFront],
        ],
    })
    const extruded = extrudeLinear({ height: OUTER_W }, sidePoly) as unknown as Geom3
    const wedgeShellRaw = translate(
        [CENTER_X - OUTER_W / 2, 0, 0],
        reorientYZExtrude(extruded),
    ) as Geom3

    const cornerClipper = translate(
        [CENTER_X, CENTER_Y, MATING_Z - 1],
        extrudeLinear(
            { height: hMax - MATING_Z + 2 },
            roundedRectangle({
                size: [OUTER_W, OUTER_D],
                roundRadius: G.caseCornerRadius,
                segments: G.caseCornerSegments,
            }),
        ),
    ) as Geom3
    const outerShell = intersect(wedgeShellRaw, cornerClipper) as Geom3

    // === plate cavity (plate frame, plate 정확 정렬) ===
    const plateCavityFlat = translate(
        [CENTER_X, CENTER_Y, 0],
        extrudeLinear(
            { height: G.plateThickness + 0.01 },
            roundedRectangle({
                size: [INNER_W, INNER_D],
                roundRadius: G.caseCornerRadius,
                segments: G.caseCornerSegments,
            }),
        ),
    ) as unknown as Geom3
    const plateCavity = applyPlateTransform(
        plateCavityFlat,
        G.plateTiltDeg,
        pivotY,
        G.plateFrontBottomZ,
    )

    // === gap cavity (plate frame, PCB 하면 ~ plate 하면) — top housing 외벽 안 빈 공간 ===
    // PCB 가 측벽 안 (z<MATING_Z) 에 위치하면 cavity 가 PCB 영역까지 cover 해야 PCB 가 case 안 빈 공간에 들어감.
    const gapZBottomLocal = -(G.plateFrontBottomZ - G.pcbFrontBottomZ + 1) // PCB 하면 -1mm overlap
    const gapCavityFlat = translate(
        [CENTER_X, CENTER_Y, gapZBottomLocal],
        extrudeLinear(
            { height: -gapZBottomLocal + 0.01 },
            roundedRectangle({
                size: [INNER_W, INNER_D],
                roundRadius: G.caseCornerRadius,
                segments: G.caseCornerSegments,
            }),
        ),
    ) as unknown as Geom3
    const gapCavity = applyPlateTransform(
        gapCavityFlat,
        G.plateTiltDeg,
        pivotY,
        G.plateFrontBottomZ,
    )

    // === 키캡 개구부 (lip 안쪽, plate frame) ===
    const openingZBottomLocal = G.plateThickness
    const openingZTopLocal = openingZBottomLocal + G.lipThickness + 5
    const openingFlat = translate(
        [CENTER_X, CENTER_Y, openingZBottomLocal],
        extrudeLinear(
            { height: openingZTopLocal - openingZBottomLocal },
            roundedRectangle({
                size: [RECESS_W, RECESS_D],
                roundRadius: G.caseCornerRadius,
                segments: G.caseCornerSegments,
            }),
        ),
    ) as unknown as Geom3
    const keycapOpening = applyPlateTransform(
        openingFlat,
        G.plateTiltDeg,
        pivotY,
        G.plateFrontBottomZ,
    )

    // === 자석 pocket (4코너, 결합 면 z = MATING_Z 노출) ===
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
    // pocket bottom = MATING_Z - magnetZRecess (자석을 매립). 위로 pocketZ 깊이.
    // → 자석 결합 면 기준 magnetZRecess 만큼 안쪽으로 들어감 → 글루건 채움 공간.
    const magnetPocketZCenter = MATING_Z + pocketZ / 2
    const magnetPockets = magnetPositions.map(([x, y]) =>
        translate(
            [x, y, magnetPocketZCenter],
            cuboid({ size: [pocketX, pocketY, pocketZ] }),
        ),
    )

    // === 단일 subtract ===
    const allNegatives = union(
        plateCavity,
        gapCavity,
        keycapOpening,
        ...magnetPockets,
    ) as Geom3
    return retessellate(
        generalize({ snap: true, triangulate: false }, subtract(outerShell, allNegatives)),
    )
}
