import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { geom3ToBufferGeometry, type Geom3 } from '@shared/lib/jscad'
import { VIEWER_STYLE } from '@shared/config/viewer'

type HousingTopMeshProps = {
    geom: Geom3
    plateCenterX: number
    plateCenterY: number
    color?: string
    metalness?: number
    roughness?: number
    /** housing top의 local Z=0이 글로벌 어디에 있는지 (기본 0 = plate bottom) */
    baseZ?: number
    opacity?: number
}

export const HousingTopMesh: FC<HousingTopMeshProps> = ({
    geom,
    plateCenterX,
    plateCenterY,
    color = VIEWER_STYLE.housingTop.color,
    metalness = VIEWER_STYLE.housingTop.metalness,
    roughness = VIEWER_STYLE.housingTop.roughness,
    baseZ = 0,
    opacity = VIEWER_STYLE.housingTop.opacity,
}) => {
    const transformedGeometry = useMemo(() => {
        const cloned = geom3ToBufferGeometry(geom)
        cloned.translate(-plateCenterX, -plateCenterY, baseZ)
        cloned.computeBoundingBox()
        cloned.computeBoundingSphere()
        return cloned
    }, [geom, plateCenterX, plateCenterY, baseZ])

    const transparent = opacity < 1

    return (
        <mesh geometry={transformedGeometry} castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial
                color={color}
                metalness={metalness}
                roughness={roughness}
                side={THREE.DoubleSide}
                transparent={transparent}
                opacity={opacity}
                depthWrite={!transparent}
            />
        </mesh>
    )
}
