import { Color, Material, MeshStandardMaterial, type Object3D } from 'three'
import type { LayerStyle } from './types'

export type TranslucencyMode = 'hash' | 'blend'

const materialsOf = (obj: Object3D) => {
    if (!('material' in obj)) return []
    const material = (obj as { material: Material | Material[] }).material
    return Array.isArray(material) ? material : [material]
}

const applyTranslucency = (m: Material, mode: TranslucencyMode) => {
    const translucent = m.userData.translucent === true
    m.alphaHash = translucent && mode === 'hash'
    m.transparent = translucent && mode === 'blend'
    m.depthWrite = !(translucent && mode === 'blend')
    m.needsUpdate = true
}

export const applyLayerStyle = (root: Object3D, style: LayerStyle, mode: TranslucencyMode = 'hash') => {
    root.visible = style.visible
    root.traverse((obj) => {
        for (const m of materialsOf(obj)) {
            m.opacity = style.opacity
            m.userData.translucent = style.opacity < 1
            applyTranslucency(m, mode)
            if (m instanceof MeshStandardMaterial) {
                if (m.userData.defaultColor === undefined) m.userData.defaultColor = m.color.getHex()
                m.color.set(style.color !== null ? new Color(style.color) : (m.userData.defaultColor as number))
            }
        }
    })
}

export const applyTranslucencyMode = (root: Object3D, mode: TranslucencyMode) => {
    root.traverse((obj) => {
        for (const m of materialsOf(obj)) {
            if (m.userData.translucent === undefined) continue
            applyTranslucency(m, mode)
        }
    })
}
