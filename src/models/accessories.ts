import { primitives, transforms, booleans } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
const { subtract } = booleans
import type { Bounds, KeyPos } from './layout'
import { caseBounds, batteryCoverOpening, coverMagnetCenters, MAGNET_SIZE_X, MAGNET_SIZE_Y, MAGNET_HEIGHT, COVER_THICKNESS, type CaseParams } from './case'
import { DEFAULT_STAB, U } from './layout'

const { cuboid, cylinder, torus, sphere } = primitives
const { translate, rotateY } = transforms
const { union } = booleans

export const buildPerfBoard = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const width = 50
    const length = 40
    const thickness = 1.6

    const cb = caseBounds(plateBounds, caseP)
    const innerXMin = cb.minX + caseP.wallThickness
    const backWallInner = cb.maxY - caseP.wallThickness
    const lolinLength = 34.3
    const bossClearance = caseP.cornerBossSize + 2
    const centerX = innerXMin + bossClearance + width / 2
    const centerY = backWallInner - lolinLength - length / 2 - 2
    const bottomZ = caseP.bottomThickness
    const centerZ = bottomZ + thickness / 2

    return translate([centerX, centerY, centerZ], cuboid({ size: [width, length, thickness] }))
}

export const buildSlideSwitch = (_plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const bodyL = 6.8
    const bodyW = 2.8
    const bodyH = 2.7
    const handleL = 2
    const handleW = 1.5
    const handleH = 1.5

    const centerX = caseP.slideSwitchX
    const centerY = caseP.slideSwitchY
    const bodyBottomZ = caseP.slideSwitchZ
    const bodyCenterZ = bodyBottomZ + bodyH / 2

    const body = translate([centerX, centerY, bodyCenterZ], cuboid({ size: [bodyL, bodyW, bodyH] }))
    const handle = translate(
        [centerX, centerY, bodyBottomZ - handleH / 2],
        cuboid({ size: [handleL, handleW, handleH] }),
    )
    return union(body, handle)
}

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

export const buildBatteries = (caseP: CaseParams): Geom3 => {
    const slot = caseP.batteryLength
    const gap = caseP.batteryGapLength
    const radius = caseP.batteryDiameter / 2
    const zCenter = caseP.bottomThickness + radius + caseP.batterySlotTolerance
    const nippleRadius = 1.9
    const nippleLength = 1

    const parts: Geom3[] = []
    for (let i = 0; i < 3; i++) {
        const xStart = caseP.batteryTrayXStart + i * (slot + gap)
        const xCenter = xStart + slot / 2

        const body = translate(
            [xCenter, caseP.batteryTrayYCenter, zCenter],
            rotateY(Math.PI / 2, cylinder({ radius, height: slot })),
        )
        parts.push(body)

        const nippleX = xStart + slot + nippleLength / 2
        const nipple = translate(
            [nippleX, caseP.batteryTrayYCenter, zCenter],
            rotateY(Math.PI / 2, cylinder({ radius: nippleRadius, height: nippleLength })),
        )
        parts.push(nipple)
    }
    return union(...parts)
}

const springCoil = (xEnd: number, y: number, z: number, direction: 1 | -1, length: number): Geom3 => {
    const coilCount = 4
    const coilOuter = 2.3
    const coilInner = 0.3
    const spacing = length / coilCount
    const coils: Geom3[] = []
    for (let i = 0; i < coilCount; i++) {
        const x = xEnd + direction * (spacing / 2 + i * spacing)
        coils.push(
            translate(
                [x, y, z],
                rotateY(Math.PI / 2, torus({ innerRadius: coilInner, outerRadius: coilOuter, innerSegments: 12, outerSegments: 20 })),
            ),
        )
    }
    return union(...coils)
}

const domContact = (x: number, y: number, z: number): Geom3 => {
    const base = translate([x, y, z], rotateY(Math.PI / 2, cylinder({ radius: 3, height: 0.5 })))
    const dome = translate([x, y, z], sphere({ radius: 1.8, segments: 16 }))
    return union(base, dome)
}

export const buildBatteryContacts = (caseP: CaseParams): Geom3 => {
    const slot = caseP.batteryLength
    const gap = caseP.batteryGapLength
    const zCenter = caseP.bottomThickness + caseP.batteryDiameter / 2 + caseP.batterySlotTolerance
    const y = caseP.batteryTrayYCenter

    const parts: Geom3[] = []

    parts.push(domContact(caseP.batteryTrayXStart - 0.25, y, zCenter))

    const rightX = caseP.batteryTrayXStart + 3 * slot + 2 * gap + 0.25
    parts.push(springCoil(rightX, y, zCenter, -1, 5))

    return union(...parts)
}

export const buildCaseMagnets = (caseP: CaseParams): Geom3 => {
    const zCenter = COVER_THICKNESS + MAGNET_HEIGHT + MAGNET_HEIGHT / 2
    const magnets = coverMagnetCenters(caseP).map(([mx, my]) =>
        translate(
            [mx, my, zCenter],
            cuboid({ size: [MAGNET_SIZE_X, MAGNET_SIZE_Y, MAGNET_HEIGHT] }),
        ),
    )
    return union(...magnets)
}

export const buildCoverMagnets = (caseP: CaseParams): Geom3 => {
    const zCenter = COVER_THICKNESS + MAGNET_HEIGHT / 2
    const magnets = coverMagnetCenters(caseP).map(([mx, my]) =>
        translate(
            [mx, my, zCenter],
            cuboid({ size: [MAGNET_SIZE_X, MAGNET_SIZE_Y, MAGNET_HEIGHT] }),
        ),
    )
    return union(...magnets)
}

export const buildBatteryCover = (caseP: CaseParams): Geom3 => {
    const o = batteryCoverOpening(caseP)
    const clearance = 0.15
    const xStart = o.xStart + clearance
    const xEnd = o.xEnd - clearance
    const yStart = o.yStart + clearance
    const yEnd = o.yEnd - clearance

    const zBottom = 0
    const zTop = COVER_THICKNESS
    const cx = (xStart + xEnd) / 2
    const cy = (yStart + yEnd) / 2
    const cz = (zBottom + zTop) / 2
    const width = xEnd - xStart
    const length = yEnd - yStart

    const plate = translate([cx, cy, cz], cuboid({ size: [width, length, COVER_THICKNESS] }))

    const fingerHoleRadius = 4
    const fingerHole = translate(
        [cx, cy, cz],
        cylinder({ radius: fingerHoleRadius, height: COVER_THICKNESS + 0.02, segments: 48 }),
    )

    return subtract(plate, fingerHole)
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
