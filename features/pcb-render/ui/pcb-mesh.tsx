import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { buildGeometryFromJscad } from '@shared/lib/jscad'

type PcbMeshProps = {
    source: string
    plateCenterX: number
    plateCenterY: number
    plateMinY: number
    /** PCB 앞쪽 하면이 위치할 jscad Z 값 */
    frontBottomZ: number
    tiltDeg: number
    color?: string
    metalness?: number
    roughness?: number
}

export const PcbMesh: FC<PcbMeshProps> = ({
    source,
    plateCenterX,
    plateCenterY,
    plateMinY,
    frontBottomZ,
    tiltDeg,
    color = '#0d4a2a',
    metalness = 0.1,
    roughness = 0.7,
}) => {
    const geometry = useMemo(() => buildGeometryFromJscad(source), [source])

    const transformedGeometry = useMemo(() => {
        const cloned = geometry.clone()
        const tiltRad = (tiltDeg * Math.PI) / 180
        cloned.translate(0, -plateMinY, 0)
        cloned.rotateX(tiltRad)
        cloned.translate(0, plateMinY, frontBottomZ)
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
