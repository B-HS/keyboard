import { Group } from 'three'
import { buildCaseMeshes, buildBoxPreview, type CaseLayers } from './viewer/case-meshes'
import { buildSwitches, buildKeycaps } from '@renderer/models'
import { applyLayerStyle } from '@renderer/materials'
import { LAYER_KEYS, type LayerKey, type LayerStyle, type ProjectUnit } from '@renderer/types'
import { SIDE } from './config/layout'
import { KEY_PITCH, KEYCAP_GAP, KEYCAP_BOTTOM_Z, SWITCH_STEM_TOP_Z } from './config/dimensions'

export const meta = { id: 'keypad-17', label: 'keypad-17 (handwire)' }

const MODEL_DIMS = { keyPitch: KEY_PITCH, keycapGap: KEYCAP_GAP, keycapBottomZ: KEYCAP_BOTTOM_Z, switchStemTopZ: SWITCH_STEM_TOP_Z }

const PROJECT_LAYER_KEYS = ['top', 'plate', 'bottom', 'esp32', 'bolts', 'switches', 'keycaps'] as const satisfies readonly LayerKey[]

export const createProject = (onChange: () => void): ProjectUnit => {
    const group = new Group()
    const styles = Object.fromEntries(LAYER_KEYS.map((key) => [key, { visible: true, opacity: 0.8, color: null }])) as Record<LayerKey, LayerStyle>

    const cm = buildCaseMeshes(SIDE)
    group.add(cm.group)
    const layers: CaseLayers = cm.layers

    const applyStyles = () => {
        for (const key of LAYER_KEYS) {
            const layer = layers[key]
            if (layer) applyLayerStyle(layer, styles[key])
        }
    }
    applyStyles()

    Promise.all([buildSwitches(SIDE, MODEL_DIMS), buildKeycaps(SIDE, MODEL_DIMS)])
        .then(([switches, keycaps]) => {
            layers.switches = switches
            layers.keycaps = keycaps
            cm.group.add(switches, keycaps)
            applyStyles()
            onChange()
        })
        .catch((error) => {
            console.error('[models] real models failed, using boxes', error)
            const box = buildBoxPreview(SIDE)
            layers.switches = box.switches
            layers.keycaps = box.keycaps
            cm.group.add(box.switches, box.keycaps)
            applyStyles()
            onChange()
        })

    return {
        group,
        bounds: {
            xMin: SIDE.caseOutline.cx - SIDE.caseOutline.w / 2,
            xMax: SIDE.caseOutline.cx + SIDE.caseOutline.w / 2,
            yMin: SIDE.caseOutline.cy - SIDE.caseOutline.h / 2,
            yMax: SIDE.caseOutline.cy + SIDE.caseOutline.h / 2,
        },
        layerKeys: PROJECT_LAYER_KEYS,
        references: [],
        setLayerStyle: (key, style) => {
            styles[key] = style
            const layer = layers[key]
            if (layer) applyLayerStyle(layer, style)
        },
    }
}
