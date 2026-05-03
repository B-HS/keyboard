/**
 * 49-pcba Housing Bottom — floor + perimeter ring + 2 중앙 pillar
 * 4코너 원기둥 대신 plate margin 영역 전체를 4면 직사각 ring으로 받침 (안정성)
 */
const jscad = require("@jscad/modeling");
const { roundedRectangle, cuboid, cylinder } = jscad.primitives;
const { translate } = jscad.transforms;
const { extrudeLinear } = jscad.extrusions;
const { subtract, union } = jscad.booleans;
const { retessellate, generalize } = jscad.modifiers;
void extrudeLinear;

const PLATE_CENTER_X = 123.825;
const PLATE_CENTER_Y = -29.575;
const PLATE_W = 271.55;
const PLATE_D = 83.05;

const PLATE_CLEARANCE = 0.25;
const WALL_THICKNESS = 6.5;
const CASE_CORNER_R = 1.5;

const BC_FLOOR_THICKNESS = 4;
const PLATE_BOTTOM_Z = 7;
const PCB_THICKNESS = 1.6;
const PCB_BOTTOM_Z = PLATE_BOTTOM_Z - PCB_THICKNESS;

const PILLAR_R = 3;
const SCREW_THROUGH_R = 1.25; // M2 통과 (ø2.5)
const SCREW_HEAD_R = 2.0; // M2 cap head (OD 3.8 + 여유)
const SCREW_HEAD_DEPTH = 2.0; // pocket 깊이

const SUPPORT_RING_WIDTH = 5; // 4면 받침 ring 너비

const MIDDLE_HOLES = [
  [85.725, -29.528],
  [142.875, -29.528],
];

const PLATE_MIN_X = PLATE_CENTER_X - PLATE_W / 2;
const PLATE_MAX_X = PLATE_CENTER_X + PLATE_W / 2;
const PLATE_MIN_Y = PLATE_CENTER_Y - PLATE_D / 2;
const PLATE_MAX_Y = PLATE_CENTER_Y + PLATE_D / 2;

const INNER_X_MIN = PLATE_MIN_X - PLATE_CLEARANCE;
const INNER_X_MAX = PLATE_MAX_X + PLATE_CLEARANCE;
const INNER_Y_MIN = PLATE_MIN_Y - PLATE_CLEARANCE;
const INNER_Y_MAX = PLATE_MAX_Y + PLATE_CLEARANCE;
const OUTER_X_MIN = INNER_X_MIN - WALL_THICKNESS;
const OUTER_X_MAX = INNER_X_MAX + WALL_THICKNESS;
const OUTER_Y_MIN = INNER_Y_MIN - WALL_THICKNESS;
const OUTER_Y_MAX = INNER_Y_MAX + WALL_THICKNESS;

const OUTER_W = OUTER_X_MAX - OUTER_X_MIN;
const OUTER_D = OUTER_Y_MAX - OUTER_Y_MIN;
const CENTER_X = (OUTER_X_MIN + OUTER_X_MAX) / 2;
const CENTER_Y = (OUTER_Y_MIN + OUTER_Y_MAX) / 2;

const RING_OUTER_W = PLATE_W;
const RING_OUTER_D = PLATE_D;
const RING_INNER_W = RING_OUTER_W - 2 * SUPPORT_RING_WIDTH;
const RING_INNER_D = RING_OUTER_D - 2 * SUPPORT_RING_WIDTH;

const MATING_POS = [
  [OUTER_X_MIN + WALL_THICKNESS / 2, OUTER_Y_MAX - WALL_THICKNESS / 2],
  [OUTER_X_MAX - WALL_THICKNESS / 2, OUTER_Y_MAX - WALL_THICKNESS / 2],
  [OUTER_X_MIN + WALL_THICKNESS / 2, OUTER_Y_MIN + WALL_THICKNESS / 2],
  [OUTER_X_MAX - WALL_THICKNESS / 2, OUTER_Y_MIN + WALL_THICKNESS / 2],
];

// === Floor (OUTER 풀 footprint, Z=0 ~ BC_FLOOR_THICKNESS) — cuboid ===
const floor = translate(
  [CENTER_X, CENTER_Y, BC_FLOOR_THICKNESS / 2],
  cuboid({ size: [OUTER_W, OUTER_D, BC_FLOOR_THICKNESS] }),
);

// === Perimeter 받침 ring (Z=BC_FLOOR_THICKNESS ~ PCB_BOTTOM_Z) — cuboid 차감으로 단순화 ===
const ringHeight = PCB_BOTTOM_Z - BC_FLOOR_THICKNESS;
const ringOuter = translate(
  [PLATE_CENTER_X, PLATE_CENTER_Y, BC_FLOOR_THICKNESS + ringHeight / 2],
  cuboid({ size: [RING_OUTER_W, RING_OUTER_D, ringHeight] }),
);
const ringInner = translate(
  [PLATE_CENTER_X, PLATE_CENTER_Y, BC_FLOOR_THICKNESS + ringHeight / 2],
  cuboid({ size: [RING_INNER_W, RING_INNER_D, ringHeight + 0.02] }),
);
const supportRing = subtract(ringOuter, ringInner);

// === 2 중앙 pillar (custom hole 정렬) ===
const middlePillars = MIDDLE_HOLES.map(([x, y]) =>
  translate(
    [x, y, BC_FLOOR_THICKNESS + (PCB_BOTTOM_Z - BC_FLOOR_THICKNESS) / 2],
    cylinder({
      radius: PILLAR_R,
      height: PCB_BOTTOM_Z - BC_FLOOR_THICKNESS,
      segments: 32,
    }),
  ),
);

// === 4코너 mating 계단식 원형 클리어런스 (head pocket + through) ===
const headPockets = MATING_POS.map(([x, y]) =>
  translate(
    [x, y, SCREW_HEAD_DEPTH / 2 - 0.01],
    cylinder({ radius: SCREW_HEAD_R, height: SCREW_HEAD_DEPTH, segments: 32 }),
  ),
);
const throughHoles = MATING_POS.map(([x, y]) =>
  translate(
    [x, y, SCREW_HEAD_DEPTH + (BC_FLOOR_THICKNESS - SCREW_HEAD_DEPTH) / 2],
    cylinder({
      radius: SCREW_THROUGH_R,
      height: BC_FLOOR_THICKNESS - SCREW_HEAD_DEPTH + 0.02,
      segments: 32,
    }),
  ),
);

let bottomCase = union(floor, supportRing, ...middlePillars);
bottomCase = subtract(bottomCase, ...headPockets, ...throughHoles);
bottomCase = retessellate(
  generalize({ snap: true, triangulate: false }, bottomCase),
);

const main = () => bottomCase;

module.exports = { main };
