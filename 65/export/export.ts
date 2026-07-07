import { mkdirSync, writeFileSync, rmSync } from 'node:fs'
import dxfSerializer from '@jscad/dxf-serializer'
import { SIDES } from '../config/layout'
import { buildPlate2D } from '../parts/plate'
import { buildTopFrame2D } from '../parts/top-frame'
import { buildBottom2D } from '../parts/bottom-plate'
import { buildSpacers2D } from '../parts/spacer'
import { TOP_FRAME_THICKNESS, PLATE_THICKNESS, BOTTOM_THICKNESS, PLATE_BOTTOM_TO_PCB_TOP, BOTTOM_GAP } from '../config/dimensions'
import type { Geom2 } from '@jscad/modeling'
import type { Side } from '@renderer/types'

const OUT = '65/export-out'

const layersOf = (side: Side) => [
    { name: 'bezel', thickness: TOP_FRAME_THICKNESS, geom2: buildTopFrame2D(side) },
    { name: 'plate', thickness: PLATE_THICKNESS, geom2: buildPlate2D(side) },
    { name: 'bottom', thickness: BOTTOM_THICKNESS, geom2: buildBottom2D(side) },
    { name: 'spacer-airgap', thickness: PLATE_BOTTOM_TO_PCB_TOP, geom2: buildSpacers2D(side) },
    { name: 'spacer-bottomgap', thickness: BOTTOM_GAP, geom2: buildSpacers2D(side) },
]

const writeDxf = (path: string, geom: Geom2) => writeFileSync(path, dxfSerializer.serialize({}, geom).join(''))

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const key of Object.keys(SIDES) as (keyof typeof SIDES)[]) {
    for (const layer of layersOf(SIDES[key])) {
        writeDxf(`${OUT}/${key}-${layer.name}-${layer.thickness}mm.dxf`, layer.geom2)
        console.log(`wrote ${key}-${layer.name} (아크릴 ${layer.thickness}mm, 레이저컷 DXF)`)
    }
}

console.log(`done → ${OUT}/  (일체형 상판[bezel5.0+plate1.5] + bottom1.5 + 스페이서(에어갭3.5·바텀갭5.0, 좌우벽) = 측당 5장. M2 체결)`)
