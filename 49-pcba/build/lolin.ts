import * as jscadModeling from '@jscad/modeling'
import { type Geom3 } from '@shared/lib/jscad'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'

const { cuboid } = jscadModeling.primitives
const { translate } = jscadModeling.transforms

/**
 * LOLIN S3 Mini (Wemos S3 Mini) 디멘션.
 * 출처: https://www.wemos.cc/en/latest/s3/s3_mini.html + 실측 사진.
 *
 * PDF 시트: 짧은 변 25.4mm (USB-C 변), 긴 변 34.3mm (깊이). V1.0.0 보라 솔더마스크.
 * USB Type-C 16pin SMD: 메탈 쉘 8.94 × 7.35 × 3.16mm. 보드 윗면 USB-C 변 가운데
 * (좌/우 8.2mm 인셋) SMD. 메탈 쉘 외부 끝이 PCB 변 너머 ~1mm 돌출.
 *
 * 좌표 매핑: USB-C 변이 +Y 측벽 쪽으로 향하므로 boardW=X=25.4, boardD=Y=34.3.
 */
export const LOLIN_DIMENSIONS = {
    boardW: 25.4,
    boardD: 34.3,
    boardThickness: 1.6,
    usbCBodyW: 8.94,
    usbCBodyD: 7.35,
    usbCBodyH: 3.16,
    usbCProtrusion: 1.0,
} as const

/**
 * LOLIN 보드 케이스 안 위치 (housing-bottom 함몰 안).
 * USB-C 변이 뒤 측벽 안면에 usbEdgeGap 만큼 가까이.
 * housing-bottom.ts 와 lolin-mesh 가 동일 위치 사용 — 여기가 single source.
 */
const G = KEYBOARD_GEOMETRY
const WALL_THICKNESS_VAL = G.magnetSizeY + 2 * (G.magnetClearance + G.magnetEdgeMargin)
const OUTER_D = G.plateDepth + 2 * G.plateClearance + 2 * WALL_THICKNESS_VAL
const HALF_OUT_Y = OUTER_D / 2
const FLOOR_TOP_Z = G.caseFloorBottomZ + G.caseFloorThickness

// USB-C 두께 3.16mm 기준: 함몰 1.5mm 시 USB-C 윗면 z=4.96 → PCB 하면(5.4)과 0.44mm 여유.
const recessDepth = 1.5
const recessClearance = 0.5
const usbEdgeGap = 0.2
const glueGap = 0.2

const wallInnerYBack = G.plateCenterY + HALF_OUT_Y - WALL_THICKNESS_VAL
const usbEdgeY = wallInnerYBack - usbEdgeGap
const centerX = G.plateCenterX
const centerY = usbEdgeY - LOLIN_DIMENSIONS.boardD / 2
const boardBottomZ = FLOOR_TOP_Z - recessDepth + glueGap
const usbCBottomAbsZ = boardBottomZ + LOLIN_DIMENSIONS.boardThickness
const usbCTopAbsZ = usbCBottomAbsZ + LOLIN_DIMENSIONS.usbCBodyH

export const LOLIN_PLACEMENT = {
    recessDepth,
    recessClearance,
    usbEdgeGap,
    glueGap,
    wallInnerYBack,
    usbEdgeY,
    centerX,
    centerY,
    boardBottomZ,
    usbCBottomAbsZ,
    usbCTopAbsZ,
} as const

/** LOLIN PCB 보드 (파란 솔더마스크). */
export const buildLolinPcbGeom = (): Geom3 => {
    const { boardW, boardD, boardThickness } = LOLIN_DIMENSIONS
    return translate(
        [centerX, centerY, boardBottomZ + boardThickness / 2],
        cuboid({ size: [boardW, boardD, boardThickness] }),
    ) as Geom3
}

/** USB-C 단자 (보드 윗면 USB 변, 메탈 쉘. 외부 끝이 PCB 변 너머 protrusion 만큼 돌출). */
export const buildLolinUsbCGeom = (): Geom3 => {
    const { boardD, usbCBodyW, usbCBodyD, usbCBodyH, usbCProtrusion } = LOLIN_DIMENSIONS
    const usbCOuterEdgeY = centerY + boardD / 2 + usbCProtrusion
    const usbCCenterY = usbCOuterEdgeY - usbCBodyD / 2
    const usbCCenterZ = (usbCBottomAbsZ + usbCTopAbsZ) / 2
    return translate(
        [centerX, usbCCenterY, usbCCenterZ],
        cuboid({ size: [usbCBodyW, usbCBodyD, usbCBodyH] }),
    ) as Geom3
}
