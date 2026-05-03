/**
 * 49-pcba PCB 플레이스홀더
 * 모든 형상 상수는 shared/config/keyboard.ts 의 KEYBOARD_GEOMETRY 에서 주입.
 */
const jscad = require('@jscad/modeling')
const { roundedRectangle } = jscad.primitives
const { translate } = jscad.transforms
const { extrudeLinear } = jscad.extrusions

const G = KEYBOARD_GEOMETRY

const pcb = translate(
    [G.plateCenterX, G.plateCenterY, 0],
    extrudeLinear(
        { height: G.pcbThickness },
        roundedRectangle({
            size: [G.plateWidth, G.plateDepth],
            roundRadius: G.pcbCornerRadius,
            segments: 32,
        }),
    ),
)

const main = () => pcb

module.exports = { main }
