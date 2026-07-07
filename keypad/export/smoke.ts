import { geometries } from '@jscad/modeling'
import { SIDES } from '../config/layout'
import { buildPlate3D } from '../parts/plate'
import { buildTopFrame3D } from '../parts/top-frame'
import { buildBottom3D } from '../parts/bottom-plate'
import { Z } from '../config/dimensions'

const { geom3 } = geometries

for (const key of Object.keys(SIDES)) {
    const side = SIDES[key]!
    console.log(
        `${key}: keys ${side.switches.length} | case ${side.caseOutline.w.toFixed(2)}x${side.caseOutline.h.toFixed(2)} | holes ${side.mountHoles.length}`,
    )
    console.log(
        `   polys → bezel ${geom3.toPolygons(buildTopFrame3D(side)).length}, plate ${geom3.toPolygons(buildPlate3D(side)).length}, bottom ${geom3.toPolygons(buildBottom3D(side)).length}`,
    )
}

console.log(
    `stack: topFrameTop ${Z.topFrameTop} ~ bottomBottom ${Z.bottomBottom} = ${(Z.topFrameTop - Z.bottomBottom).toFixed(1)}mm (일체형 상판 + 하단진입 관통볼트)`,
)
console.log('smoke ok')
