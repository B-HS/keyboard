import { booleans, extrusions, primitives, transforms } from '@jscad/modeling'
import { SWITCH_CUTOUT, SWITCH_CUTOUT_RADIUS, STAB_PAD, PLATE_THICKNESS } from '../config/dimensions'
import { rect, mountHoleCuts } from './shapes'
import type { Side } from '@renderer/types'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions
const { roundedRectangle } = primitives
const { translate, rotateZ } = transforms

export const buildPlate2D = (side: Side) => {
    const switchShape = roundedRectangle({ size: [SWITCH_CUTOUT, SWITCH_CUTOUT], roundRadius: SWITCH_CUTOUT_RADIUS })
    const switchCuts = side.switches.map((s) => translate([s.x, s.y, 0], switchShape))
    const stabPad = roundedRectangle({ size: [STAB_PAD.width, STAB_PAD.height], roundRadius: STAB_PAD.radius })
    const stabCuts = side.stabs.map((p) => translate([p.x, p.y, 0], p.rot ? rotateZ(p.rot, stabPad) : stabPad))
    return subtract(rect(side.caseOutline), union(...switchCuts, ...stabCuts, ...mountHoleCuts(side.mountHoles)))
}

export const buildPlate3D = (side: Side) => extrudeLinear({ height: PLATE_THICKNESS }, buildPlate2D(side))
