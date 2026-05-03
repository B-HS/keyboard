import { useLoader } from '@react-three/fiber'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader.js'
import * as THREE from 'three'
import { useMemo, type FC } from 'react'

import { KEY_DEFS, type KeyDef } from '@shared/config/keyboard-layout'
import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'
import { VIEWER_STYLE } from '@shared/config/viewer'

const keycapUrls = import.meta.glob('../../../49-old/docs/models/keycap/STL/*.stl', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>

const keyFileName = (k: KeyDef): string => `1x${k.w} R${k.row + 1}.stl`

const findUrl = (fname: string): string | null => {
    for (const path in keycapUrls) {
        if (path.endsWith('/' + fname)) return keycapUrls[path]
    }
    return null
}

/** Keycap 하단 z-offset (mm). 스위치 stem 위에 6mm 정도 떠 있다. */
const KEYCAP_MOUNT_Z_OFFSET = 6.0

const DEFAULT_PLATE_TOP_Z = KEYBOARD_GEOMETRY.plateFrontBottomZ + KEYBOARD_GEOMETRY.plateThickness

type KeycapMeshProps = {
    plateCenterX?: number
    plateCenterY?: number
    plateMinY?: number
    plateTopZ?: number
    tiltDeg?: number
    color?: string
    metalness?: number
    roughness?: number
}

type FileGroup = {
    fname: string
    url: string
    keys: KeyDef[]
}

export const KeycapMesh: FC<KeycapMeshProps> = ({
    plateCenterX = KEYBOARD_GEOMETRY.plateCenterX,
    plateCenterY = KEYBOARD_GEOMETRY.plateCenterY,
    plateMinY = KEYBOARD_GEOMETRY.plateMinY,
    plateTopZ = DEFAULT_PLATE_TOP_Z,
    tiltDeg = KEYBOARD_GEOMETRY.plateTiltDeg,
    color = VIEWER_STYLE.keycap.color,
    metalness = VIEWER_STYLE.keycap.metalness,
    roughness = VIEWER_STYLE.keycap.roughness,
}) => {
    const groups: FileGroup[] = useMemo(() => {
        const map = new Map<string, KeyDef[]>()
        for (const k of KEY_DEFS) {
            const fname = keyFileName(k)
            const arr = map.get(fname)
            if (arr) arr.push(k)
            else map.set(fname, [k])
        }
        const out: FileGroup[] = []
        for (const [fname, keys] of map) {
            const url = findUrl(fname)
            if (!url) {
                console.warn('[keycap] STL 누락:', fname)
                continue
            }
            out.push({ fname, url, keys })
        }
        return out
    }, [])

    const urls = useMemo(() => groups.map((g) => g.url), [groups])
    const rawGeoms = useLoader(STLLoader, urls)

    const normalized = useMemo(() => {
        const result = new Map<string, THREE.BufferGeometry>()
        groups.forEach((grp, i) => {
            const raw = rawGeoms[i]
            if (!raw) return
            const g = raw.clone()
            g.rotateX(Math.PI / 2)
            g.computeBoundingBox()
            const box = g.boundingBox!
            const cx = (box.min.x + box.max.x) / 2
            const cy = (box.min.y + box.max.y) / 2
            const cz = box.min.z
            g.translate(-cx, -cy, plateTopZ + KEYCAP_MOUNT_Z_OFFSET - cz)
            g.computeVertexNormals()
            result.set(grp.fname, g)
        })
        return result
    }, [groups, rawGeoms, plateTopZ])

    const tiltRad = (tiltDeg * Math.PI) / 180

    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            <group position={[0, plateMinY - plateCenterY, 0]} rotation={[tiltRad, 0, 0]}>
                <group position={[0, -(plateMinY - plateCenterY), 0]}>
                    {groups.map((grp) => {
                        const geom = normalized.get(grp.fname)
                        if (!geom) return null
                        return grp.keys.map((k) => (
                            <mesh
                                key={k.id}
                                geometry={geom}
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
                        ))
                    })}
                </group>
            </group>
        </group>
    )
}
