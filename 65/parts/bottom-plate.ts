import { booleans, extrusions } from '@jscad/modeling'
import { BOTTOM_THICKNESS, MOUNT_HOLE_DIAMETER } from '../config/dimensions'
import { rect, mountHoleCuts } from './shapes'
import type { Side } from '@renderer/types'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions

export const buildBottom2D = (side: Side, holeDiameter = MOUNT_HOLE_DIAMETER) =>
    subtract(rect(side.caseOutline), union(...mountHoleCuts(side.mountHoles, holeDiameter)))

export const buildBottom3D = (side: Side) => extrudeLinear({ height: BOTTOM_THICKNESS }, buildBottom2D(side))
