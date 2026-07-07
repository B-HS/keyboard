import { Group } from 'three'
import { buildCaseMeshesFdm, buildBoxPreview, type CaseLayers } from './viewer/case-meshes'
import { buildSwitches, buildKeycaps } from '@renderer/models'
import { applyLayerStyle } from '@renderer/materials'
import { LAYER_KEYS, type LayerKey, type LayerStyle, type ProjectUnit, type ReferenceToggle } from '@renderer/types'
import { loadPcbModel } from './viewer/pcb-model'
import { loadEsp32Model } from './viewer/esp32-model'
import { buildReferenceKeyboard } from './viewer/reference-keyboard'
import { buildReference49, loadPcb49 } from './viewer/reference-49'
import { SIDES } from './config/layout'
import { Z, KEY_PITCH, KEYCAP_GAP, KEYCAP_BOTTOM_Z } from './config/dimensions'

export const meta = { id: '65', label: 'split-65 (좌+우)' }

const GAP = 40
const MODEL_DIMS = { keyPitch: KEY_PITCH, keycapGap: KEYCAP_GAP, keycapBottomZ: KEYCAP_BOTTOM_Z, switchStemTopZ: Z.plateTop + 8.5 }

const FDM_LAYER_KEYS = ['top', 'pcb', 'bottom', 'esp32', 'bolts', 'switches', 'keycaps'] as const satisfies readonly LayerKey[]

export const createProject = (onChange: () => void): ProjectUnit => {
    const group = new Group()
    const instances: { layers: CaseLayers; tiltGroup: Group }[] = []
    const styles = Object.fromEntries(LAYER_KEYS.map((key) => [key, { visible: true, opacity: 0.8, color: null }])) as Record<LayerKey, LayerStyle>
    let zenGroup: Group | null = null
    let kb49Group: Group | null = null

    const applyStyles = (inst: { layers: CaseLayers }) => {
        for (const key of LAYER_KEYS) {
            const layer = inst.layers[key]
            if (layer) applyLayerStyle(layer, styles[key])
        }
    }

    const buildInstance = (key: keyof typeof SIDES, offsetX: number) => {
        const side = SIDES[key]
        const cm = buildCaseMeshesFdm(side)
        cm.group.position.x = offsetX
        const inst = { layers: cm.layers, tiltGroup: cm.tiltGroup }
        group.add(cm.group)
        instances.push(inst)
        applyStyles(inst)
        loadEsp32Model(side)
            .then((model) => {
                cm.group.add(model)
                inst.layers.esp32 = model
                applyStyles(inst)
                onChange()
            })
            .catch((error) => console.error('[esp32-model] glb load failed', error))
        loadPcbModel(key)
            .then((model) => {
                const placeholder = inst.layers.pcb
                if (placeholder) inst.tiltGroup.remove(placeholder)
                inst.tiltGroup.add(model)
                inst.layers.pcb = model
                applyStyles(inst)
                onChange()
            })
            .catch((error) => console.error('[pcb-model] glb load failed, keeping procedural pcb', error))
        Promise.all([buildSwitches(side, MODEL_DIMS), buildKeycaps(side, MODEL_DIMS)])
            .then(([switches, keycaps]) => {
                inst.layers.switches = switches
                inst.layers.keycaps = keycaps
                inst.tiltGroup.add(switches, keycaps)
                applyStyles(inst)
                onChange()
            })
            .catch((error) => {
                console.error('[models] real models failed, using boxes', error)
                const box = buildBoxPreview(side)
                inst.layers.switches = box.switches
                inst.layers.keycaps = box.keycaps
                inst.tiltGroup.add(box.switches, box.keycaps)
                applyStyles(inst)
                onChange()
            })
    }

    const left = SIDES.left
    const right = SIDES.right
    const leftOffset = -GAP / 2 - (left.caseOutline.cx + left.caseOutline.w / 2)
    const rightOffset = GAP / 2 - (right.caseOutline.cx - right.caseOutline.w / 2)
    buildInstance('left', leftOffset)
    buildInstance('right', rightOffset)

    zenGroup = buildReferenceKeyboard()
    const rightEdge = rightOffset + right.caseOutline.cx + right.caseOutline.w / 2
    const zenWidth = (zenGroup.userData as { caseWidth: number }).caseWidth
    zenGroup.position.set(rightEdge + 50 + zenWidth / 2, left.bbox.cy, Z.bottomBottom)
    zenGroup.visible = false
    group.add(zenGroup)

    buildReference49().then((g) => {
        kb49Group = g
        const splitMidX = (leftOffset + left.caseOutline.cx + rightOffset + right.caseOutline.cx) / 2
        const frontY = left.bbox.minY - 55 - (g.userData as { caseDepth: number }).caseDepth / 2
        g.position.set(splitMidX, frontY, Z.bottomBottom)
        g.visible = false
        group.add(g)
        onChange()
    })

    const references: ReferenceToggle[] = [
        {
            key: 'zen',
            label: 'Zen 65 (비교)',
            set: (v) => {
                if (zenGroup) zenGroup.visible = v
            },
        },
        {
            key: '49',
            label: '49 (비교)',
            set: (v) => {
                if (kb49Group) kb49Group.visible = v
            },
        },
        {
            key: '49pcb',
            label: '49 PCB (무거움)',
            set: async (v) => {
                if (!kb49Group) return
                const data = kb49Group.userData as { pcbGroup: Group }
                if (v) {
                    await loadPcb49(kb49Group)
                    data.pcbGroup.visible = true
                } else {
                    data.pcbGroup.visible = false
                }
            },
        },
    ]

    return {
        group,
        bounds: {
            xMin: leftOffset + left.caseOutline.cx - left.caseOutline.w / 2,
            xMax: rightOffset + right.caseOutline.cx + right.caseOutline.w / 2,
            yMin: Math.min(left.caseOutline.cy - left.caseOutline.h / 2, right.caseOutline.cy - right.caseOutline.h / 2),
            yMax: Math.max(left.caseOutline.cy + left.caseOutline.h / 2, right.caseOutline.cy + right.caseOutline.h / 2),
        },
        layerKeys: FDM_LAYER_KEYS,
        references,
        setLayerStyle: (key, style) => {
            styles[key] = style
            for (const inst of instances) {
                const layer = inst.layers[key]
                if (layer) applyLayerStyle(layer, style)
            }
        },
    }
}
