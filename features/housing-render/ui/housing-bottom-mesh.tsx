import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { buildGeometryFromJscad } from '@shared/lib/jscad'

type HousingBottomMeshProps = {
    source: string
    plateCenterX: number
    plateCenterY: number
    color?: string
    metalness?: number
    roughness?: number
    /** housing bottom의 local Z=0이 글로벌 어디에 있는지 (기본 -10 = 데스크면) */
    baseZ?: number
    opacity?: number
}

export const HousingBottomMesh: FC<HousingBottomMeshProps> = ({
    source,
    plateCenterX,
    plateCenterY,
    color = '#22262e',
    metalness = 0.2,
    roughness = 0.6,
    baseZ = -10,
    opacity = 0.8,
}) => {
    const geometry = useMemo(() => buildGeometryFromJscad(source), [source])

    const transformedGeometry = useMemo(() => {
        const cloned = geometry.clone()
        cloned.translate(-plateCenterX, -plateCenterY, baseZ)
        cloned.computeBoundingBox()
        cloned.computeBoundingSphere()
        return cloned
    }, [geometry, plateCenterX, plateCenterY, baseZ])

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
