import { useMemo, type FC } from 'react'
import * as THREE from 'three'
import { geom3ToBufferGeometry, type Geom3 } from '@shared/lib/jscad'
import { VIEWER_STYLE } from '@shared/config/viewer'

type LolinMeshProps = {
    pcbGeom: Geom3
    usbCGeom: Geom3
    plateCenterX: number
    plateCenterY: number
    baseZ?: number
}

export const LolinMesh: FC<LolinMeshProps> = ({
    pcbGeom,
    usbCGeom,
    plateCenterX,
    plateCenterY,
    baseZ = -10,
}) => {
    const pcbBuf = useMemo(() => {
        const cloned = geom3ToBufferGeometry(pcbGeom)
        cloned.translate(-plateCenterX, -plateCenterY, baseZ)
        cloned.computeBoundingBox()
        cloned.computeBoundingSphere()
        return cloned
    }, [pcbGeom, plateCenterX, plateCenterY, baseZ])

    const usbCBuf = useMemo(() => {
        const cloned = geom3ToBufferGeometry(usbCGeom)
        cloned.translate(-plateCenterX, -plateCenterY, baseZ)
        cloned.computeBoundingBox()
        cloned.computeBoundingSphere()
        return cloned
    }, [usbCGeom, plateCenterX, plateCenterY, baseZ])

    return (
        <group rotation={[-Math.PI / 2, 0, 0]}>
            <mesh geometry={pcbBuf} castShadow receiveShadow>
                <meshStandardMaterial
                    color={VIEWER_STYLE.lolinPcb.color}
                    metalness={VIEWER_STYLE.lolinPcb.metalness}
                    roughness={VIEWER_STYLE.lolinPcb.roughness}
                    side={THREE.DoubleSide}
                />
            </mesh>
            <mesh geometry={usbCBuf} castShadow receiveShadow>
                <meshStandardMaterial
                    color={VIEWER_STYLE.lolinUsbC.color}
                    metalness={VIEWER_STYLE.lolinUsbC.metalness}
                    roughness={VIEWER_STYLE.lolinUsbC.roughness}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    )
}
