import { Group, InstancedMesh, Matrix4, Mesh, MeshStandardMaterial, ObjectLoader, Vector3, type BufferGeometry } from 'three'
import { VRMLLoader } from 'three/addons/loaders/VRMLLoader.js'
import { mergeModelByColor, type ColorGroup } from './instancing'
import type { ModelDims, Side } from './types'

const SWITCH_WRL = `${import.meta.env.BASE_URL}models/switch/silent_alpaca.wrl`
const KEYCAPS_JSON = `${import.meta.env.BASE_URL}models/keycap/keycaps.json`
const KICAD_WRL_SCALE = 2.54
const DCS_ROWS5 = [1, 2, 3, 4, 4] as const

const KEYCAP_MATERIAL = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.05, roughness: 0.75 })

type SwitchCache = { groups: ColorGroup[]; topZ: number }
type KeycapEntry = { geometry: BufferGeometry; material: MeshStandardMaterial; width: number; depth: number }

let switchCache: Promise<SwitchCache> | null = null
let keycapCache: Promise<Map<string, KeycapEntry>> | null = null

const loadSwitchGroups = () => {
    switchCache ??= (async () => {
        const model = await new VRMLLoader().loadAsync(SWITCH_WRL)
        model.scale.setScalar(KICAD_WRL_SCALE)
        const groups = mergeModelByColor(model)
        let topZ = -Infinity
        let stem: ColorGroup | null = null
        for (const g of groups) {
            const gz = g.geometry.boundingBox?.max.z ?? -Infinity
            if (gz > topZ) {
                topZ = gz
                stem = g
            }
        }
        for (const g of groups) g.isStem = g === stem
        return { groups, topZ }
    })()
    return switchCache
}

const switchMaterial = (g: ColorGroup) => new MeshStandardMaterial({ color: g.isStem ? 0x2b6cff : 0x141414, metalness: 0.3, roughness: 0.5 })

export const buildSwitches = async (side: Side, dims: ModelDims) => {
    const { groups, topZ } = await loadSwitchGroups()
    const zOffset = dims.switchStemTopZ - topZ
    const matrices = side.switches.map((s) => new Matrix4().makeTranslation(s.x, s.y, zOffset))
    const group = new Group()
    for (const g of groups) {
        const mesh = new InstancedMesh(g.geometry, switchMaterial(g), matrices.length)
        matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
        mesh.instanceMatrix.needsUpdate = true
        group.add(mesh)
    }
    return group
}

const loadKeycapLibrary = () => {
    keycapCache ??= (async () => {
        const text = await (await fetch(KEYCAPS_JSON)).text()
        const data: unknown = JSON.parse(
            text
                .trim()
                .replace(/^data\s*=\s*/, '')
                .replace(/;?\s*$/, ''),
        )
        const scene = new ObjectLoader().parse(data as Parameters<ObjectLoader['parse']>[0])
        const keycaps = scene.getObjectByName('keycaps')
        const lib = new Map<string, KeycapEntry>()
        keycaps?.traverse((obj) => {
            if (!(obj instanceof Mesh)) return
            const geometry = obj.geometry as BufferGeometry
            geometry.scale(-1, -1, 1)
            geometry.computeVertexNormals()
            geometry.computeBoundingBox()
            const box = geometry.boundingBox
            if (!box) return
            const center = box.getCenter(new Vector3())
            geometry.translate(-center.x, -center.y, 0)
            lib.set(obj.name, { geometry, material: KEYCAP_MATERIAL, width: box.max.x - box.min.x, depth: box.max.y - box.min.y })
        })
        return lib
    })()
    return keycapCache
}

const pickCap = (lib: Map<string, KeycapEntry>, rowIndex: number, lengthU: number) => {
    if (lengthU >= 5.5) {
        for (const w of [7, 6]) if (lengthU >= w - 0.5 && lib.has(`DCS SPACE ${w}u`)) return `DCS SPACE ${w}u`
        if (lib.has('DCS SPACE')) return 'DCS SPACE'
    }
    const profile = DCS_ROWS5[Math.min(rowIndex, 4)]
    let best: string | null = null
    let bestDiff = Infinity
    for (const name of lib.keys()) {
        const match = name.match(/^DCS R(\d)(?:\s+([\d.]+))?$/)
        if (!match || Number(match[1]) !== profile) continue
        const width = match[2] ? Number(match[2]) : 1
        const diff = Math.abs(width - lengthU)
        if (diff < bestDiff) {
            bestDiff = diff
            best = name
        }
    }
    return best ?? 'DCS R3'
}

export const buildKeycaps = async (side: Side, dims: ModelDims) => {
    const lib = await loadKeycapLibrary()
    const byCap = new Map<string, Side['switches']>()
    for (const s of side.switches) {
        const row = Math.round(-s.y / dims.keyPitch)
        const name = pickCap(lib, row, s.u)
        const list = byCap.get(name) ?? []
        list.push(s)
        byCap.set(name, list)
    }

    const group = new Group()
    for (const [name, list] of byCap) {
        const entry = lib.get(name)
        if (!entry) continue
        const mesh = new InstancedMesh(entry.geometry, entry.material, list.length)
        list.forEach((s, i) => {
            const scaleX = (s.u * dims.keyPitch - dims.keycapGap) / entry.width
            const scaleY = ((s.vSpan ?? 1) * dims.keyPitch - dims.keycapGap) / entry.depth
            const matrix = new Matrix4().makeTranslation(s.x, s.y, dims.keycapBottomZ).multiply(new Matrix4().makeScale(scaleX, scaleY, 1))
            mesh.setMatrixAt(i, matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
        group.add(mesh)
    }
    return group
}
