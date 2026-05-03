import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { buildGeometryFromJscad } from '@shared/lib/jscad'

type PlateMeshProps = {
    source: string
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
    source,
    plateCenterX,
    plateCenterY,
    plateMinY,
    frontBottomZ,
    tiltDeg,
    color = '#a8acb3',
    metalness = 0.85,
    roughness = 0.35,
}) => {
    const geometry = useMemo(() => buildGeometryFromJscad(source), [source])

    const transformedGeometry = useMemo(() => {
        const cloned = geometry.clone()
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
    }, [geometry, plateCenterX, plateCenterY, plateMinY, frontBottomZ, tiltDeg])

    return (
        <mesh geometry={transformedGeometry} castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
        </mesh>
    )
}
