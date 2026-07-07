import { LAYER_KEYS, type LayerKey, type LayerStyle } from '@renderer/types'

export type ViewerSettings = {
    version: 1
    layers: Record<LayerKey, LayerStyle>
    references: Record<string, boolean>
}

const STORAGE_KEY = 'split-keyboards:viewer-settings:v1'

export const DEFAULT_LAYER_STYLE: LayerStyle = { visible: true, opacity: 0.8, color: null }

export const createDefaultSettings = (): ViewerSettings => ({
    version: 1,
    layers: Object.fromEntries(LAYER_KEYS.map((key) => [key, { ...DEFAULT_LAYER_STYLE }])) as Record<LayerKey, LayerStyle>,
    references: {},
})

const isLayerStyle = (value: unknown): value is LayerStyle => {
    if (typeof value !== 'object' || value === null) return false
    const v = value as Record<string, unknown>
    return typeof v.visible === 'boolean' && typeof v.opacity === 'number' && (v.color === null || typeof v.color === 'string')
}

export const loadSettings = (): ViewerSettings => {
    const fallback = createDefaultSettings()
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return fallback
        const parsed: unknown = JSON.parse(raw)
        if (typeof parsed !== 'object' || parsed === null) return fallback
        const p = parsed as Record<string, unknown>
        if (p.version !== 1 || typeof p.layers !== 'object' || p.layers === null) return fallback
        const layers = { ...fallback.layers }
        for (const key of LAYER_KEYS) {
            const candidate = (p.layers as Record<string, unknown>)[key]
            if (isLayerStyle(candidate)) layers[key] = candidate
        }
        const references: Record<string, boolean> = {}
        if (typeof p.references === 'object' && p.references !== null) {
            for (const [k, v] of Object.entries(p.references)) if (typeof v === 'boolean') references[k] = v
        }
        return { version: 1, layers, references }
    } catch {
        return fallback
    }
}

export const saveSettings = (settings: ViewerSettings) => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
        return
    }
}
