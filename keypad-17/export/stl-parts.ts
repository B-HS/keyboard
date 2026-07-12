import { measurements, transforms, type Geom3 } from '@jscad/modeling'
import { SIDE } from '../config/layout'
import { buildTop3D, buildPlate3D, buildBottom3D } from '../parts/case'

const { measureBoundingBox } = measurements
const { rotateX, translate, scale } = transforms

const flipZ = (geom: Geom3) => rotateX(Math.PI, geom)

const dropToBed = (geom: Geom3) => {
    const [min] = measureBoundingBox(geom)
    return translate([0, 0, -min[2]], geom)
}

export type PrintPart = { name: string; geom: Geom3 }

export const buildPrintParts = (scaleFactor: number): PrintPart[] => {
    const parts = [
        { name: 'top', geom: dropToBed(flipZ(buildTop3D(SIDE))) },
        { name: 'plate', geom: dropToBed(buildPlate3D(SIDE)) },
        { name: 'bottom', geom: dropToBed(buildBottom3D(SIDE)) },
    ]
    return parts.map((p) => ({ name: p.name, geom: scaleFactor === 1 ? p.geom : scale([scaleFactor, scaleFactor, scaleFactor], p.geom) }))
}
