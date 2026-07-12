import { primitives, transforms } from '@jscad/modeling'
import { OUTLINE_RADIUS } from '../config/dimensions'
import type { Rect } from '@renderer/types'

const { roundedRectangle } = primitives
const { translate } = transforms

export const rect = ({ cx, cy, w, h }: Rect, radius = OUTLINE_RADIUS) =>
    translate([cx, cy, 0], roundedRectangle({ size: [w, h], roundRadius: radius }))
