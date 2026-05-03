import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { geom3ToBufferGeometry, type Geom3 } from '@shared/lib/jscad'
import { VIEWER_STYLE } from '@shared/config/viewer'

type PcbMeshProps = {
    geom: Geom3
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
    geom,
    plateCenterX,
    plateCenterY,
    plateMinY,
    frontBottomZ,
    tiltDeg,
    color = VIEWER_STYLE.pcb.color,
    metalness = VIEWER_STYLE.pcb.metalness,
    roughness = VIEWER_STYLE.pcb.roughness,
}) => {
    const transformedGeometry = useMemo(() => {
        const cloned = geom3ToBufferGeometry(geom)
        const tiltRad = (tiltDeg * Math.PI) / 180
        cloned.translate(0, -plateMinY, 0)
        cloned.rotateX(tiltRad)
        cloned.translate(0, plateMinY, frontBottomZ)
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
