import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { geom3ToBufferGeometry, type Geom3 } from '@shared/lib/jscad'
import { VIEWER_STYLE } from '@shared/config/viewer'

type PlateMeshProps = {
    geom: Geom3
    plateCenterX: number
    plateCenterY: number
    plateMinY: number
    /** plate 앞쪽 하면이 위치할 jscad Z 값 */
    frontBottomZ: number
    /** tilt 각도 (도) */
    tiltDeg: number
    color?: string
    metalness?: number
    roughness?: number
}

export const PlateMesh: FC<PlateMeshProps> = ({
    geom,
    plateCenterX,
    plateCenterY,
    plateMinY,
    frontBottomZ,
    tiltDeg,
    color = VIEWER_STYLE.plate.color,
    metalness = VIEWER_STYLE.plate.metalness,
    roughness = VIEWER_STYLE.plate.roughness,
}) => {
    const transformedGeometry = useMemo(() => {
        const cloned = geom3ToBufferGeometry(geom)
        const tiltRad = (tiltDeg * Math.PI) / 180
        // pivot Y=plateMinY 기준으로 X축 회전 (plate 뒤쪽이 +Z 방향으로 올라감)
        cloned.translate(0, -plateMinY, 0)
        cloned.rotateX(tiltRad)
        cloned.translate(0, plateMinY, frontBottomZ)
        // viewer XY 중심 정렬
        cloned.translate(-plateCenterX, -plateCenterY, 0)
        cloned.computeBoundingBox()
        cloned.computeBoundingSphere()
        return cloned
    }, [geom, plateCenterX, plateCenterY, plateMinY, frontBottomZ, tiltDeg])

    return (
        <mesh geometry={transformedGeometry} castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
        </mesh>
    )
}
