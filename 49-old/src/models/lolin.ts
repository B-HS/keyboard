import { primitives, transforms, booleans } from '@jscad/modeling'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import type { Bounds } from './layout'
import { caseBounds, type CaseParams } from './case'

const { cuboid } = primitives
const { translate } = transforms
const { union } = booleans

export type LolinParams = {
    pcbWidth: number
    pcbLength: number
    pcbThickness: number
    componentHeight: number
    usbcWidth: number
    usbcLength: number
    usbcHeight: number
    usbcProtrude: number
    standoffHeight: number
}

export const DEFAULT_LOLIN_PARAMS: LolinParams = {
    pcbWidth: 25.4,
    pcbLength: 34.3,
    pcbThickness: 1.6,
    componentHeight: 2.0,
    usbcWidth: 8.9,
    usbcLength: 7.5,
    usbcHeight: 3.3,
    usbcProtrude: 0,
    standoffHeight: 1.0,
}

export const buildLolin = (plateBounds: Bounds, caseP: CaseParams, p: LolinParams = DEFAULT_LOLIN_PARAMS): Geom3 => {
    const caseMaxY = caseBounds(plateBounds, caseP).maxY
    const backWallInner = caseMaxY - caseP.wallThickness

    const pcbCenterX = caseP.usbCutoutCenterX
    const pcbCenterY = backWallInner - p.pcbLength / 2
    const pcbBottomZ = caseP.bottomThickness + p.standoffHeight
    const pcbCenterZ = pcbBottomZ + p.pcbThickness / 2

    const pcb = translate(
        [pcbCenterX, pcbCenterY, pcbCenterZ],
        cuboid({ size: [p.pcbWidth, p.pcbLength, p.pcbThickness] }),
    )

    const componentsCenterZ = pcbCenterZ + p.pcbThickness / 2 + p.componentHeight / 2
    const components = translate(
        [pcbCenterX, pcbCenterY, componentsCenterZ],
        cuboid({ size: [p.pcbWidth - 4, p.pcbLength - 4, p.componentHeight] }),
    )

    const usbcCenterY = backWallInner + p.usbcProtrude - p.usbcLength / 2
    const usbcCenterZ = pcbCenterZ + p.pcbThickness / 2 + p.usbcHeight / 2
    const usbc = translate([pcbCenterX, usbcCenterY, usbcCenterZ], cuboid({ size: [p.usbcWidth, p.usbcLength, p.usbcHeight] }))

    return union(pcb, components, usbc)
}
