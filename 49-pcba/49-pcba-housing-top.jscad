/**
 * 49-pcba Housing Top
 *
 * 모든 형상 상수는 shared/config/keyboard.ts 의 KEYBOARD_GEOMETRY 에서 주입.
 * evaluator (viewer / export script) 가 prelude 로 const KEYBOARD_GEOMETRY = {...} 를
 * 이 소스 앞에 prepend 한다 — 이 파일에서는 그대로 참조.
 *
 * Clean rebuild:
 *  - eps 오프셋 제거 (T-junction / 삼각형 artifact 회피)
 *  - negative shape 를 outer shell 경계 밖으로 확장하여 코플래너 면 제거
 *  - 단일 subtract (모든 negative 사전 union)
 *  - retessellate / generalize(snap) 으로 마무리
 */
const jscad = require('@jscad/modeling')
const { cylinder, roundedRectangle } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions
const { subtract, union } = jscad.booleans
const { retessellate, generalize } = jscad.modifiers

const G = KEYBOARD_GEOMETRY

// === 기본 ===
const PLATE_CENTER_X = G.plateCenterX
const PLATE_CENTER_Y = G.plateCenterY
const PLATE_W = G.plateWidth
const PLATE_D = G.plateDepth
const PLATE_THICKNESS = G.plateThickness

const PLATE_CLEARANCE = G.plateClearance
const CASE_CORNER_R = G.caseCornerRadius
const CORNER_SEGMENTS = G.caseCornerSegments

// === 나사홀 ↔ 모서리 끝점 대칭 (양쪽 round corner tip 까지 SCREW_TIP_MARGIN 균등) ===
//   WALL = (INSERT_R + SCREW_TIP_MARGIN) · √2
//   SCREW_OFFSET = WALL/2 + R · (1 − 1/√2)
const INSERT_R = G.insertRadius
const SCREW_TIP_MARGIN = G.screwTipMargin
const SCREW_TIP_DIST = INSERT_R + SCREW_TIP_MARGIN
const WALL_THICKNESS = SCREW_TIP_DIST * Math.sqrt(2)
const SCREW_OFFSET = WALL_THICKNESS / 2 + CASE_CORNER_R * (1 - 1 / Math.sqrt(2))

// === Z 좌표 ===
const BC_FLOOR_THICKNESS = G.caseFloorThickness
const FLOOR_BOTTOM_Z = G.caseFloorBottomZ
const MATING_Z = FLOOR_BOTTOM_Z + BC_FLOOR_THICKNESS // top housing 외벽 시작 Z
const PLATE_BOTTOM_Z = G.plateFrontBottomZ
const PLATE_TOP_Z = PLATE_BOTTOM_Z + PLATE_THICKNESS
const LIP_THICKNESS = G.lipThickness
const TOP_HEIGHT_Z = PLATE_TOP_Z + LIP_THICKNESS

const OVERHANG = G.lipOverhang
const INSERT_DEPTH = G.insertDepth

// === 파생 치수 ===
const INNER_W = PLATE_W + 2 * PLATE_CLEARANCE
const INNER_D = PLATE_D + 2 * PLATE_CLEARANCE
const OUTER_W = INNER_W + 2 * WALL_THICKNESS
const OUTER_D = INNER_D + 2 * WALL_THICKNESS
const RECESS_W = INNER_W - 2 * OVERHANG
const RECESS_D = INNER_D - 2 * OVERHANG

const CENTER_X = PLATE_CENTER_X
const CENTER_Y = PLATE_CENTER_Y

const HALF_OUT_X = OUTER_W / 2
const HALF_OUT_Y = OUTER_D / 2

const MATING_POS = [
    [CENTER_X - HALF_OUT_X + SCREW_OFFSET, CENTER_Y + HALF_OUT_Y - SCREW_OFFSET],
    [CENTER_X + HALF_OUT_X - SCREW_OFFSET, CENTER_Y + HALF_OUT_Y - SCREW_OFFSET],
    [CENTER_X - HALF_OUT_X + SCREW_OFFSET, CENTER_Y - HALF_OUT_Y + SCREW_OFFSET],
    [CENTER_X + HALF_OUT_X - SCREW_OFFSET, CENTER_Y - HALF_OUT_Y + SCREW_OFFSET],
]

// === 외곽 셸 ===
const shellH = TOP_HEIGHT_Z - MATING_Z
const outerShell = translate(
    [CENTER_X, CENTER_Y, MATING_Z],
    extrudeLinear(
        { height: shellH },
        roundedRectangle({
            size: [OUTER_W, OUTER_D],
            roundRadius: CASE_CORNER_R,
            segments: CORNER_SEGMENTS,
        }),
    ),
)

// === 내부 캐비티 (plate 공간) ===
const cavityZBottom = MATING_Z - 2
const cavityZTop = PLATE_TOP_Z + 0.01 // keycap_opening 과 ε overlap → 코플래너 sliver 제거
const cavityH = cavityZTop - cavityZBottom
const innerCavity = translate(
    [CENTER_X, CENTER_Y, cavityZBottom],
    extrudeLinear(
        { height: cavityH },
        roundedRectangle({
            size: [INNER_W, INNER_D],
            roundRadius: CASE_CORNER_R,
            segments: CORNER_SEGMENTS,
        }),
    ),
)

// === 키캡 개구부 (lip 안쪽) ===
const openingZBottom = PLATE_TOP_Z
const openingZTop = TOP_HEIGHT_Z + 2
const openingH = openingZTop - openingZBottom
const keycapOpening = translate(
    [CENTER_X, CENTER_Y, openingZBottom],
    extrudeLinear(
        { height: openingH },
        roundedRectangle({
            size: [RECESS_W, RECESS_D],
            roundRadius: CASE_CORNER_R,
            segments: CORNER_SEGMENTS,
        }),
    ),
)

// === 4 코너 M2 인서트 홀 (블라인드, MATING_Z 부터 INSERT_DEPTH) ===
const insertZBottom = MATING_Z - 1
const insertZTop = MATING_Z + INSERT_DEPTH
const insertH = insertZTop - insertZBottom
const insertHoles = MATING_POS.map(([x, y]) =>
    translate(
        [x, y, (insertZBottom + insertZTop) / 2],
        cylinder({ radius: INSERT_R, height: insertH, segments: 24 }),
    ),
)

// === 단일 subtract + 격자 정렬 + coplanar 병합 ===
const allNegatives = union(innerCavity, keycapOpening, ...insertHoles)
const topCase = retessellate(
    generalize({ snap: true, triangulate: false }, subtract(outerShell, allNegatives)),
)

const main = () => topCase

module.exports = { main }
