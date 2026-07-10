import type { Group } from 'three'

export type SwitchSpec = { x: number; y: number; u: number; vSpan?: number }
export type StabSpec = { x: number; y: number; rot?: number }
export type MountHole = { x: number; y: number }
export type Rect = { cx: number; cy: number; w: number; h: number }
export type Bbox = { minX: number; maxX: number; minY: number; maxY: number; cx: number; cy: number; w: number; h: number }

export type Side = {
    label: string
    switches: SwitchSpec[]
    stabs: StabSpec[]
    bbox: Bbox
    caseOutline: Rect
    opening: Rect
    mountHoles: MountHole[]
}

export type ModelDims = {
    keyPitch: number
    keycapGap: number
    keycapBottomZ: number
    switchStemTopZ: number
}

export const LAYER_KEYS = ['top', 'plate', 'pcb', 'bottom', 'esp32', 'spacers', 'bolts', 'switches', 'keycaps'] as const
export type LayerKey = (typeof LAYER_KEYS)[number]

export type LayerStyle = { visible: boolean; opacity: number; color: string | null }

export type ReferenceToggle = { key: string; label: string; set: (visible: boolean) => void | Promise<void> }

export type ProjectBounds = { xMin: number; xMax: number; yMin: number; yMax: number }

export type ProjectUnit = {
    group: Group
    bounds: ProjectBounds
    layerKeys: readonly LayerKey[]
    references: ReferenceToggle[]
    setLayerStyle: (key: LayerKey, style: LayerStyle) => void
}

export type ProjectModule = {
    meta: { id: string; label: string }
    createProject: (onChange: () => void) => ProjectUnit
}
