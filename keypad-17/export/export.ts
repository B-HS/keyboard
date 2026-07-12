import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import stlSerializer from '@jscad/stl-serializer'
import { measurements, type Geom3 } from '@jscad/modeling'
import { buildPrintParts } from './stl-parts'

const { measureBoundingBox } = measurements

const SCALE = Number(process.env.SCALE ?? 1)
const OUT = SCALE === 1 ? 'keypad-17/export-out/fdm' : 'keypad-17/export-out/fdm-mini'
const A1_MINI_BED = 180

const dimensionsOf = (name: string, geom: Geom3) => {
    const [min, max] = measureBoundingBox(geom)
    const dim = { x: max[0] - min[0], y: max[1] - min[1], z: max[2] - min[2] }
    if (dim.x > A1_MINI_BED || dim.y > A1_MINI_BED) throw new Error(`${name} ${dim.x.toFixed(1)}x${dim.y.toFixed(1)} > A1 mini bed ${A1_MINI_BED}`)
    return dim
}

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const part of buildPrintParts(SCALE)) {
    const dim = dimensionsOf(part.name, part.geom)
    writeFileSync(`${OUT}/${part.name}.stl`, Buffer.concat(stlSerializer.serialize({ binary: true }, part.geom).map((p) => Buffer.from(p))))
    console.log(`wrote ${part.name}.stl  ${dim.x.toFixed(1)} x ${dim.y.toFixed(1)} x ${dim.z.toFixed(1)}mm`)
}

console.log(
    `done → ${OUT}/  (SCALE ${SCALE}, top·plate·bottom 3장. top=bezel+기둥 뒤집음, bottom=보스 위, plate=평판. 하단진입 M1, PCB 없음=핸드와이어)`,
)
