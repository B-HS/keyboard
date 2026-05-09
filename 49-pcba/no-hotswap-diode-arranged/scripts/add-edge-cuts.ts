#!/usr/bin/env bun
/**
 * keyboard.kicad_pcb 에 Edge.Cuts 외곽선 추가.
 * KEYBOARD_GEOMETRY plate 사이즈 (271.65 × 81.15mm, R1.0) 따라 라운드 사각형.
 * 중심은 SW 49 개 키 영역 중심 기준 (D/ST 제외).
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const PCB_PATH = '/Users/hyunseokbyun/keyboard/49-pcba/no-hotswap-diode-arranged/keyboard/keyboard.kicad_pcb'

// PCB 외곽 = plate 외곽 (KEYBOARD_GEOMETRY 그대로). 부품 패드가 plate 외곽에 빠듯하게
// 배치되어 있어 외곽을 줄이면 copper_edge_clearance 위반 발생 → plate 사이즈 유지가 안전.
const PLATE_W = 271.65
const PLATE_D = 81.15
const CORNER_R = 1.0
const LINE_WIDTH = 0.05

// SW 49 X 0 ~ 247.65, Y 0 ~ 57.15 → 중심 (123.825, 28.575)
const CENTER_X = (0 + 247.65) / 2
const CENTER_Y = (0 + 57.15) / 2

const xMin = CENTER_X - PLATE_W / 2
const xMax = CENTER_X + PLATE_W / 2
const yMin = CENTER_Y - PLATE_D / 2
const yMax = CENTER_Y + PLATE_D / 2

const off = CORNER_R * (1 - Math.SQRT1_2)

type Point = [number, number]
type Line = { start: Point; end: Point }
type Arc = { start: Point; mid: Point; end: Point }

const lines: Line[] = [
    { start: [xMin + CORNER_R, yMin], end: [xMax - CORNER_R, yMin] },
    { start: [xMax, yMin + CORNER_R], end: [xMax, yMax - CORNER_R] },
    { start: [xMin + CORNER_R, yMax], end: [xMax - CORNER_R, yMax] },
    { start: [xMin, yMin + CORNER_R], end: [xMin, yMax - CORNER_R] },
]

const arcs: Arc[] = [
    {
        start: [xMin, yMin + CORNER_R],
        mid: [xMin + off, yMin + off],
        end: [xMin + CORNER_R, yMin],
    },
    {
        start: [xMax - CORNER_R, yMin],
        mid: [xMax - off, yMin + off],
        end: [xMax, yMin + CORNER_R],
    },
    {
        start: [xMax, yMax - CORNER_R],
        mid: [xMax - off, yMax - off],
        end: [xMax - CORNER_R, yMax],
    },
    {
        start: [xMin + CORNER_R, yMax],
        mid: [xMin + off, yMax - off],
        end: [xMin, yMax - CORNER_R],
    },
]

const fmt = (n: number) => Number(n.toFixed(4)).toString()

let edgeCutsBlock = ''
for (const l of lines) {
    edgeCutsBlock += `\n\t(gr_line\n\t\t(start ${fmt(l.start[0])} ${fmt(l.start[1])})\n\t\t(end ${fmt(l.end[0])} ${fmt(l.end[1])})\n\t\t(stroke (width ${LINE_WIDTH}) (type default))\n\t\t(layer "Edge.Cuts")\n\t\t(uuid "${randomUUID()}")\n\t)`
}
for (const a of arcs) {
    edgeCutsBlock += `\n\t(gr_arc\n\t\t(start ${fmt(a.start[0])} ${fmt(a.start[1])})\n\t\t(mid ${fmt(a.mid[0])} ${fmt(a.mid[1])})\n\t\t(end ${fmt(a.end[0])} ${fmt(a.end[1])})\n\t\t(stroke (width ${LINE_WIDTH}) (type default))\n\t\t(layer "Edge.Cuts")\n\t\t(uuid "${randomUUID()}")\n\t)`
}

const pcb = readFileSync(PCB_PATH, 'utf8')
copyFileSync(PCB_PATH, `${PCB_PATH}.bak`)

// 기존 Edge.Cuts 의 gr_line / gr_arc 제거 (paren 깊이로 안전하게 슬라이스).
const findCloseParen = (text: string, startIdx: number): number => {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = startIdx; i < text.length; i++) {
        const c = text[i]
        if (escape) { escape = false; continue }
        if (c === '\\') { escape = true; continue }
        if (c === '"') { inString = !inString; continue }
        if (inString) continue
        if (c === '(') depth++
        else if (c === ')') {
            depth--
            if (depth === 0) return i
        }
    }
    throw new Error('unmatched paren at ' + startIdx)
}

let cleaned = pcb
const removeOldEdge = (kind: 'gr_line' | 'gr_arc'): number => {
    let removed = 0
    let i = 0
    let result = ''
    while (i < cleaned.length) {
        const start = cleaned.indexOf(`(${kind}`, i)
        if (start < 0) {
            result += cleaned.slice(i)
            break
        }
        const end = findCloseParen(cleaned, start)
        const block = cleaned.slice(start, end + 1)
        if (block.includes('"Edge.Cuts"')) {
            // 앞 공백/개행도 같이 제거
            let trimStart = start
            while (trimStart > i && /\s/.test(cleaned[trimStart - 1])) trimStart--
            result += cleaned.slice(i, trimStart)
            removed++
        } else {
            result += cleaned.slice(i, end + 1)
        }
        i = end + 1
    }
    cleaned = result
    return removed
}
const removedLines = removeOldEdge('gr_line')
const removedArcs = removeOldEdge('gr_arc')
console.log(`Removed old Edge.Cuts: ${removedLines} lines, ${removedArcs} arcs`)

const lastClose = cleaned.lastIndexOf(')')
if (lastClose < 0) throw new Error('PCB closing paren not found')

const updated = cleaned.slice(0, lastClose) + edgeCutsBlock + '\n' + cleaned.slice(lastClose)
writeFileSync(PCB_PATH, updated)

console.log(`Added Edge.Cuts: 4 lines + 4 arcs`)
console.log(`Outline: X ${fmt(xMin)} ~ ${fmt(xMax)} (W ${PLATE_W})`)
console.log(`         Y ${fmt(yMin)} ~ ${fmt(yMax)} (D ${PLATE_D})`)
console.log(`         R ${CORNER_R}`)
console.log(`Backup: ${PCB_PATH}.bak`)
