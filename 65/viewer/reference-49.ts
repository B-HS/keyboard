import { Group, Mesh, MeshStandardMaterial, type BufferGeometry } from 'three'
import { STLLoader } from 'three/addons/loaders/STLLoader.js'

const BASE = `${import.meta.env.BASE_URL}models/reference-49`
const CENTER = { x: 123.8, y: -28.6, z: -2 }
const PCB_XY_OFFSET = { x: -24.1, y: 23.4 }

const caseMat = new MeshStandardMaterial({ color: 0x9a9aa2, metalness: 0.5, roughness: 0.5 })
const plateMat = new MeshStandardMaterial({ color: 0xc8c8ce, metalness: 0.5, roughness: 0.5 })
const pcbMat = new MeshStandardMaterial({ color: 0x2f7d4f, metalness: 0.2, roughness: 0.7 })

type Reference49Data = { caseWidth: number; caseDepth: number; caseGroup: Group; pcbGroup: Group; pcbLoaded: boolean }

const normalize = (geo: BufferGeometry) => {
    geo.translate(-CENTER.x, -CENTER.y, -CENTER.z)
    return geo
}

const loadMesh = async (loader: STLLoader, name: string, material: MeshStandardMaterial) => {
    const geo = await loader.loadAsync(`${BASE}/${name}.stl`)
    return new Mesh(normalize(geo), material)
}

export const buildReference49 = async () => {
    const loader = new STLLoader()
    const group = new Group()

    const [top, bottom, plate] = await Promise.all([
        loadMesh(loader, 'top-case', caseMat),
        loadMesh(loader, 'bottom-case', caseMat),
        loadMesh(loader, 'plate', plateMat),
    ])
    const caseGroup = new Group()
    caseGroup.add(top, bottom, plate)
    group.add(caseGroup)

    const pcbGroup = new Group()
    group.add(pcbGroup)

    const data: Reference49Data = { caseWidth: 282.35, caseDepth: 91.85, caseGroup, pcbGroup, pcbLoaded: false }
    group.userData = data
    return group
}

export const loadPcb49 = async (group: Group) => {
    const data = group.userData as Reference49Data
    if (data.pcbLoaded) return
    data.pcbLoaded = true
    const loader = new STLLoader()
    const geo = await loader.loadAsync(`${BASE}/pcb.stl`)
    geo.translate(PCB_XY_OFFSET.x, PCB_XY_OFFSET.y, 0)
    data.pcbGroup.add(new Mesh(normalize(geo), pcbMat))
}
