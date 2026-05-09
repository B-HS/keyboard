import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import { useMemo, type FC } from 'react'

type PcbMeshProps = {
    url: string
    /** PCB 하면이 위치할 jscad Z (보통 pcbFrontBottomZ). */
    frontBottomZ: number
    color?: string
    metalness?: number
    roughness?: number
    opacity?: number
}

/**
 * KiCad 에서 export 한 PCB STL 을 viewer 에 띄움.
 * STL 자체 page-origin offset 이 들어 있어 직접 매핑 X.
 * STL bbox center 를 viewer 원점으로, minZ 를 frontBottomZ 로 정렬.
 */
export const PcbMesh: FC<PcbMeshProps> = ({
    url,
    frontBottomZ,
    color = '#0d4a2a',
    metalness = 0.1,
    roughness = 0.7,
    opacity = 1,
}) => {
    const geom = useLoader(STLLoader, url)
    const transformed = useMemo(() => {
        const cloned = geom.clone()
        cloned.computeBoundingBox()
        const bb = cloned.boundingBox!
        const cx = (bb.min.x + bb.max.x) / 2
        const cy = (bb.min.y + bb.max.y) / 2
        const minZ = bb.min.z
        cloned.translate(-cx, -cy, frontBottomZ - minZ)
        cloned.computeVertexNormals()
        return cloned
    }, [geom, frontBottomZ])

    const transparent = opacity < 1

    return (
        <mesh geometry={transformed} castShadow receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
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
