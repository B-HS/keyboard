/**
 * 49-pcba Housing Top
 * 외벽이 BC_FLOOR_THICKNESS 위에서 시작, lip까지 풀 height.
 *
 * Clean rebuild:
 *  - eps 오프셋 제거 (T-junction / 삼각형 artifact 회피)
 *  - negative shape를 outer shell 경계 밖으로 확장하여 코플래너 면 제거
 *  - 단일 subtract (모든 negative 사전 union)
 *  - generalize/retessellate 미사용 (단순 cuboid 기반은 raw 결과가 더 깔끔)
 */
const jscad = require('@jscad/modeling')
const { cylinder, roundedRectangle } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions
const { subtract, union } = jscad.booleans
const { retessellate, generalize } = jscad.modifiers

// === Plate / 케이스 기본 치수 ===
const PLATE_CENTER_X = 123.825
const PLATE_CENTER_Y = -28.575
const PLATE_W = 271.65
const PLATE_D = 81.15
const PLATE_THICKNESS = 1.5

const PLATE_CLEARANCE = 0.25
const CASE_CORNER_R = 1.5
const CORNER_SEGMENTS = 32

// === 나사홀 ↔ 모서리 끝점 대칭 설계 ===
// 목표: 나사홀 가장자리에서 외곽/내곽 round corner tip 까지 거리 = SCREW_TIP_MARGIN.
// 동일 코너 R 일 때, midline 배치는 외곽이 R(√2−1) 가깝고 내곽이 같은 양 멀어 비대칭.
// → WALL 과 SCREW_OFFSET 을 다음 식으로 풀어 양쪽을 동시에 균등하게 만듬.
//   WALL = (INSERT_R + SCREW_TIP_MARGIN) · √2
//   SCREW_OFFSET (외벽 수직 기준 안쪽) = WALL/2 + R·(1 − 1/√2)
//
// SCREW_TIP_MARGIN = 3.0 으로 설정 → WALL≈6.5 회복.
// 2.0 으로 두면 WALL=5.09 가 되면서 screw HEAD pocket(R=2.0)의 외벽 살이
// 0.985mm < 1.2mm (JLC 박벽 경고). 3.0 으로 올리면 head 살 1.69mm 확보.
const INSERT_R = 1.6
const SCREW_TIP_MARGIN = 3.0
const SCREW_TIP_DIST = INSERT_R + SCREW_TIP_MARGIN // 4.6
const WALL_THICKNESS = SCREW_TIP_DIST * Math.sqrt(2) // 6.505
const SCREW_OFFSET = WALL_THICKNESS / 2 + CASE_CORNER_R * (1 - 1 / Math.sqrt(2)) // 3.692

// Z 좌표
// CASE_EXTRA_DEPTH: bottom housing 의 floor 가 그만큼 더 아래로 내려간 만큼,
// top housing 의 외벽도 그만큼 더 아래(= MATING_Z)에서 시작.
// LIP_THICKNESS 를 4 → 7 로 키워 키캡 옆면을 더 가린다 (스위치 본체 노출 방지).
const CASE_EXTRA_DEPTH = 5
const BC_FLOOR_THICKNESS = 4
const MATING_Z = BC_FLOOR_THICKNESS - CASE_EXTRA_DEPTH // -1 (top housing 외벽 시작 Z)
const PLATE_BOTTOM_Z = 7
const PLATE_TOP_Z = PLATE_BOTTOM_Z + PLATE_THICKNESS // 8.5
const LIP_THICKNESS = 7
const TOP_HEIGHT_Z = PLATE_TOP_Z + LIP_THICKNESS // 15.5

// 키캡 개구부 lip 폭
const OVERHANG = 2

// M2 인서트 (INSERT_R 은 위 SCREW_TIP_DIST 식에 사용)
const INSERT_DEPTH = 4

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

// === 외곽 셸 (Z = MATING_Z ~ TOP_HEIGHT_Z, 4코너 round) ===
const shellH = TOP_HEIGHT_Z - MATING_Z // 16.5
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

// === 내부 캐비티 (플레이트 공간, 4코너 round) ===
// Z 범위: MATING_Z 아래까지 충분히 확장 → 외곽 바닥과 코플래너 발생 안 함.
// 위쪽도 PLATE_TOP_Z 정확히 일치시키지 않고 살짝 더 올려 keycap_opening 과 ε 만큼
// 겹치게 함 → boolean 결과 mesh 에서 동일 평면 sliver / degenerate face 제거.
const cavityZBottom = MATING_Z - 2 // 외곽 바닥을 명확히 관통
const cavityZTop = PLATE_TOP_Z + 0.01 // keycap_opening 과 ε overlap (코플래너 회피)
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

// === 키캡 개구부 (lip 안쪽, Z = PLATE_TOP_Z ~ TOP_HEIGHT_Z 위까지, 4코너 round) ===
const openingZBottom = PLATE_TOP_Z
const openingZTop = TOP_HEIGHT_Z + 2 // 외곽 위쪽을 명확히 관통
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

// === 4 코너 M2 인서트 홀 (블라인드, depth INSERT_DEPTH from MATING_Z) ===
const insertZBottom = MATING_Z - 1 // 외곽 바닥 명확히 관통
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
