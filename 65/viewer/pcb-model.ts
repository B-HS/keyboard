import { Group } from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { Z } from '../config/dimensions'

const BASE = '/models/pcb'
const M_TO_MM = 1000

const loader = new GLTFLoader()

export const loadPcbModel = async (side: 'left' | 'right') => {
    const gltf = await loader.loadAsync(`${BASE}/${side}.glb`)
    const group = new Group()
    const model = gltf.scene
    model.rotation.x = Math.PI / 2
    model.scale.setScalar(M_TO_MM)
    model.position.z = Z.pcbBottom
    group.add(model)
    return group
}
