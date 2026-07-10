import { BufferGeometry, Mesh, MeshStandardMaterial, type Object3D } from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export type ColorGroup = { color: number; geometry: BufferGeometry; isStem?: boolean }

export const mergeModelByColor = (model: Object3D) => {
    model.updateMatrixWorld(true)
    const byColor = new Map<number, BufferGeometry[]>()
    model.traverse((obj) => {
        if (!(obj instanceof Mesh)) return
        const raw = obj.geometry as BufferGeometry
        const source = raw.index ? raw.toNonIndexed() : raw
        const baked = new BufferGeometry()
        const position = source.getAttribute('position')
        if (!position) return
        baked.setAttribute('position', position.clone())
        const normal = source.getAttribute('normal')
        if (normal) baked.setAttribute('normal', normal.clone())
        baked.applyMatrix4(obj.matrixWorld)
        if (!baked.getAttribute('normal')) baked.computeVertexNormals()
        const material = Array.isArray(obj.material) ? obj.material[0] : obj.material
        const hex =
            material instanceof MeshStandardMaterial || (material && 'color' in material)
                ? (material as MeshStandardMaterial).color.getHex()
                : 0x888888
        const list = byColor.get(hex) ?? []
        list.push(baked)
        byColor.set(hex, list)
    })

    const groups: ColorGroup[] = []
    for (const [color, geometryList] of byColor) {
        const merged = mergeGeometries(geometryList, false)
        merged.computeBoundingBox()
        groups.push({ color, geometry: merged })
    }
    return groups
}
