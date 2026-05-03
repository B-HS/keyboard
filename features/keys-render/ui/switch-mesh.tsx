import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import { useMemo, type FC } from 'react'

import { KEY_DEFS } from '@shared/config/keyboard-layout'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'
import { VIEWER_STYLE } from '@shared/config/viewer'

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
    plateMinY?: number
    /** 플레이트 윗면이 위치할 jscad Z (앞쪽 기준). */
    plateTopZ?: number
    /** plate tilt 각도 (도). pivotY=plateMinY 기준 X축 회전 적용. */
    tiltDeg?: number
    color?: string
    metalness?: number
    roughness?: number
}

const DEFAULT_PLATE_TOP_Z = KEYBOARD_GEOMETRY.plateFrontBottomZ + KEYBOARD_GEOMETRY.plateThickness

export const SwitchMesh: FC<SwitchMeshProps> = ({
    plateCenterX = KEYBOARD_GEOMETRY.plateCenterX,
    plateCenterY = KEYBOARD_GEOMETRY.plateCenterY,
    plateMinY = KEYBOARD_GEOMETRY.plateMinY,
    plateTopZ = DEFAULT_PLATE_TOP_Z,
    tiltDeg = KEYBOARD_GEOMETRY.plateTiltDeg,
    color = VIEWER_STYLE.switch.color,
    metalness = VIEWER_STYLE.switch.metalness,
    roughness = VIEWER_STYLE.switch.roughness,
}) => {
    const raw = useLoader(STLLoader, switchUrl)

    const normalized = useMemo(() => {
        const g = raw.clone()
        g.rotateX(Math.PI / 2)
        g.computeBoundingBox()
        const box = g.boundingBox!
        const cx = (box.min.x + box.max.x) / 2
        const cy = (box.min.y + box.max.y) / 2
        const cz = box.min.z
        g.translate(-cx, -cy, plateTopZ + SWITCH_MOUNT_Z_OFFSET - cz)
        g.computeVertexNormals()
        return g
    }, [raw, plateTopZ])

    const tiltRad = (tiltDeg * Math.PI) / 180

    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            <group position={[0, plateMinY - plateCenterY, 0]} rotation={[tiltRad, 0, 0]}>
                <group position={[0, -(plateMinY - plateCenterY), 0]}>
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
            </group>
        </group>
    )
}
