import { primitives, transforms, booleans } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import type { Bounds, KeyPos } from './layout'
import { caseBounds, type CaseParams } from './case'
import { DEFAULT_STAB, U } from './layout'

const { cuboid, cylinder } = primitives
const { translate } = transforms
const { union } = booleans

export const buildStabilizers = (keys: KeyPos[]): Geom3 => {
    const stemRadius = 1.75
    const stemHeight = 6
    const padOffsetY = DEFAULT_STAB.padOffsetY

    const cylinders: Geom3[] = []
    for (const k of keys) {
        const offset = DEFAULT_STAB.spacingByWidth[k.w]
        if (offset === undefined) continue
        const y = k.cy + padOffsetY
        const leftStem = translate(
            [k.cx - offset, y, stemHeight / 2],
            cylinder({ radius: stemRadius, height: stemHeight }),
        )
        const rightStem = translate(
            [k.cx + offset, y, stemHeight / 2],
            cylinder({ radius: stemRadius, height: stemHeight }),
        )
        cylinders.push(leftStem, rightStem)
    }
    return cylinders.length > 0 ? union(...cylinders) : cylinders[0]
}

export const buildKeycaps = (keys: KeyPos[]): Geom3 => {
    const height = 8
    const topInset = 3
    const caps: Geom3[] = []
    for (const k of keys) {
        const bottomW = k.w * U - 1
        const bottomH = k.h * U - 1
        const topW = bottomW - topInset * 2
        const topH = bottomH - topInset * 2
        const avgW = (bottomW + topW) / 2
        const avgH = (bottomH + topH) / 2
        caps.push(
            translate(
                [k.cx, k.cy, height / 2],
                cuboid({ size: [avgW, avgH, height] }),
            ),
        )
    }
    return union(...caps)
}

export const buildFootPads = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const radius = 3
    const height = 2
    const inset = 5

    const cb = caseBounds(plateBounds, caseP)
    const positions: Array<[number, number]> = [
        [cb.minX + inset, cb.minY + inset],
        [cb.maxX - inset, cb.minY + inset],
        [cb.minX + inset, cb.maxY - inset],
        [cb.maxX - inset, cb.maxY - inset],
    ]
    const zCenter = -height / 2
    const pads = positions.map(([x, y]) =>
        translate([x, y, zCenter], cylinder({ radius, height })),
    )
    return union(...pads)
}
