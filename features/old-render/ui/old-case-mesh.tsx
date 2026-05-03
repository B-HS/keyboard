import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import { useMemo, type FC } from 'react'

type OldStlMeshProps = {
    url: string
    plateCenterX: number
    plateCenterY: number
    offsetX: number
    /** jscad Z 축으로 추가 평행이동. 새 케이스 바닥과 정렬 시 사용. */
    zOffset?: number
    color?: string
    metalness?: number
    roughness?: number
}

export const OldStlMesh: FC<OldStlMeshProps> = ({
    url,
    plateCenterX,
    plateCenterY,
    offsetX,
    zOffset = 0,
    color = '#5a5d63',
    metalness = 0.4,
    roughness = 0.55,
}) => {
    const geom = useLoader(STLLoader, url)
    const transformed = useMemo(() => {
        const cloned = geom.clone()
        cloned.translate(-plateCenterX + offsetX, -plateCenterY, zOffset)
        cloned.computeVertexNormals()
        return cloned
    }, [geom, plateCenterX, plateCenterY, offsetX, zOffset])

    return (
        <mesh geometry={transformed} castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
            <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} side={THREE.DoubleSide} />
        </mesh>
    )
}
