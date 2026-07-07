import { booleans, extrusions, geometries, primitives, transforms } from '@jscad/modeling'
import { TOP_FRAME_THICKNESS, KEY_PITCH, KEYCAP_GAP, LATERAL_CLEARANCE } from '../config/dimensions'
import { rect } from './shapes'
import type { Vec2 } from '@jscad/modeling'
import type { Side } from '@renderer/types'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions
const { geom2 } = geometries
const { rectangle } = primitives
const { translate } = transforms

const GAP_FILLET = 1.0
const ARC_SEGMENTS = 8

const cellHeight = KEY_PITCH - KEYCAP_GAP + 2 * LATERAL_CLEARANCE
const cellWidth = (u: number) => u * KEY_PITCH - KEYCAP_GAP + 2 * LATERAL_CLEARANCE

const filletCorner = (prev: Vec2, cur: Vec2, next: Vec2, radius: number) => {
    const toPrev: Vec2 = [prev[0] - cur[0], prev[1] - cur[1]]
    const toNext: Vec2 = [next[0] - cur[0], next[1] - cur[1]]
    const lenPrev = Math.hypot(toPrev[0], toPrev[1])
    const lenNext = Math.hypot(toNext[0], toNext[1])
    if (lenPrev < 1e-6 || lenNext < 1e-6) return [cur]
    const dirPrev: Vec2 = [toPrev[0] / lenPrev, toPrev[1] / lenPrev]
    const dirNext: Vec2 = [toNext[0] / lenNext, toNext[1] / lenNext]
    const dot = Math.max(-1, Math.min(1, dirPrev[0] * dirNext[0] + dirPrev[1] * dirNext[1]))
    const half = Math.acos(dot) / 2
    if (half < 1e-3 || Math.PI / 2 - half < 1e-3) return [cur]
    const dist = Math.min(radius / Math.tan(half), lenPrev * 0.49, lenNext * 0.49)
    const r = dist * Math.tan(half)
    const bis: Vec2 = [dirPrev[0] + dirNext[0], dirPrev[1] + dirNext[1]]
    const bisLen = Math.hypot(bis[0], bis[1])
    if (bisLen < 1e-6) return [cur]
    const center: Vec2 = [cur[0] + (bis[0] / bisLen) * (r / Math.sin(half)), cur[1] + (bis[1] / bisLen) * (r / Math.sin(half))]
    const t1: Vec2 = [cur[0] + dirPrev[0] * dist, cur[1] + dirPrev[1] * dist]
    const t2: Vec2 = [cur[0] + dirNext[0] * dist, cur[1] + dirNext[1] * dist]
    const a1 = Math.atan2(t1[1] - center[1], t1[0] - center[0])
    const a2 = Math.atan2(t2[1] - center[1], t2[0] - center[0])
    let da = a2 - a1
    while (da > Math.PI) da -= 2 * Math.PI
    while (da < -Math.PI) da += 2 * Math.PI
    const steps = Math.max(1, Math.ceil((Math.abs(da) / Math.PI) * ARC_SEGMENTS))
    const arc: Vec2[] = []
    for (let s = 0; s <= steps; s++) {
        const a = a1 + da * (s / steps)
        arc.push([center[0] + r * Math.cos(a), center[1] + r * Math.sin(a)])
    }
    return arc
}

const filletOutline = (outline: Vec2[], radius: number) => {
    const n = outline.length
    const result: Vec2[] = []
    for (let i = 0; i < n; i++) {
        const prev = outline[(i - 1 + n) % n]!
        const cur = outline[i]!
        const next = outline[(i + 1) % n]!
        for (const p of filletCorner(prev, cur, next, radius)) result.push(p)
    }
    return result
}

export const buildOpening = (side: Side) => {
    const cells = union(...side.switches.map((s) => translate([s.x, s.y, 0], rectangle({ size: [cellWidth(s.u), cellHeight] }))))
    return union(...geom2.toOutlines(cells).map((outline) => geom2.fromPoints(filletOutline(outline, GAP_FILLET))))
}

export const buildTopFrame2D = (side: Side, outline = side.caseOutline) => subtract(rect(outline), buildOpening(side))

export const buildTopFrame3D = (side: Side) => extrudeLinear({ height: TOP_FRAME_THICKNESS }, buildTopFrame2D(side))
