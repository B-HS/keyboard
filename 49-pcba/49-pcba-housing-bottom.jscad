/**
 * 49-pcba Housing Bottom — overlap union 방식
 *
 * 설계 핵심:
 *  - floor + supportRing 을 union.
 *  - ring 의 BOTTOM 을 FLOOR_TOP_Z 보다 RING_FLOOR_OVERLAP 만큼 더 아래로
 *    내려서 floor 와 명시적으로 overlap → boolean 입력에 코플래너 face 없음.
 *  - ring 은 hollow rect 단일 형상.
 *  - 중앙 PCB 받침 pillar 는 핫스왑 PCB 라 불필요해 제거 (perimeter ring 만으로 지지).
 *  - retessellate/generalize 로 마무리.
 */
const jscad = require('@jscad/modeling')
const { cylinder, rectangle, roundedRectangle } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions
const { subtract, union } = jscad.booleans
const { retessellate, generalize } = jscad.modifiers

// === Plate / 케이스 기본 치수 ===
const PLATE_CENTER_X = 123.825
const PLATE_CENTER_Y = -28.575
const PLATE_W = 271.65
const PLATE_D = 81.15

const PLATE_CLEARANCE = 0.25
const CASE_CORNER_R = 1.5
const CORNER_SEGMENTS = 32

// === housing-top 과 동기화 (나사홀 ↔ 모서리 끝점 대칭 설계) ===
const INSERT_R_FOR_OFFSET = 1.6
const SCREW_TIP_MARGIN = 3.0
const SCREW_TIP_DIST = INSERT_R_FOR_OFFSET + SCREW_TIP_MARGIN // 4.6
const WALL_THICKNESS = SCREW_TIP_DIST * Math.sqrt(2) // 6.505
const SCREW_OFFSET = WALL_THICKNESS / 2 + CASE_CORNER_R * (1 - 1 / Math.sqrt(2)) // 3.692

// Z 좌표
const CASE_EXTRA_DEPTH = 5
const BC_FLOOR_THICKNESS = 4
const FLOOR_TOP_Z = BC_FLOOR_THICKNESS - CASE_EXTRA_DEPTH // -1
const FLOOR_BOTTOM_Z = -CASE_EXTRA_DEPTH // -5
const PLATE_BOTTOM_Z = 7
const PCB_THICKNESS = 1.6
const PCB_BOTTOM_Z = PLATE_BOTTOM_Z - PCB_THICKNESS // 5.4

// 받침 / 스크류
const SCREW_THROUGH_R = 1.25
const SCREW_HEAD_R = 2.0
const SCREW_HEAD_DEPTH = 2.0
const SUPPORT_RING_WIDTH = 5

// ring 이 floor 안으로 묻히는 깊이 (코플래너 회피용 overlap)
const RING_FLOOR_OVERLAP = 0.5

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

// === Floor (Z = FLOOR_BOTTOM_Z ~ FLOOR_TOP_Z, OUTER footprint, 4코너 round) ===
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
const ringBottomZ = FLOOR_TOP_Z - RING_FLOOR_OVERLAP // -1.5
const ringH = PCB_BOTTOM_Z - ringBottomZ // 6.9
const ringOuter = rectangle({ size: [PLATE_W, PLATE_D] })
const ringInner = rectangle({
    size: [PLATE_W - 2 * SUPPORT_RING_WIDTH, PLATE_D - 2 * SUPPORT_RING_WIDTH],
})
const ring2d = subtract(ringOuter, ringInner)
const supportRing = translate(
    [PLATE_CENTER_X, PLATE_CENTER_Y, ringBottomZ],
    extrudeLinear({ height: ringH }, ring2d),
)

// === 4 코너 스크류 negative (원형) ===
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
