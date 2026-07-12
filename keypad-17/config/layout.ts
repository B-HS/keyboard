import { KEY_PITCH, CASE_MARGIN, LATERAL_CLEARANCE, MOUNT_HOLE_OUTSET } from './dimensions'
import type { Side, SwitchSpec, StabSpec, MountHole, Rect, Bbox } from '@renderer/types'

const SWITCHES: SwitchSpec[] = [
    { x: 9.525, y: -9.525, u: 1 },
    { x: 28.575, y: -9.525, u: 1 },
    { x: 47.625, y: -9.525, u: 1 },
    { x: 66.675, y: -9.525, u: 1 },
    { x: 9.525, y: -28.575, u: 1 },
    { x: 28.575, y: -28.575, u: 1 },
    { x: 47.625, y: -28.575, u: 1 },
    { x: 66.675, y: -38.1, u: 1, vSpan: 2 },
    { x: 9.525, y: -47.625, u: 1 },
    { x: 28.575, y: -47.625, u: 1 },
    { x: 47.625, y: -47.625, u: 1 },
    { x: 9.525, y: -66.675, u: 1 },
    { x: 28.575, y: -66.675, u: 1 },
    { x: 47.625, y: -66.675, u: 1 },
    { x: 66.675, y: -76.2, u: 1, vSpan: 2 },
    { x: 19.05, y: -85.725, u: 2 },
    { x: 47.625, y: -85.725, u: 1 },
]

const STABS: StabSpec[] = [
    { x: 66.055, y: -26.162, rot: 90 },
    { x: 66.055, y: -50.038, rot: 90 },
    { x: 66.055, y: -64.262, rot: 90 },
    { x: 66.055, y: -88.138, rot: 90 },
    { x: 7.112, y: -86.345 },
    { x: 30.988, y: -86.345 },
]

const computeBbox = (switches: SwitchSpec[]): Bbox => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const s of switches) {
        const halfW = (s.u * KEY_PITCH) / 2
        const halfH = ((s.vSpan ?? 1) * KEY_PITCH) / 2
        minX = Math.min(minX, s.x - halfW)
        maxX = Math.max(maxX, s.x + halfW)
        minY = Math.min(minY, s.y - halfH)
        maxY = Math.max(maxY, s.y + halfH)
    }
    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}

const expandedRect = (bbox: Bbox, margin: number): Rect => ({ cx: bbox.cx, cy: bbox.cy, w: bbox.w + 2 * margin, h: bbox.h + 2 * margin })

const computeMountHoles = (bbox: Bbox): MountHole[] => {
    const left = bbox.minX - MOUNT_HOLE_OUTSET
    const right = bbox.maxX + MOUNT_HOLE_OUTSET
    const top = bbox.maxY + MOUNT_HOLE_OUTSET
    const bottom = bbox.minY - MOUNT_HOLE_OUTSET
    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
        { x: left, y: bbox.cy },
        { x: right, y: bbox.cy },
    ]
}

const buildSide = (): Side => {
    const bbox = computeBbox(SWITCHES)
    return {
        label: 'keypad-17',
        switches: SWITCHES,
        stabs: STABS,
        bbox,
        caseOutline: expandedRect(bbox, CASE_MARGIN),
        opening: expandedRect(bbox, LATERAL_CLEARANCE),
        mountHoles: computeMountHoles(bbox),
    }
}

export const SIDE = buildSide()
