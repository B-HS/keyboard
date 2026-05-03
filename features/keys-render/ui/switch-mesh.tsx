import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import { useMemo, type FC } from 'react'

import { KEY_DEFS } from '@shared/config/keyboard-layout'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'

import switchUrl from '../../../49-old/docs/models/switch/cherry mx.STL?url'

/**
 * Cherry MX 스위치 본체 z-offset (mm).
 * = 스위치 하단 Z − plate top Z.
 * Cherry MX 표준: 마운트 플레이트 위로 약 10mm (top housing + stem),
 * 아래로 약 7.7mm (bottom housing + 핀 일부).
 */
const SWITCH_MOUNT_Z_OFFSET = -7.7

type SwitchMeshProps = {
    plateCenterX?: number
    plateCenterY?: number
    /** 플레이트 윗면이 위치할 jscad Z. 기본 8.5 (= plateFrontBottomZ + plateThickness). */
    plateTopZ?: number
    color?: string
    metalness?: number
    roughness?: number
}

const DEFAULT_PLATE_TOP_Z = KEYBOARD_GEOMETRY.plateFrontBottomZ + KEYBOARD_GEOMETRY.plateThickness

export const SwitchMesh: FC<SwitchMeshProps> = ({
    plateCenterX = KEYBOARD_GEOMETRY.plateCenterX,
    plateCenterY = KEYBOARD_GEOMETRY.plateCenterY,
    plateTopZ = DEFAULT_PLATE_TOP_Z,
    color = '#1d2024',
    metalness = 0.2,
    roughness = 0.65,
}) => {
    const raw = useLoader(STLLoader, switchUrl)

    const normalized = useMemo(() => {
        const g = raw.clone()
        // STL은 Y축이 높이 → jscad는 Z축이 높이. rotateX(PI/2)로 변환.
        g.rotateX(Math.PI / 2)
        g.computeBoundingBox()
        const box = g.boundingBox!
        const cx = (box.min.x + box.max.x) / 2
        const cy = (box.min.y + box.max.y) / 2
        const cz = box.min.z
        // 스위치 하단을 plate top + offset 에 정렬, 중심을 원점에.
        g.translate(-cx, -cy, plateTopZ + SWITCH_MOUNT_Z_OFFSET - cz)
        g.computeVertexNormals()
        return g
    }, [raw, plateTopZ])

    return (
        // group rotation으로 jscad 좌표(Z up) → three 좌표(Y up) 변환.
        // 내부 mesh 의 position/geometry 는 jscad 좌표계.
        <group rotation={[-Math.PI / 2, 0, 0]}>
            {KEY_DEFS.map((k) => (
                <mesh
                    key={k.id}
                    geometry={normalized}
                    position={[k.cx - plateCenterX, k.cy - plateCenterY, 0]}
                    castShadow
                    receiveShadow>
                    <meshStandardMaterial
                        color={color}
                        metalness={metalness}
                        roughness={roughness}
                        side={THREE.DoubleSide}
                    />
                </mesh>
            ))}
        </group>
    )
}
