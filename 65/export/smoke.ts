import { geometries } from '@jscad/modeling'
import { SIDES } from '../config/layout'
import { buildPlate3D } from '../parts/plate'
import { buildTopFrame3D } from '../parts/top-frame'
import { buildBottom3D } from '../parts/bottom-plate'
import { buildTopFdm3D, buildPlateFdm3D, buildBottomFdm3D } from '../parts/case-fdm'
import { Z, HOTSWAP_SOCKET_BELOW_PCB, ESP32_MODULE, ESP32_CRADLE } from '../config/dimensions'
import type { Geom3 } from '@jscad/modeling'

const { geom3 } = geometries

const boundsZ = (geom: Geom3) => {
    const zs = geom3.toPolygons(geom).flatMap((p) => p.vertices.map((v) => v[2]))
    return { min: Math.min(...zs), max: Math.max(...zs) }
}

for (const key of Object.keys(SIDES) as (keyof typeof SIDES)[]) {
    const side = SIDES[key]
    console.log(
        `${key}: keys ${side.switches.length} | case ${side.caseOutline.w.toFixed(2)}x${side.caseOutline.h.toFixed(2)} | holes ${side.mountHoles.length}`,
    )
    console.log(
        `   polys → bezel ${geom3.toPolygons(buildTopFrame3D(side)).length}, plate ${geom3.toPolygons(buildPlate3D(side)).length}, bottom ${geom3.toPolygons(buildBottom3D(side)).length}`,
    )
    const topFdm = buildTopFdm3D(side)
    const plateFdm = buildPlateFdm3D(side)
    const bottomFdm = buildBottomFdm3D(side)
    const tz = boundsZ(topFdm)
    const pz = boundsZ(plateFdm)
    const bz = boundsZ(bottomFdm)
    console.log(
        `   FDM → top ${geom3.toPolygons(topFdm).length}p z[${tz.min.toFixed(2)}..${tz.max.toFixed(2)}], plate ${geom3.toPolygons(plateFdm).length}p z[${pz.min.toFixed(2)}..${pz.max.toFixed(2)}], bottom ${geom3.toPolygons(bottomFdm).length}p z[${bz.min.toFixed(2)}..${bz.max.toFixed(2)}]`,
    )
}

console.log(
    `stack: topFrameTop ${Z.topFrameTop} ~ bottomBottom ${Z.bottomBottom} = ${(Z.topFrameTop - Z.bottomBottom).toFixed(1)}mm (일체형 상판 + 하단진입 관통볼트)`,
)

const socketBottomZ = Z.pcbBottom - HOTSWAP_SOCKET_BELOW_PCB
const moduleBodyTopZ = Z.bottomTop + ESP32_MODULE.boardThickness + ESP32_MODULE.bodyHeight
const moduleUsbTopZ = Z.bottomTop + ESP32_MODULE.boardThickness + ESP32_MODULE.usbHeight
const railTopZ = Z.bottomTop + ESP32_CRADLE.railHeight
const bodyClearance = socketBottomZ - moduleBodyTopZ
const usbClearance = Z.pcbBottom - moduleUsbTopZ
const railClearance = Z.pcbBottom - railTopZ
console.log(
    `esp32 clearance: 소켓바닥(${socketBottomZ.toFixed(1)})↔모듈본체top(${moduleBodyTopZ.toFixed(1)}) ${bodyClearance.toFixed(1)} | pcb하면↔USBtop(${moduleUsbTopZ.toFixed(1)}) ${usbClearance.toFixed(1)} | pcb하면↔레일top(${railTopZ.toFixed(1)}) ${railClearance.toFixed(1)}`,
)
if (bodyClearance < 0 || usbClearance < 0 || railClearance < 0) throw new Error('ESP32 모듈이 PCB/핫스왑 소켓과 간섭합니다')
console.log('smoke ok')
