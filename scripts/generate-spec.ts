import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Resvg } from '@resvg/resvg-js'
import type { Bounds } from '../src/models/layout'
import { caseBounds, DEFAULT_CASE_PARAMS, SLA_CASE_PARAMS } from '../src/models/case'
import { screwPositions } from '../src/models/layout'

const fmt = (n: number) => n.toFixed(3)

type SpecInput = {
    plateBounds: Bounds
    screwHoleMargin: number
}

type SidePart = 'top' | 'bottom'

const commonStyles = `
    .title { font-size: 18px; font-weight: bold; }
    .subtitle { font-size: 14px; font-weight: bold; }
    .dim { fill: #c00; font-size: 12px; font-weight: bold; }
    .callout { fill: #0066cc; font-size: 11px; font-weight: bold; }
    .note { fill: #333; font-size: 11px; }
    .spec { fill: #000; font-size: 12px; }
    .case { stroke: #333; stroke-width: 1.5; fill: #f5f5f5; }
    .plate-outline { stroke: #888; stroke-width: 0.8; stroke-dasharray: 4,3; fill: none; }
    .hole { fill: #fff; stroke: #c00; stroke-width: 1.5; }
    .pillar { fill: #ffe8a0; stroke: #888; stroke-width: 0.8; }
    .boss { fill: #d4e8d4; stroke: #888; stroke-width: 0.8; }
    .insert-body { fill: #d4a84a; stroke: #8b6914; stroke-width: 1; }
    .insert-thread { stroke: #8b6914; stroke-width: 0.5; }
`

const holeSection = (holeD: number, holeDepth: number, insertLen: number) => `
  <text x="620" y="80" class="subtitle">③ Hole Section</text>
  <rect x="650" y="100" width="100" height="170" fill="#e8e8e0" stroke="#666" stroke-width="1"/>
  <rect x="682" y="100" width="36" height="70" fill="#fff" stroke="#c00" stroke-width="1.5"/>
  <rect x="683" y="100" width="34" height="50" class="insert-body"/>
  <line x1="685" y1="105" x2="715" y2="105" class="insert-thread"/>
  <line x1="685" y1="115" x2="715" y2="115" class="insert-thread"/>
  <line x1="685" y1="125" x2="715" y2="125" class="insert-thread"/>
  <line x1="685" y1="135" x2="715" y2="135" class="insert-thread"/>
  <line x1="685" y1="145" x2="715" y2="145" class="insert-thread"/>
  <text x="630" y="138" class="dim">Ø ${holeD} mm</text>
  <text x="760" y="140" class="dim">${holeDepth.toFixed(1)} mm</text>
  <text x="635" y="280" class="callout">Hole Ø${holeD} × ${holeDepth}mm</text>
  <text x="635" y="295" class="callout">Insert Ø4 × ${insertLen}mm brass</text>
  <text x="635" y="310" class="callout">(${holeDepth - insertLen}mm empty below insert)</text>
`

export const generateCaseTopSpec = ({ plateBounds }: SpecInput): string => {
    const caseP = DEFAULT_CASE_PARAMS
    const cb = caseBounds(plateBounds, caseP)
    const sla = SLA_CASE_PARAMS
    const holeR = sla.sideFastenerInsertRadius
    const holeD = holeR * 2
    const holeDepth = sla.sideFastenerInsertDepth

    const yRange = cb.maxY - cb.minY
    const [r1, r2] = sla.sideFastenerYRatios
    const y1 = cb.minY + yRange * r1
    const y2 = cb.minY + yRange * r2
    const xLo = cb.minX + caseP.wallThickness + sla.sideFastenerSize / 2
    const xHi = cb.maxX - caseP.wallThickness - sla.sideFastenerSize / 2
    const centers: Array<[number, number, string]> = [
        [xLo, y1, '① L-Y50%'],
        [xHi, y1, '② R-Y50%'],
        [xLo, y2, '③ L-Y75%'],
        [xHi, y2, '④ R-Y75%'],
    ]

    const SCALE = 2
    const PAD_X = 30
    const PAD_Y = 110
    const caseW = (cb.maxX - cb.minX) * SCALE
    const caseH = (cb.maxY - cb.minY) * SCALE
    const plateW = (plateBounds.maxX - plateBounds.minX) * SCALE
    const plateH = (plateBounds.maxY - plateBounds.minY) * SCALE
    const toSvg = (x: number, y: number) => ({
        x: (x - cb.minX) * SCALE + PAD_X,
        y: (cb.maxY - y) * SCALE + PAD_Y,
    })

    const holes = centers
        .map(([x, y, label]) => {
            const p = toSvg(x, y)
            const bossPx = sla.sideFastenerSize * SCALE
            const holePx = holeR * SCALE
            const labelDx = x < 0 ? 10 : -65
            return `
    <rect x="${p.x - bossPx / 2}" y="${p.y - bossPx / 2}" width="${bossPx}" height="${bossPx}" class="boss"/>
    <circle cx="${p.x}" cy="${p.y}" r="${holePx}" class="hole"/>
    <text x="${p.x + labelDx}" y="${p.y + 3}" class="callout">${label}</text>`
        })
        .join('')

    const botY = PAD_Y + caseH

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${botY + 180}" viewBox="0 0 820 ${botY + 180}" font-family="Arial, sans-serif" font-size="11">
  <style>${commonStyles}</style>

  <text x="410" y="30" class="title" text-anchor="middle">Threaded Insert Spec — 1_case-top_SLA.stl</text>
  <text x="410" y="50" class="note" text-anchor="middle">Hole: Ø${holeD} × ${holeDepth}mm  |  Insert: M3*4*5 brass  |  Qty: 4</text>

  <text x="30" y="75" class="subtitle">① Top view — side wall insert pockets (open DOWNWARD)</text>
  <text x="30" y="90" class="note">View from above the top case. Inserts install from bottom (open side) upward into the bosses.</text>

  <rect x="${PAD_X}" y="${PAD_Y}" width="${caseW}" height="${caseH}" rx="4" ry="4" class="case"/>
  <rect x="${PAD_X + (plateBounds.minX - cb.minX) * SCALE}" y="${PAD_Y + (cb.maxY - plateBounds.maxY) * SCALE}" width="${plateW}" height="${plateH}" rx="2" ry="2" class="plate-outline"/>
  ${holes}

  <text x="${PAD_X + caseW / 2}" y="${PAD_Y + 15}" class="note" text-anchor="middle" font-style="italic">← Back (Y+)</text>
  <text x="${PAD_X + caseW / 2}" y="${botY - 5}" class="note" text-anchor="middle" font-style="italic">→ Front (Y−, user side)</text>
  <text x="${PAD_X + caseW / 2}" y="${botY + 18}" class="dim" text-anchor="middle">${fmt(cb.maxX - cb.minX)} × ${fmt(cb.maxY - cb.minY)} mm  (plate-derived)</text>
${holeSection(holeD, holeDepth, 5)}

  <rect x="30" y="${botY + 40}" width="760" height="120" fill="#fffbe6" stroke="#333" stroke-width="1"/>
  <text x="40" y="${botY + 60}" class="subtitle">JLC3DP Order Spec (this file)</text>
  <text x="40" y="${botY + 82}" class="spec">• Material: SLA Resin (9000HE or equivalent)</text>
  <text x="40" y="${botY + 100}" class="spec">• Surface finish: Threaded Insert, type M3*4*5</text>
  <text x="40" y="${botY + 118}" class="spec">• Hole (already modeled): Ø${holeD} × ${holeDepth}mm, 4 pockets at positions shown above</text>
  <text x="40" y="${botY + 136}" class="spec">• Screw used: M3×6 button head (inserted from bottom case side, through counterbore+through-hole in bottom floor)</text>
</svg>
`
}

export const generateCaseBottomSpec = ({ plateBounds, screwHoleMargin }: SpecInput): string => {
    const caseP = DEFAULT_CASE_PARAMS
    const cb = caseBounds(plateBounds, caseP)
    const sla = SLA_CASE_PARAMS
    const holeR = sla.plateMountInsertRadius
    const holeD = holeR * 2
    const holeDepth = sla.plateMountInsertDepth

    const plateScrews = screwPositions(plateBounds, screwHoleMargin)

    const SCALE = 2
    const PAD_X = 30
    const PAD_Y = 110
    const caseW = (cb.maxX - cb.minX) * SCALE
    const caseH = (cb.maxY - cb.minY) * SCALE
    const plateW = (plateBounds.maxX - plateBounds.minX) * SCALE
    const plateH = (plateBounds.maxY - plateBounds.minY) * SCALE
    const toSvg = (x: number, y: number) => ({
        x: (x - cb.minX) * SCALE + PAD_X,
        y: (cb.maxY - y) * SCALE + PAD_Y,
    })

    const pillarR = sla.plateMountPostRadius
    const holes = plateScrews
        .map(([x, y], idx) => {
            const p = toSvg(x, y)
            const pillarPx = pillarR * SCALE
            const holePx = holeR * SCALE
            const label = ['⑤ BL', '⑥ BR', '⑦ FL', '⑧ FR'][idx] ?? `⑤+${idx}`
            const labelDx = x < 0 ? 10 : -40
            return `
    <circle cx="${p.x}" cy="${p.y}" r="${pillarPx}" class="pillar"/>
    <circle cx="${p.x}" cy="${p.y}" r="${holePx}" class="hole"/>
    <text x="${p.x + labelDx}" y="${p.y + 3}" class="callout">${label}</text>`
        })
        .join('')

    const botY = PAD_Y + caseH

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="820" height="${botY + 180}" viewBox="0 0 820 ${botY + 180}" font-family="Arial, sans-serif" font-size="11">
  <style>${commonStyles}</style>

  <text x="410" y="30" class="title" text-anchor="middle">Threaded Insert Spec — 2_case-bottom_SLA.stl</text>
  <text x="410" y="50" class="note" text-anchor="middle">Hole: Ø${holeD} × ${holeDepth}mm  |  Insert: M3*4*5 brass  |  Qty: 4</text>

  <text x="30" y="75" class="subtitle">① Top view — pillar-top insert pockets (open UPWARD)</text>
  <text x="30" y="90" class="note">View from above. Pillars are vertical; pocket axis tilted 8° to match plate. Inserts install from pillar top downward.</text>

  <rect x="${PAD_X}" y="${PAD_Y}" width="${caseW}" height="${caseH}" rx="4" ry="4" class="case"/>
  <rect x="${PAD_X + (plateBounds.minX - cb.minX) * SCALE}" y="${PAD_Y + (cb.maxY - plateBounds.maxY) * SCALE}" width="${plateW}" height="${plateH}" rx="2" ry="2" class="plate-outline"/>
  ${holes}

  <text x="${PAD_X + caseW / 2}" y="${PAD_Y + 15}" class="note" text-anchor="middle" font-style="italic">← Back (Y+)</text>
  <text x="${PAD_X + caseW / 2}" y="${botY - 5}" class="note" text-anchor="middle" font-style="italic">→ Front (Y−, user side)</text>
  <text x="${PAD_X + caseW / 2}" y="${botY + 18}" class="dim" text-anchor="middle">${fmt(cb.maxX - cb.minX)} × ${fmt(cb.maxY - cb.minY)} mm  (plate-derived)</text>
${holeSection(holeD, holeDepth, 5)}

  <rect x="30" y="${botY + 40}" width="760" height="120" fill="#fffbe6" stroke="#333" stroke-width="1"/>
  <text x="40" y="${botY + 60}" class="subtitle">JLC3DP Order Spec (this file)</text>
  <text x="40" y="${botY + 82}" class="spec">• Material: SLA Resin (9000HE or equivalent)</text>
  <text x="40" y="${botY + 100}" class="spec">• Surface finish: Threaded Insert, type M3*4*5</text>
  <text x="40" y="${botY + 118}" class="spec">• Hole (already modeled): Ø${holeD} × ${holeDepth}mm tilted 8°, 4 pockets at plate-corner pillars</text>
  <text x="40" y="${botY + 136}" class="spec">• Screw used: M3×6 button head (inserted from above plate, through plate hole, into insert at pillar top)</text>
</svg>
`
}

const renderSvgToPng = (svg: string): Buffer => {
    const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1600 } })
    return Buffer.from(resvg.render().asPng())
}

const _writeOne = (name: string, svg: string, outDir: string, part: SidePart) => {
    void part
    const svgPath = `${outDir}${name}.svg`
    writeFileSync(svgPath, svg)
    console.log(`Wrote ${svgPath} (${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB)`)
    const pngData = renderSvgToPng(svg)
    const pngPath = `${outDir}${name}.png`
    writeFileSync(pngPath, pngData)
    console.log(`Wrote ${pngPath} (${(pngData.length / 1024).toFixed(1)} KB)`)
}

export const writeInsertSpec = (input: SpecInput, outDir: string) => {
    _writeOne('insert-spec-case-top', generateCaseTopSpec(input), outDir, 'top')
    _writeOne('insert-spec-case-bottom', generateCaseBottomSpec(input), outDir, 'bottom')
}

if (import.meta.main) {
    const { defaults } = await import('./load-defaults')
    const { computeBounds, keys49 } = await import('../src/models/layout')
    const { plateBoundsFromGeom } = await import('../src/models/case')
    const { deserialize: stlDeserialize } = await import('@jscad/stl-deserializer')
    const { readFileSync } = await import('node:fs')

    let plateBounds = computeBounds(keys49, defaults.plate.padding)
    try {
        const platePath = fileURLToPath(new URL('../docs/models/plate/keyboard-plate.stl', import.meta.url))
        const buffer = readFileSync(platePath)
        const result = stlDeserialize({ output: 'geometry', addColors: false }, new Uint8Array(buffer))
        const geom = (Array.isArray(result) ? result[0] : result) as Parameters<typeof plateBoundsFromGeom>[0]
        plateBounds = plateBoundsFromGeom(geom)
    } catch {
        // fallback
    }

    const outDir = fileURLToPath(new URL('../docs/export/', import.meta.url))
    writeInsertSpec({ plateBounds, screwHoleMargin: defaults.plate.screwHoleMargin }, outDir)
}
