import { geometries } from '@jscad/modeling'
import { SIDE } from '../config/layout'
import { buildTop3D, buildPlate3D, buildBottom3D } from '../parts/case'
import {
    Z,
    SWITCH_PIN_BELOW_HOUSING,
    HANDWIRE_ALLOWANCE_BELOW_PIN,
    SWITCH_CUTOUT_FDM,
    ESP32_MODULE,
    ESP32_CRADLE,
    PILLAR_BODY_DIAMETER,
    PILLAR_ROOT_FILLET,
    PILLAR_TIP_CLEARANCE,
    PLATE_PILLAR_HOLE_DIAMETER,
    PLATE_PILLAR_COUNTERSINK,
    BOTTOM_BOSS_OUTER_DIAMETER,
    M1,
} from '../config/dimensions'
import type { Geom3 } from '@jscad/modeling'

const { geom3 } = geometries

const boundsZ = (geom: Geom3) => {
    const zs = geom3.toPolygons(geom).flatMap((p) => p.vertices.map((v) => v[2]))
    return { min: Math.min(...zs), max: Math.max(...zs) }
}

console.log(
    `keypad-17: keys ${SIDE.switches.length} | stab slots ${SIDE.stabs.length} | case ${SIDE.caseOutline.w.toFixed(2)}x${SIDE.caseOutline.h.toFixed(2)} | holes ${SIDE.mountHoles.length}`,
)

const top = buildTop3D(SIDE)
const plate = buildPlate3D(SIDE)
const bottom = buildBottom3D(SIDE)
const tz = boundsZ(top)
const pz = boundsZ(plate)
const bz = boundsZ(bottom)
console.log(
    `   top ${geom3.toPolygons(top).length}p z[${tz.min.toFixed(2)}..${tz.max.toFixed(2)}], plate ${geom3.toPolygons(plate).length}p z[${pz.min.toFixed(2)}..${pz.max.toFixed(2)}], bottom ${geom3.toPolygons(bottom).length}p z[${bz.min.toFixed(2)}..${bz.max.toFixed(2)}]`,
)
console.log(
    `stack: topFrameTop ${Z.topFrameTop} ~ bottomBottom ${Z.bottomBottom} = ${(Z.topFrameTop - Z.bottomBottom).toFixed(1)}mm (핸드와이어, PCB 없음)`,
)

const pinTipZ = Z.housingBottom - SWITCH_PIN_BELOW_HOUSING
const handwireLowZ = pinTipZ - HANDWIRE_ALLOWANCE_BELOW_PIN
const moduleBodyTopZ = Z.bottomTop + ESP32_MODULE.boardThickness + ESP32_MODULE.bodyHeight
const railTopZ = Z.bottomTop + ESP32_CRADLE.railHeight
const bodyClearance = handwireLowZ - moduleBodyTopZ
const railClearance = pinTipZ - railTopZ

const caseBackY = SIDE.caseOutline.cy + SIDE.caseOutline.h / 2
const usbFrontY = caseBackY - ESP32_CRADLE.lengthClearance / 2 - ESP32_MODULE.usbLength
const housingBackY = Math.max(...SIDE.switches.map((s) => s.y)) + SWITCH_CUTOUT_FDM / 2
const usbYMargin = usbFrontY - housingBackY

console.log(
    `esp32 clearance: 솔더최저(${handwireLowZ.toFixed(1)})↔모듈본체top(${moduleBodyTopZ.toFixed(1)}) ${bodyClearance.toFixed(1)} | 핀(${pinTipZ.toFixed(1)})↔레일top(${railTopZ.toFixed(1)}) ${railClearance.toFixed(1)} | USB전방y여유 ${usbYMargin.toFixed(2)}`,
)
if (bodyClearance < 0 || railClearance < 0 || usbYMargin < 0) throw new Error('ESP32 모듈이 스위치 핀/하우징과 간섭합니다')

const plateSlideClearance = (PLATE_PILLAR_HOLE_DIAMETER - PILLAR_BODY_DIAMETER) / 2
const countersinkTopGap = (PLATE_PILLAR_COUNTERSINK.topDiameter - PILLAR_ROOT_FILLET.diameter) / 2
console.log(
    `plate-pillar fit: 슬라이드 여유 ${plateSlideClearance.toFixed(2)}/측 (홀 ${PLATE_PILLAR_HOLE_DIAMETER}↔몸통 ${PILLAR_BODY_DIAMETER}) | 카운터싱크↔필렛 ${countersinkTopGap.toFixed(2)}/측 (${PLATE_PILLAR_COUNTERSINK.topDiameter}↔${PILLAR_ROOT_FILLET.diameter})`,
)
if (plateSlideClearance <= 0 || countersinkTopGap <= 0) throw new Error('plate 홀이 기둥을 통과하지 못합니다')

const screwSeatZ = Z.bottomBottom + M1.headCounterbore.depth
const screwTipZ = screwSeatZ + M1.screwMaxLength
const insertLowZ = Z.bottomTop + PILLAR_TIP_CLEARANCE
const engagement = Math.min(screwTipZ, insertLowZ + M1.insertLength) - insertLowZ
const pocketMargin = insertLowZ + M1.insertPocketDepth - screwTipZ
console.log(
    `m1: 물림 ${engagement.toFixed(2)}/${M1.insertLength} | 나사끝↔포켓천장 ${pocketMargin.toFixed(2)} | 머리 은닉 ${(M1.headCounterbore.depth - M1.screwHeadHeight).toFixed(2)}`,
)
if (engagement < 2 || pocketMargin < 0.2) throw new Error('M1 체결 스택 불량')

const bossRadius = BOTTOM_BOSS_OUTER_DIAMETER / 2
let minBossGap = Infinity
for (const h of SIDE.mountHoles) {
    for (const s of SIDE.switches) {
        const dx = Math.max(Math.abs(h.x - s.x) - SWITCH_CUTOUT_FDM / 2, 0)
        const dy = Math.max(Math.abs(h.y - s.y) - SWITCH_CUTOUT_FDM / 2, 0)
        minBossGap = Math.min(minBossGap, Math.hypot(dx, dy) - bossRadius)
    }
}
console.log(`boss↔switch housing 최소 XY 갭 ${minBossGap.toFixed(2)}`)
if (minBossGap < 0.3) throw new Error('보스가 스위치 하우징과 간섭 위험')
console.log('smoke ok')
