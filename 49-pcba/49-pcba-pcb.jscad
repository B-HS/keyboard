/**
 * 49-pcba PCB 플레이스홀더 (extended plate 기준)
 */
const jscad = require('@jscad/modeling')
const { roundedRectangle } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions

const PLATE_CENTER_X = 123.825
const PLATE_CENTER_Y = -28.575

const PCB_W = 271.65
const PCB_D = 81.15
const PCB_THICKNESS = 1.6
const PCB_CORNER_R = 1

const pcb = translate(
    [PLATE_CENTER_X, PLATE_CENTER_Y, 0],
    extrudeLinear(
        { height: PCB_THICKNESS },
        roundedRectangle({ size: [PCB_W, PCB_D], roundRadius: PCB_CORNER_R, segments: 32 }),
    ),
)

const main = () => pcb

module.exports = { main }
