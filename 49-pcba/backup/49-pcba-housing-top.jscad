/**
 * 49-pcba Housing Top — full outer shell (Z=BC_FLOOR_THICKNESS ~ top)
 * 외벽이 하판 floor 위에 mating, 위로 lip까지 풀 height.
 */
const jscad = require('@jscad/modeling')
const { roundedRectangle, cuboid, cylinder } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions
const { subtract, union } = jscad.booleans
const { retessellate, generalize } = jscad.modifiers
void roundedRectangle
void extrudeLinear

const PLATE_CENTER_X = 123.825
const PLATE_CENTER_Y = -29.575
const PLATE_W = 271.55
const PLATE_D = 83.05
const PLATE_THICKNESS = 1.5

const PLATE_CLEARANCE = 0.25
const WALL_THICKNESS = 6.5
const CASE_CORNER_R = 1.5

const BC_FLOOR_THICKNESS = 4
const PLATE_BOTTOM_Z = 7
const PLATE_TOP_Z = PLATE_BOTTOM_Z + PLATE_THICKNESS // 8.5

const LIP_THICKNESS = 4
const TOP_HEIGHT_Z = PLATE_TOP_Z + LIP_THICKNESS // 12.5
const OVERHANG = 2

const INSERT_R = 1.6
const INSERT_DEPTH = 4

const PLATE_MIN_X = PLATE_CENTER_X - PLATE_W / 2
const PLATE_MAX_X = PLATE_CENTER_X + PLATE_W / 2
const PLATE_MIN_Y = PLATE_CENTER_Y - PLATE_D / 2
const PLATE_MAX_Y = PLATE_CENTER_Y + PLATE_D / 2

const INNER_X_MIN = PLATE_MIN_X - PLATE_CLEARANCE
const INNER_X_MAX = PLATE_MAX_X + PLATE_CLEARANCE
const INNER_Y_MIN = PLATE_MIN_Y - PLATE_CLEARANCE
const INNER_Y_MAX = PLATE_MAX_Y + PLATE_CLEARANCE
const OUTER_X_MIN = INNER_X_MIN - WALL_THICKNESS
const OUTER_X_MAX = INNER_X_MAX + WALL_THICKNESS
const OUTER_Y_MIN = INNER_Y_MIN - WALL_THICKNESS
const OUTER_Y_MAX = INNER_Y_MAX + WALL_THICKNESS

const OUTER_W = OUTER_X_MAX - OUTER_X_MIN
const OUTER_D = OUTER_Y_MAX - OUTER_Y_MIN
const INNER_W = INNER_X_MAX - INNER_X_MIN
const INNER_D = INNER_Y_MAX - INNER_Y_MIN
const RECESS_W = INNER_W - 2 * OVERHANG
const RECESS_D = INNER_D - 2 * OVERHANG
const CENTER_X = (OUTER_X_MIN + OUTER_X_MAX) / 2
const CENTER_Y = (OUTER_Y_MIN + OUTER_Y_MAX) / 2

const MATING_POS = [
    [OUTER_X_MIN + WALL_THICKNESS / 2, OUTER_Y_MAX - WALL_THICKNESS / 2],
    [OUTER_X_MAX - WALL_THICKNESS / 2, OUTER_Y_MAX - WALL_THICKNESS / 2],
    [OUTER_X_MIN + WALL_THICKNESS / 2, OUTER_Y_MIN + WALL_THICKNESS / 2],
    [OUTER_X_MAX - WALL_THICKNESS / 2, OUTER_Y_MIN + WALL_THICKNESS / 2],
]

// === 외부 prism (Z=BC_FLOOR_THICKNESS ~ TOP_HEIGHT_Z) — cuboid (sharp 코너, 최소 polygon) ===
const outerShellH = TOP_HEIGHT_Z - BC_FLOOR_THICKNESS
const outerShell = translate(
    [CENTER_X, CENTER_Y, BC_FLOOR_THICKNESS + outerShellH / 2],
    cuboid({ size: [OUTER_W, OUTER_D, outerShellH] }),
)

// === 내부 캐비티 (Z=BC_FLOOR_THICKNESS ~ PLATE_TOP_Z) — cuboid (날카로운 사각, polygon artifact 회피) ===
const innerCavityH = PLATE_TOP_Z - BC_FLOOR_THICKNESS + 0.01
const innerCavity = translate(
    [CENTER_X, CENTER_Y, BC_FLOOR_THICKNESS - 0.005 + innerCavityH / 2],
    cuboid({ size: [INNER_W, INNER_D, innerCavityH] }),
)

// === 키캡 개구부 (Z=PLATE_TOP_Z ~ TOP_HEIGHT_Z, lip 안쪽) — cuboid ===
const keycapOpeningH = LIP_THICKNESS + 0.01
const keycapOpening = translate(
    [CENTER_X, CENTER_Y, PLATE_TOP_Z - 0.005 + keycapOpeningH / 2],
    cuboid({ size: [RECESS_W, RECESS_D, keycapOpeningH] }),
)

// === 4코너 mating M2 인서트 ===
const insertHoles = MATING_POS.map(([x, y]) =>
    translate(
        [x, y, BC_FLOOR_THICKNESS + INSERT_DEPTH / 2 - 0.01],
        cylinder({ radius: INSERT_R, height: INSERT_DEPTH, segments: 32 }),
    ),
)

// 모든 negative를 union 후 단일 subtract → CSG가 외곽면을 덜 분할
const allNegatives = union(innerCavity, keycapOpening, ...insertHoles)
const rawCase = subtract(outerShell, allNegatives)
// generalize로 vertex 격자 정렬 (FP 오차 제거) → retessellate로 coplanar 병합
const topCase = retessellate(generalize({ snap: true, triangulate: false }, rawCase))

const main = () => topCase

module.exports = { main }
