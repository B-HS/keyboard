import * as jscadModeling from '@jscad/modeling'
import type { Geom3 } from '@shared/lib/jscad'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'

const { roundedRectangle } = jscadModeling.primitives
const { translate } = jscadModeling.transforms
const { extrudeLinear } = jscadModeling.extrusions

/**
 * 49-pcba PCB 플레이스홀더 (외곽만, footprint 없음).
 * Z=0 기준으로 두께만큼 extrude — viewer 가 위치 transform.
 */
export const buildPcbGeom = (): Geom3 => {
    const G = KEYBOARD_GEOMETRY
    return translate(
        [G.plateCenterX, G.plateCenterY, 0],
        extrudeLinear(
            { height: G.pcbThickness },
            roundedRectangle({
                size: [G.plateWidth, G.plateDepth],
                roundRadius: G.pcbCornerRadius,
                segments: 32,
            }),
        ),
    ) as Geom3
}
