import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import stlSerializer from '@jscad/stl-serializer'
import { transforms, measurements } from '@jscad/modeling'
import { SIDES } from '../config/layout'
import { buildTopFdm3D, buildPlateFdm3D, buildBottomFdm3D, untiltGeom } from '../parts/case-fdm'
import type { Geom3 } from '@jscad/modeling'
import type { Side } from '@renderer/types'

const { rotateX, translate, scale } = transforms
const { measureBoundingBox } = measurements

const SCALE = Number(process.env.SCALE ?? 1)
const OUT = SCALE === 1 ? '65/export-out/fdm' : '65/export-out/fdm-mini'
const A1_MINI_BED = 180

const flipZ = (geom: Geom3) => rotateX(Math.PI, geom)

const dropToBed = (geom: Geom3) => {
    const [min] = measureBoundingBox(geom)
    return translate([0, 0, -min[2]], geom)
}

const scaled = (geom: Geom3) => (SCALE === 1 ? geom : scale([SCALE, SCALE, SCALE], geom))

const layersOf = (side: Side) => [
    { name: 'top', geom: scaled(dropToBed(flipZ(buildTopFdm3D(side)))) },
    { name: 'plate', geom: scaled(dropToBed(untiltGeom(buildPlateFdm3D(side)))) },
    { name: 'bottom', geom: scaled(dropToBed(buildBottomFdm3D(side))) },
]

const dimensionsOf = (name: string, geom: Geom3) => {
    const [min, max] = measureBoundingBox(geom)
    const dim = { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] }
    if (dim.x > A1_MINI_BED || dim.y > A1_MINI_BED) throw new Error(`${name} ${dim.x.toFixed(1)}x${dim.y.toFixed(1)} > A1 mini bed ${A1_MINI_BED}`)
    return dim
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const key of Object.keys(SIDES) as (keyof typeof SIDES)[]) {
    for (const layer of layersOf(SIDES[key])) {
        const dim = dimensionsOf(`${key}-${layer.name}`, layer.geom)
        writeFileSync(
            `${OUT}/${key}-${layer.name}.stl`,
            Buffer.concat(stlSerializer.serialize({ binary: true }, layer.geom).map((part) => Buffer.from(part))),
        )
        console.log(`wrote ${key}-${layer.name}.stl  ${dim.x.toFixed(1)} x ${dim.y.toFixed(1)} x ${dim.z.toFixed(1)}mm`)
    }
}

console.log(`done → ${OUT}/  (SCALE ${SCALE}, top·plate·bottom 측당 3장. top=bezel+기둥 뒤집음, bottom=보스 위, plate=평판. 하단진입 M1)`)
