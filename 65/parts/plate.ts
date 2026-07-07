import { booleans, extrusions, primitives, transforms } from '@jscad/modeling'
import { SWITCH_CUTOUT, SWITCH_CUTOUT_RADIUS, STAB_PAD, PLATE_THICKNESS } from '../config/dimensions'
import { rect, mountHoleCuts } from './shapes'
import type { Side } from '@renderer/types'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions
const { roundedRectangle } = primitives
const { translate } = transforms

export const buildPlate2D = (side: Side, cutout = SWITCH_CUTOUT, stab = STAB_PAD) => {
    const switchShape = roundedRectangle({ size: [cutout, cutout], roundRadius: SWITCH_CUTOUT_RADIUS })
    const switchCuts = side.switches.map((s) => translate([s.x, s.y, 0], switchShape))
    const stabCuts = side.stabs.map((p) => translate([p.x, p.y, 0], roundedRectangle({ size: [stab.width, stab.height], roundRadius: stab.radius })))
    return subtract(rect(side.caseOutline), union(...switchCuts, ...stabCuts, ...mountHoleCuts(side.mountHoles)))
}

export const buildPlate3D = (side: Side) => extrudeLinear({ height: PLATE_THICKNESS }, buildPlate2D(side))
