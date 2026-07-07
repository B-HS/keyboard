import { booleans, extrusions, measurements, transforms, type Geom3 } from '@jscad/modeling'
import type { Side } from '@renderer/types'
import { SIDES } from '../config/layout'
import { buildTopFdm3D, buildBottomFdm3D, fdmOutline } from '../parts/case-fdm'
import { rect, mountHoleCuts } from '../parts/shapes'
import { PCB_THICKNESS, PCB_MOUNT_HOLE_FDM } from '../config/dimensions'

const { subtract, union } = booleans
const { extrudeLinear } = extrusions
const { measureBoundingBox } = measurements
const { rotateX, translate, scale } = transforms

const flipZ = (geom: Geom3) => rotateX(Math.PI, geom)

const dropToBed = (geom: Geom3) => {
    const [min] = measureBoundingBox(geom)
    return translate([0, 0, -min[2]], geom)
}

const buildMockPcb3D = (side: Side) =>
    extrudeLinear({ height: PCB_THICKNESS }, subtract(rect(fdmOutline(side)), union(...mountHoleCuts(side.mountHoles, PCB_MOUNT_HOLE_FDM))))

export type PrintPart = { name: string; geom: Geom3 }

export const buildPrintParts = (scaleFactor: number): PrintPart[] =>
    (Object.keys(SIDES) as (keyof typeof SIDES)[]).flatMap((key) => {
        const side = SIDES[key]
        const parts = [
            { name: `${key}-top`, geom: dropToBed(flipZ(buildTopFdm3D(side))) },
            { name: `${key}-bottom`, geom: dropToBed(buildBottomFdm3D(side)) },
            { name: `${key}-mock-pcb`, geom: dropToBed(buildMockPcb3D(side)) },
        ]
        return parts.map((p) => ({ name: p.name, geom: scaleFactor === 1 ? p.geom : scale([scaleFactor, scaleFactor, scaleFactor], p.geom) }))
    })
