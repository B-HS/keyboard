import { KEY_PITCH, CASE_MARGIN, LATERAL_CLEARANCE, MOUNT_HOLE_INSET_FROM_EDGE } from './dimensions'
import type { Side, SwitchSpec, StabSpec, MountHole, Rect, Bbox } from '@renderer/types'

const LEFT_SWITCHES: SwitchSpec[] = [
    { x: 0, y: 0, u: 1 },
    { x: 19.05, y: 0, u: 1 },
    { x: 38.1, y: 0, u: 1 },
    { x: 57.15, y: 0, u: 1 },
    { x: 76.2, y: 0, u: 1 },
    { x: 95.25, y: 0, u: 1 },
    { x: 114.3, y: 0, u: 1 },
    { x: 0, y: -19.05, u: 1 },
    { x: 19.05, y: -19.05, u: 1 },
    { x: 38.1, y: -19.05, u: 1 },
    { x: 57.15, y: -19.05, u: 1 },
    { x: 76.2, y: -19.05, u: 1 },
    { x: 95.25, y: -19.05, u: 1 },
    { x: 114.3, y: -19.05, u: 1 },
    { x: 2.381, y: -38.1, u: 1.25 },
    { x: 23.813, y: -38.1, u: 1 },
    { x: 42.863, y: -38.1, u: 1 },
    { x: 61.913, y: -38.1, u: 1 },
    { x: 80.963, y: -38.1, u: 1 },
    { x: 100.013, y: -38.1, u: 1 },
    { x: 7.144, y: -57.15, u: 1.75 },
    { x: 33.338, y: -57.15, u: 1 },
    { x: 52.388, y: -57.15, u: 1 },
    { x: 71.438, y: -57.15, u: 1 },
    { x: 90.488, y: -57.15, u: 1 },
    { x: 109.538, y: -57.15, u: 1 },
    { x: 0, y: -76.2, u: 1 },
    { x: 19.05, y: -76.2, u: 1 },
    { x: 40.481, y: -76.2, u: 1.25 },
    { x: 92.869, y: -76.2, u: 2.75 },
]

const LEFT_STABS: StabSpec[] = [
    { x: 80.931, y: -77.7 },
    { x: 104.807, y: -77.7 },
]

const RIGHT_SWITCHES: SwitchSpec[] = [
    { x: 0, y: 0, u: 1 },
    { x: 19.05, y: 0, u: 1 },
    { x: 38.1, y: 0, u: 1 },
    { x: 57.15, y: 0, u: 1 },
    { x: 76.2, y: 0, u: 1 },
    { x: 95.25, y: 0, u: 1 },
    { x: 114.3, y: 0, u: 1 },
    { x: 133.35, y: 0, u: 1 },
    { x: 9.525, y: -19.05, u: 1 },
    { x: 28.575, y: -19.05, u: 1 },
    { x: 47.625, y: -19.05, u: 1 },
    { x: 66.675, y: -19.05, u: 1 },
    { x: 85.725, y: -19.05, u: 1 },
    { x: 104.775, y: -19.05, u: 1 },
    { x: 128.588, y: -19.05, u: 1.5 },
    { x: 14.288, y: -38.1, u: 1 },
    { x: 33.338, y: -38.1, u: 1 },
    { x: 52.388, y: -38.1, u: 1 },
    { x: 71.438, y: -38.1, u: 1 },
    { x: 90.488, y: -38.1, u: 1 },
    { x: 109.538, y: -38.1, u: 1 },
    { x: 130.969, y: -38.1, u: 1.25 },
    { x: 0, y: -57.15, u: 1 },
    { x: 19.05, y: -57.15, u: 1 },
    { x: 38.1, y: -57.15, u: 1 },
    { x: 57.15, y: -57.15, u: 1 },
    { x: 76.2, y: -57.15, u: 1 },
    { x: 95.25, y: -57.15, u: 1 },
    { x: 123.825, y: -57.15, u: 2 },
    { x: 16.669, y: -76.2, u: 2.75 },
    { x: 54.769, y: -76.2, u: 1.25 },
    { x: 76.2, y: -76.2, u: 1 },
    { x: 95.25, y: -76.2, u: 1 },
    { x: 114.3, y: -76.2, u: 1 },
    { x: 133.35, y: -76.2, u: 1 },
]

const RIGHT_STABS: StabSpec[] = [
    { x: 111.887, y: -58.65 },
    { x: 135.763, y: -58.65 },
    { x: 4.731, y: -77.7 },
    { x: 28.607, y: -77.7 },
]

const computeBbox = (switches: SwitchSpec[]): Bbox => {
    const half = KEY_PITCH / 2
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const s of switches) {
        const halfW = (s.u * KEY_PITCH) / 2
        minX = Math.min(minX, s.x - halfW)
        maxX = Math.max(maxX, s.x + halfW)
        minY = Math.min(minY, s.y - half)
        maxY = Math.max(maxY, s.y + half)
    }
    return { minX, maxX, minY, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2, w: maxX - minX, h: maxY - minY }
}

const expandedRect = (bbox: Bbox, margin: number): Rect => ({ cx: bbox.cx, cy: bbox.cy, w: bbox.w + 2 * margin, h: bbox.h + 2 * margin })

const computeMountHoles = (bbox: Bbox): MountHole[] => {
    const inset = CASE_MARGIN - MOUNT_HOLE_INSET_FROM_EDGE
    const left = bbox.minX - inset
    const right = bbox.maxX + inset
    const top = bbox.maxY + inset
    const bottom = bbox.minY - inset
    return [
        { x: left, y: top },
        { x: right, y: top },
        { x: left, y: bottom },
        { x: right, y: bottom },
        { x: left, y: bbox.cy },
        { x: right, y: bbox.cy },
    ]
}

const buildSide = (label: string, switches: SwitchSpec[], stabs: StabSpec[]): Side => {
    const bbox = computeBbox(switches)
    return {
        label,
        switches,
        stabs,
        bbox,
        caseOutline: expandedRect(bbox, CASE_MARGIN),
        opening: expandedRect(bbox, LATERAL_CLEARANCE),
        mountHoles: computeMountHoles(bbox),
    }
}

export const SIDES: Record<'left' | 'right', Side> = {
    left: buildSide('left', LEFT_SWITCHES, LEFT_STABS),
    right: buildSide('right', RIGHT_SWITCHES, RIGHT_STABS),
}
