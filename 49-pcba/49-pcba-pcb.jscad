/**
 * 49-pcba PCB 플레이스홀더 (extended plate 기준)
 */
const jscad = require('@jscad/modeling')
const { roundedRectangle, cylinder } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions
const { subtract } = jscad.booleans

const PLATE_CENTER_X = 123.825
const PLATE_CENTER_Y = -29.575

const PCB_W = 271.55
const PCB_D = 83.05
const PCB_THICKNESS = 1.6
const PCB_CORNER_R = 1

const MOUNT_HOLE_R = 1.6
const MOUNT_HOLES = [
    [85.725, -29.528],
    [142.875, -29.528],
]

const pcbBody = translate(
    [PLATE_CENTER_X, PLATE_CENTER_Y, 0],
    extrudeLinear(
        { height: PCB_THICKNESS },
        roundedRectangle({ size: [PCB_W, PCB_D], roundRadius: PCB_CORNER_R, segments: 32 }),
    ),
)

const mountHoles = MOUNT_HOLES.map(([x, y]) =>
    translate(
        [x, y, PCB_THICKNESS / 2],
        cylinder({ radius: MOUNT_HOLE_R, height: PCB_THICKNESS + 0.02, segments: 16 }),
    ),
)

const pcb = subtract(pcbBody, ...mountHoles)

const main = () => pcb

module.exports = { main }
