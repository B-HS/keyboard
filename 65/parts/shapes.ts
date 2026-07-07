import { primitives, transforms } from '@jscad/modeling'
import { OUTLINE_RADIUS, MOUNT_HOLE_DIAMETER } from '../config/dimensions'
import type { Rect, MountHole } from '@renderer/types'

const { roundedRectangle, circle } = primitives
const { translate } = transforms

export const rect = ({ cx, cy, w, h }: Rect, radius = OUTLINE_RADIUS) =>
    translate([cx, cy, 0], roundedRectangle({ size: [w, h], roundRadius: radius }))

export const mountHoleCuts = (holes: MountHole[], diameter = MOUNT_HOLE_DIAMETER) =>
    holes.map((h) => translate([h.x, h.y, 0], circle({ radius: diameter / 2, segments: 48 })))
