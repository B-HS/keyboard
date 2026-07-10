import { Group, Mesh, MeshStandardMaterial } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { mergeModelByColor, type ColorGroup } from '@renderer/instancing'
import { Z } from '../config/dimensions'

const BASE = `${import.meta.env.BASE_URL}models/pcb`
const M_TO_MM = 1000

const loader = new GLTFLoader()
const cache = new Map<'left' | 'right', Promise<ColorGroup[]>>()

const loadMerged = (side: 'left' | 'right') => {
    const cached = cache.get(side)
    if (cached) return cached
    const merged = loader.loadAsync(`${BASE}/${side}.glb`).then((gltf) => {
        gltf.scene.scale.setScalar(M_TO_MM)
        return mergeModelByColor(gltf.scene)
    })
    cache.set(side, merged)
    return merged
}

export const loadPcbModel = async (side: 'left' | 'right') => {
    const groups = await loadMerged(side)
    const model = new Group()
    for (const g of groups) {
        model.add(new Mesh(g.geometry, new MeshStandardMaterial({ color: g.color, metalness: 0.3, roughness: 0.55 })))
    }
    model.rotation.x = Math.PI / 2
    model.position.z = Z.pcbBottom
    const group = new Group()
    group.add(model)
    return group
}
