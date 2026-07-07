import { KEY_PITCH, CASE_MARGIN, LATERAL_CLEARANCE, MOUNT_HOLE_INSET_FROM_EDGE } from './dimensions'
import type { Side, SwitchSpec, StabSpec, Bbox } from '@renderer/types'

const SWITCHES: SwitchSpec[] = [
    { x: 0, y: 0, u: 1 },
    { x: 19.05, y: 0, u: 1 },
    { x: 38.1, y: 0, u: 1 },
    { x: 57.15, y: 0, u: 1 },
    { x: 0, y: -19.05, u: 1 },
    { x: 19.05, y: -19.05, u: 1 },
    { x: 38.1, y: -19.05, u: 1 },
    { x: 57.15, y: -19.05, u: 1 },
    { x: 0, y: -38.1, u: 1 },
    { x: 19.05, y: -38.1, u: 1 },
    { x: 38.1, y: -38.1, u: 1 },
    { x: 57.15, y: -38.1, u: 1 },
    { x: 0, y: -57.15, u: 1 },
    { x: 19.05, y: -57.15, u: 1 },
    { x: 38.1, y: -57.15, u: 1 },
    { x: 57.15, y: -57.15, u: 1 },
    { x: 9.525, y: -76.2, u: 2 },
    { x: 38.1, y: -76.2, u: 1 },
    { x: 57.15, y: -76.2, u: 1 },
]

const STABS: StabSpec[] = [
    { x: -2.413, y: -77.7, rot: 0 },
    { x: 21.463, y: -77.7, rot: 0 },
]

const computeBbox = (switches: SwitchSpec[]) => {
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

const expandedRect = (bbox: Bbox, margin: number) => ({ cx: bbox.cx, cy: bbox.cy, w: bbox.w + 2 * margin, h: bbox.h + 2 * margin })

const computeMountHoles = (bbox: Bbox) => {
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

const buildSide = (label: string, switches: SwitchSpec[], stabs: StabSpec[]) => {
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

export const SIDES: Record<string, Side> = {
    main: buildSide('main', SWITCHES, STABS),
}
