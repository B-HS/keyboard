import { Group } from 'three'
import { buildCaseMeshes, buildBoxPreview, type CaseLayers } from './viewer/case-meshes'
import { buildSwitches, buildKeycaps } from '@renderer/models'
import { applyLayerStyle } from '@renderer/materials'
import { LAYER_KEYS, type LayerKey, type LayerStyle, type ProjectUnit } from '@renderer/types'
import { SIDES } from './config/layout'
import { Z, KEY_PITCH, KEYCAP_GAP, KEYCAP_BOTTOM_Z } from './config/dimensions'

export const meta = { id: 'keypad', label: 'split-keypad (19키)' }

const MODEL_DIMS = { keyPitch: KEY_PITCH, keycapGap: KEYCAP_GAP, keycapBottomZ: KEYCAP_BOTTOM_Z, switchStemTopZ: Z.plateTop + 8.5 }

export const createProject = (onChange: () => void): ProjectUnit => {
    const group = new Group()
    const side = SIDES.main
    if (!side) throw new Error('keypad SIDES.main missing')
    const styles = Object.fromEntries(LAYER_KEYS.map((key) => [key, { visible: true, opacity: 0.8, color: null }])) as Record<LayerKey, LayerStyle>

    const cm = buildCaseMeshes(side)
    const layers: CaseLayers = { ...cm.layers }
    group.add(cm.group)

    const applyStyles = () => {
        for (const key of LAYER_KEYS) {
            const layer = layers[key]
            if (layer) applyLayerStyle(layer, styles[key])
        }
    }
    applyStyles()

    Promise.all([buildSwitches(side, MODEL_DIMS), buildKeycaps(side, MODEL_DIMS)])
        .then(([switches, keycaps]) => {
            layers.switches = switches
            layers.keycaps = keycaps
            cm.group.add(switches, keycaps)
            applyStyles()
            onChange()
        })
        .catch((error) => {
            console.error('[models] real models failed, using boxes', error)
            const box = buildBoxPreview(side)
            layers.switches = box.switches
            layers.keycaps = box.keycaps
            cm.group.add(box.switches, box.keycaps)
            applyStyles()
            onChange()
        })

    const co = side.caseOutline

    return {
        group,
        bounds: { xMin: co.cx - co.w / 2, xMax: co.cx + co.w / 2, yMin: co.cy - co.h / 2, yMax: co.cy + co.h / 2 },
        layerKeys: LAYER_KEYS,
        references: [],
        setLayerStyle: (key, style) => {
            styles[key] = style
            const layer = layers[key]
            if (layer) applyLayerStyle(layer, style)
        },
    }
}
