import { booleans, extrusions, primitives, transforms } from '@jscad/modeling'
import { rect, mountHoleCuts } from './shapes'
import type { Side, Rect } from '@renderer/types'

const { subtract, union, intersect } = booleans
const { extrudeLinear } = extrusions
const { rectangle } = primitives
const { translate } = transforms

const WALL_WIDTH = 6

const sideWalls = (o: Rect, width: number) =>
    intersect(
        union(
            translate([o.cx - o.w / 2 + width / 2, o.cy, 0], rectangle({ size: [width, o.h] })),
            translate([o.cx + o.w / 2 - width / 2, o.cy, 0], rectangle({ size: [width, o.h] })),
        ),
        rect(o),
    )

export const buildSpacers2D = (side: Side, width = WALL_WIDTH) =>
    subtract(sideWalls(side.caseOutline, width), union(...mountHoleCuts(side.mountHoles)))

export const buildSpacers3D = (side: Side, thickness: number, width = WALL_WIDTH) => extrudeLinear({ height: thickness }, buildSpacers2D(side, width))
