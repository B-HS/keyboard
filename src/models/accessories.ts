import { primitives, transforms, booleans } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import type { Bounds, KeyPos } from './layout'
import { caseBounds, type CaseParams } from './case'
import { U } from './layout'

const { cuboid, cylinder, torus, sphere } = primitives
const { translate, rotateY } = transforms
const { union } = booleans

export const buildPerfBoard = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const width = 50
    const length = 40
    const thickness = 1.6

    const backWallInner = caseBounds(plateBounds, caseP).maxY - caseP.wallThickness
    const lolinLength = 34.3
    const centerX = caseP.usbCutoutCenterX
    const centerY = backWallInner - lolinLength - length / 2 - 2
    const bottomZ = caseP.bottomThickness
    const centerZ = bottomZ + thickness / 2

    return translate([centerX, centerY, centerZ], cuboid({ size: [width, length, thickness] }))
}

export const buildSlideSwitch = (_plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const bodyL = 6.8
    const bodyW = 2.8
    const bodyH = 2.7
    const handleW = 1.5
    const handleL = 2
    const handleH = 1.5

    const centerX = caseP.slideSwitchX
    const centerY = caseP.slideSwitchY
    const bodyBottomZ = caseP.bottomThickness
    const bodyCenterZ = bodyBottomZ + bodyH / 2

    const body = translate([centerX, centerY, bodyCenterZ], cuboid({ size: [bodyL, bodyW, bodyH] }))
    const handle = translate(
        [centerX, centerY, bodyBottomZ - handleH / 2],
        cuboid({ size: [handleL, handleW, handleH] }),
    )
    return union(body, handle)
}

export const buildStabilizers = (keys: KeyPos[]): Geom3 => {
    const stabSet = new Set([2, 2.75])
    const stabOffset = 11.938 / 2
    const stemRadius = 1.75
    const stemHeight = 6

    const cylinders: Geom3[] = []
    for (const k of keys) {
        if (!stabSet.has(k.w)) continue
        const offset = k.w === 2 ? stabOffset : k.w === 2.75 ? 11.938 / 2 : 0
        const y = k.cy - 1.5
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

const contactPlate = (xCenter: number, y: number, zBottom: number, length: number): Geom3 => {
    return translate([xCenter, y, zBottom + 0.25], cuboid({ size: [length, 8, 0.5] }))
}

export const buildBatteryContacts = (caseP: CaseParams): Geom3 => {
    const slot = caseP.batteryLength
    const gap = caseP.batteryGapLength
    const zCenter = caseP.bottomThickness + caseP.batteryDiameter / 2 + caseP.batterySlotTolerance
    const zPlate = caseP.bottomThickness + 0.1
    const y = caseP.batteryTrayYCenter

    const parts: Geom3[] = []

    parts.push(domContact(caseP.batteryTrayXStart - 0.25, y, zCenter))

    for (let i = 0; i < 2; i++) {
        const prevBatteryPlusX = caseP.batteryTrayXStart + (i + 1) * slot + i * gap
        const nextBatteryMinusX = prevBatteryPlusX + gap
        const plateCenter = (prevBatteryPlusX + nextBatteryMinusX) / 2

        parts.push(contactPlate(plateCenter, y, zPlate, gap - 1))
        parts.push(springCoil(prevBatteryPlusX + 0.3, y, zCenter, 1, gap / 2 - 0.5))
        parts.push(domContact(nextBatteryMinusX - 0.25, y, zCenter))
    }

    const rightX = caseP.batteryTrayXStart + 3 * slot + 2 * gap + 0.25
    parts.push(springCoil(rightX, y, zCenter, -1, 5))

    return union(...parts)
}

export const buildBatteryCover = (caseP: CaseParams): Geom3 => {
    const slot = caseP.batteryLength
    const gap = caseP.batteryGapLength
    const xStart = caseP.batteryTrayXStart - caseP.batteryEndWallThickness
    const xEnd = caseP.batteryTrayXStart + 3 * slot + 2 * gap + caseP.batteryEndWallThickness
    const cx = (xStart + xEnd) / 2

    const clearance = 0.2
    const lipOverhang = 0.7
    const railStepZ = 1.2

    const bodyWidth = xEnd - xStart - clearance * 2
    const bodyLength = caseP.batteryTrayYWidth + 1 - clearance * 2
    const bodyThickness = railStepZ - 0.1
    const bodyCenterZ = 0.1 + bodyThickness / 2

    const body = translate(
        [cx, caseP.batteryTrayYCenter, bodyCenterZ],
        cuboid({ size: [bodyWidth, bodyLength, bodyThickness] }),
    )

    const lipLength = bodyLength + lipOverhang * 2
    const lipThickness = caseP.bottomThickness - railStepZ - 0.1
    const lipCenterZ = railStepZ + lipThickness / 2
    const lip = translate(
        [cx, caseP.batteryTrayYCenter, lipCenterZ],
        cuboid({ size: [bodyWidth, lipLength, lipThickness] }),
    )

    const grip = translate(
        [xEnd - clearance - 1.5, caseP.batteryTrayYCenter, bodyCenterZ - bodyThickness / 2 - 0.5],
        cuboid({ size: [3, bodyLength - 2, 1.0] }),
    )

    const ridgeHeight = 2.5
    const ridgeWidth = Math.min(caseP.batteryGapLength - 2, 4.5)
    const ridgeLength = bodyLength - 2
    const ridgeZCenter = railStepZ + lipThickness + ridgeHeight / 2
    const ridges: Geom3[] = []
    for (let i = 0; i < 2; i++) {
        const gapCenterX =
            caseP.batteryTrayXStart +
            (i + 1) * caseP.batteryLength +
            i * caseP.batteryGapLength +
            caseP.batteryGapLength / 2
        ridges.push(
            translate(
                [gapCenterX, caseP.batteryTrayYCenter, ridgeZCenter],
                cuboid({ size: [ridgeWidth, ridgeLength, ridgeHeight] }),
            ),
        )
    }

    return union(body, lip, grip, ...ridges)
}

export const buildFootPads = (plateBounds: Bounds, caseP: CaseParams): Geom3 => {
    const radius = 3
    const height = 2
    const inset = 8

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
