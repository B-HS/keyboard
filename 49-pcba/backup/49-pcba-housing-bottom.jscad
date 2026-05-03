/**
 * 49-pcba Housing Bottom — overlap union 방식
 *
 * 모든 형상 상수는 shared/config/keyboard.ts 의 KEYBOARD_GEOMETRY 에서 주입.
 *
 * 설계 핵심:
 *  - floor + supportRing 을 union.
 *  - ring 의 BOTTOM 을 FLOOR_TOP_Z 보다 RING_FLOOR_OVERLAP 만큼 더 아래로
 *    내려서 floor 와 명시적으로 overlap → boolean 입력에 코플래너 face 없음.
 *  - ring 은 hollow rect 단일 형상.
 *  - 중앙 PCB 받침 pillar 는 핫스왑 PCB 라 불필요해 제거 (perimeter ring 만으로 지지).
 *  - retessellate / generalize(snap) 으로 마무리.
 */
const jscad = require('@jscad/modeling')
const { cylinder, rectangle, roundedRectangle } = jscad.primitives
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

const PLATE_CLEARANCE = G.plateClearance
const CASE_CORNER_R = G.caseCornerRadius
const CORNER_SEGMENTS = G.caseCornerSegments

// === housing-top 과 동기 (나사홀 ↔ 모서리 끝점 대칭) ===
const INSERT_R_FOR_OFFSET = G.insertRadius
const SCREW_TIP_MARGIN = G.screwTipMargin
const SCREW_TIP_DIST = INSERT_R_FOR_OFFSET + SCREW_TIP_MARGIN
const WALL_THICKNESS = SCREW_TIP_DIST * Math.sqrt(2)
const SCREW_OFFSET = WALL_THICKNESS / 2 + CASE_CORNER_R * (1 - 1 / Math.sqrt(2))

// === Z 좌표 ===
// PCB 위치는 plate 와 독립 — supportRing 은 PCB 만 받침 (plate 는 lip + 스위치로 고정).
const BC_FLOOR_THICKNESS = G.caseFloorThickness
const FLOOR_BOTTOM_Z = G.caseFloorBottomZ
const FLOOR_TOP_Z = FLOOR_BOTTOM_Z + BC_FLOOR_THICKNESS
const PCB_BOTTOM_Z = G.pcbFrontBottomZ
const PCB_TOP_Z = PCB_BOTTOM_Z + G.pcbThickness

// === 받침 / 스크류 ===
const SCREW_THROUGH_R = G.screwThroughRadius
const SCREW_HEAD_R = G.screwHeadRadius
const SCREW_HEAD_DEPTH = G.screwHeadDepth
const SUPPORT_RING_WIDTH = G.supportRingWidth
const RING_FLOOR_OVERLAP = G.supportRingFloorOverlap

// === 파생 치수 ===
const INNER_W = PLATE_W + 2 * PLATE_CLEARANCE
const INNER_D = PLATE_D + 2 * PLATE_CLEARANCE
const OUTER_W = INNER_W + 2 * WALL_THICKNESS
const OUTER_D = INNER_D + 2 * WALL_THICKNESS

const HALF_OUT_X = OUTER_W / 2
const HALF_OUT_Y = OUTER_D / 2

const MATING_POS = [
    [PLATE_CENTER_X - HALF_OUT_X + SCREW_OFFSET, PLATE_CENTER_Y + HALF_OUT_Y - SCREW_OFFSET],
    [PLATE_CENTER_X + HALF_OUT_X - SCREW_OFFSET, PLATE_CENTER_Y + HALF_OUT_Y - SCREW_OFFSET],
    [PLATE_CENTER_X - HALF_OUT_X + SCREW_OFFSET, PLATE_CENTER_Y - HALF_OUT_Y + SCREW_OFFSET],
    [PLATE_CENTER_X + HALF_OUT_X - SCREW_OFFSET, PLATE_CENTER_Y - HALF_OUT_Y + SCREW_OFFSET],
]

// === Floor (OUTER footprint, 4코너 round) ===
const floor = translate(
    [PLATE_CENTER_X, PLATE_CENTER_Y, FLOOR_BOTTOM_Z],
    extrudeLinear(
        { height: BC_FLOOR_THICKNESS },
        roundedRectangle({
            size: [OUTER_W, OUTER_D],
            roundRadius: CASE_CORNER_R,
            segments: CORNER_SEGMENTS,
        }),
    ),
)

// === Support ring (단일 hollow rect, floor 안으로 RING_FLOOR_OVERLAP 만큼 묻음) ===
const ringBottomZ = FLOOR_TOP_Z - RING_FLOOR_OVERLAP
const ringH = PCB_BOTTOM_Z - ringBottomZ
const ringOuter = rectangle({ size: [PLATE_W, PLATE_D] })
const ringInner = rectangle({
    size: [PLATE_W - 2 * SUPPORT_RING_WIDTH, PLATE_D - 2 * SUPPORT_RING_WIDTH],
})
const ring2d = subtract(ringOuter, ringInner)
const supportRing = translate(
    [PLATE_CENTER_X, PLATE_CENTER_Y, ringBottomZ],
    extrudeLinear({ height: ringH }, ring2d),
)

// === 4 코너 스크류 negative ===
const headPocketZBottom = FLOOR_BOTTOM_Z - 1
const headPocketZTop = FLOOR_BOTTOM_Z + SCREW_HEAD_DEPTH
const headPocketH = headPocketZTop - headPocketZBottom
const headPockets = MATING_POS.map(([x, y]) =>
    translate(
        [x, y, (headPocketZBottom + headPocketZTop) / 2],
        cylinder({ radius: SCREW_HEAD_R, height: headPocketH, segments: 32 }),
    ),
)
const throughZBottom = FLOOR_BOTTOM_Z + SCREW_HEAD_DEPTH
const throughZTop = FLOOR_TOP_Z + 1
const throughH = throughZTop - throughZBottom
const throughHoles = MATING_POS.map(([x, y]) =>
    translate(
        [x, y, (throughZBottom + throughZTop) / 2],
        cylinder({ radius: SCREW_THROUGH_R, height: throughH, segments: 32 }),
    ),
)

// === 조립 ===
const positives = union(floor, supportRing)
const negatives = union(...headPockets, ...throughHoles)
const bottomCase = retessellate(
    generalize({ snap: true, triangulate: false }, subtract(positives, negatives)),
)

const main = () => bottomCase

module.exports = { main }
