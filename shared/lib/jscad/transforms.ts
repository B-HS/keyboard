import * as jscadModeling from '@jscad/modeling'
import type { Geom3 } from './jscad-to-three'

const { translate, rotateX, rotateY } = jscadModeling.transforms

/**
 * Plate tilt 변환: pivot = (0, pivotY, 0) 기준 X축 회전 (양수 = 앞낮 뒤높).
 * tiltDeg 가 0 에 가까우면 그대로 반환.
 */
export const applyPlateTilt = (geom: Geom3, tiltDeg: number, pivotY: number): Geom3 => {
    if (Math.abs(tiltDeg) < 1e-9) return geom
    const tiltRad = (tiltDeg * Math.PI) / 180
    let g = translate([0, -pivotY, 0], geom) as Geom3
    g = rotateX(tiltRad, g) as Geom3
    g = translate([0, pivotY, 0], g) as Geom3
    return g
}

/**
 * plate-mesh.tsx 와 동일한 변환:
 *   1. y pivot 정렬 (y -= pivotY)
 *   2. X축 회전 (tiltDeg)
 *   3. y pivot 복귀 + z 를 frontBottomZ 로 띄움
 *
 * cavity / opening 등을 plate jscad (z=0 기준) 와 동일하게 위치시킬 때 사용 —
 * plate 외곽 ↔ cavity 외곽이 회전 후에도 정확히 같은 좌표에 정렬됨.
 */
export const applyPlateTransform = (
    geom: Geom3,
    tiltDeg: number,
    pivotY: number,
    frontBottomZ: number,
): Geom3 => {
    const tiltRad = (tiltDeg * Math.PI) / 180
    let g = translate([0, -pivotY, 0], geom) as Geom3
    if (Math.abs(tiltDeg) >= 1e-9) g = rotateX(tiltRad, g) as Geom3
    g = translate([0, pivotY, frontBottomZ], g) as Geom3
    return g
}

/**
 * polygon (xy plane) 을 z 방향 extrude 한 결과를 jscad coord (x extrude) 로 정렬.
 * polygon points 의 (a, b) 를 (y, z) 로 해석하고 싶을 때 사용.
 *
 * 좌표 매핑: (X_old, Y_old, Z_old) → (Z_old, X_old, Y_old)
 *   - X_old = polygon x = y_intend
 *   - Y_old = polygon y = z_intend
 *   - Z_old = extrude z = x_intend
 */
export const reorientYZExtrude = (geom: Geom3): Geom3 =>
    rotateX(Math.PI / 2, rotateY(Math.PI / 2, geom)) as Geom3
