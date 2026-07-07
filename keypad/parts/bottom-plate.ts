import { booleans, extrusions } from '@jscad/modeling'
import { BOTTOM_THICKNESS } from '../config/dimensions'
import { rect, mountHoleCuts } from './shapes'
import type { Side } from '@renderer/types'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions

export const buildBottom2D = (side: Side) => subtract(rect(side.caseOutline), union(...mountHoleCuts(side.mountHoles)))

export const buildBottom3D = (side: Side) => extrudeLinear({ height: BOTTOM_THICKNESS }, buildBottom2D(side))
