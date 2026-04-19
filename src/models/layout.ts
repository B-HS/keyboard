import layoutData from '../../docs/models/49.json'

export const U = 19.05

export type KleToken = string | { x?: number; y?: number; w?: number; h?: number }
export type KleRow = KleToken[]
export type KleLayout = KleRow[]

export type KeyPos = {
    id: string
    cx: number
    cy: number
    w: number
    h: number
}

export type Bounds = {
    minX: number
    maxX: number
    minY: number
    maxY: number
}

export type Padding = {
    top: number
    bottom: number
    left: number
    right: number
}

export type StabSpec = {
    padSize: [number, number]
    padCornerRadius: number
    padOffsetY: number
    spacingByWidth: Record<number, number>
}

export const DEFAULT_STAB: StabSpec = {
    padSize: [7, 15],
    padCornerRadius: 0.5,
    padOffsetY: -1.5,
    spacingByWidth: { 2: 11.938, 2.25: 11.938, 2.5: 11.938, 2.75: 11.938, 3: 11.938, 6.25: 50, 7: 57.15 },
}

export const parseLayout = (layout: KleLayout): KeyPos[] => {
    const keys: KeyPos[] = []
    let y = 0
    for (const row of layout) {
        let x = 0
        let w = 1
        let h = 1
        for (const token of row) {
            if (typeof token === 'object') {
                if (token.x !== undefined) x += token.x
                if (token.y !== undefined) y += token.y
                if (token.w !== undefined) w = token.w
                if (token.h !== undefined) h = token.h
            } else {
                keys.push({
                    id: token,
                    cx: (x + w / 2) * U - U / 2,
                    cy: -((y + h / 2) * U - U / 2),
                    w,
                    h,
                })
                x += w
                w = 1
                h = 1
            }
        }
        y += 1
    }
    return keys
}

export const computeBounds = (keys: KeyPos[], padding: Padding): Bounds => {
    let minX = Infinity
    let maxX = -Infinity
    let minY = Infinity
    let maxY = -Infinity
    for (const k of keys) {
        const halfW = (k.w * U) / 2
        const halfH = (k.h * U) / 2
        if (k.cx - halfW < minX) minX = k.cx - halfW
        if (k.cx + halfW > maxX) maxX = k.cx + halfW
        if (k.cy - halfH < minY) minY = k.cy - halfH
        if (k.cy + halfH > maxY) maxY = k.cy + halfH
    }
    return {
        minX: minX - padding.left,
        maxX: maxX + padding.right,
        minY: minY - padding.bottom,
        maxY: maxY + padding.top,
    }
}

export const screwPositions = (bounds: Bounds, margin: number): Array<[number, number]> => [
    [bounds.minX + margin, bounds.minY + margin],
    [bounds.maxX - margin, bounds.minY + margin],
    [bounds.minX + margin, bounds.maxY - margin],
    [bounds.maxX - margin, bounds.maxY - margin],
]

export const stabbedKeys = (keys: KeyPos[], spec: StabSpec): KeyPos[] =>
    keys.filter((k) => spec.spacingByWidth[k.w] !== undefined)

export const keys49: KeyPos[] = parseLayout(layoutData as KleLayout)
