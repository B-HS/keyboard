import { Box3, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeModelByColor, type ColorGroup } from '@renderer/instancing'
import type { Side } from '@renderer/types'
import { Z, FDM_MARGIN_EXTRA, ESP32_CRADLE } from '../config/dimensions'

const MODEL_URL = '/models/esp32-c3.glb'
const M_TO_MM = 1000

const loader = new GLTFLoader()
let cache: Promise<ColorGroup[]> | null = null

const loadMerged = () => {
    cache ??= loader.loadAsync(MODEL_URL).then((gltf) => {
        const model = gltf.scene
        model.scale.setScalar(M_TO_MM)
        return mergeModelByColor(model)
    })
    return cache
}

export const loadEsp32Model = async (side: Side) => {
    const groups = await loadMerged()
    const model = new Group()
    for (const g of groups) {
        model.add(new Mesh(g.geometry, new MeshStandardMaterial({ color: g.color, metalness: 0.3, roughness: 0.55 })))
    }
    model.rotation.x = Math.PI
    model.updateMatrixWorld(true)
    const group = new Group()
    group.add(model)
    const box = new Box3().setFromObject(model)
    const center = box.getCenter(new Vector3())
    const backY = side.caseOutline.cy + (side.caseOutline.h + 2 * FDM_MARGIN_EXTRA) / 2
    const moduleCenterY = backY - ESP32_CRADLE.lengthClearance / 2 - ESP32_CRADLE.boardLength / 2
    model.position.x += side.caseOutline.cx - center.x
    model.position.y += moduleCenterY - center.y
    model.position.z += Z.bottomTop - box.min.z
    return group
}
