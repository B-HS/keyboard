#!/usr/bin/env bun
/**
 * keyboard.kicad_pcb 에 Edge.Cuts 외곽선 추가.
 * KEYBOARD_GEOMETRY plate 사이즈 (271.65 × 81.15mm, R1.0) 따라 라운드 사각형.
 * 중심은 부품들 좌표 중심 (120.825, 31.2) 에 맞춰 균등 마진.
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const PCB_PATH = '/Users/hyunseokbyun/keyboard/49-pcba/no-hotswap-pcb/keyboard/keyboard.kicad_pcb'

// plate 사이즈 (KEYBOARD_GEOMETRY)
const PLATE_W = 271.65
const PLATE_D = 81.15
const CORNER_R = 1.0
const LINE_WIDTH = 0.05

// SW 49 개 키 영역 중심 (D/ST 제외 — D 가 좌상단으로 약간 어긋나 있어 모든 FP 평균은 키 중심과 다름).
// SW 추출 결과: X 0 ~ 247.7, Y 0 ~ 57.1 → 중심 (123.85, 28.55).
const CENTER_X = (0 + 247.7) / 2 // 123.85
const CENTER_Y = (0 + 57.1) / 2 // 28.55

const xMin = CENTER_X - PLATE_W / 2
const xMax = CENTER_X + PLATE_W / 2
const yMin = CENTER_Y - PLATE_D / 2
const yMax = CENTER_Y + PLATE_D / 2

// arc mid 좌표 (코너 R 의 외접 45°점). corner 원의 중심에서 외측 45° 방향으로 R.
const off = CORNER_R * (1 - Math.SQRT1_2) // = R * (1 - 1/√2) ≈ 0.2929

type Point = [number, number]
type Line = { start: Point; end: Point }
type Arc = { start: Point; mid: Point; end: Point }

const lines: Line[] = [
    // top edge
    { start: [xMin + CORNER_R, yMin], end: [xMax - CORNER_R, yMin] },
    // right edge
    { start: [xMax, yMin + CORNER_R], end: [xMax, yMax - CORNER_R] },
    // bottom edge
    { start: [xMin + CORNER_R, yMax], end: [xMax - CORNER_R, yMax] },
    // left edge
    { start: [xMin, yMin + CORNER_R], end: [xMin, yMax - CORNER_R] },
]

// 4 corner arcs (각 코너 90°)
const arcs: Arc[] = [
    // top-left: corner 원 중심 (xMin+R, yMin+R), arc start(xMin, yMin+R) → end(xMin+R, yMin)
    {
        start: [xMin, yMin + CORNER_R],
        mid: [xMin + off, yMin + off],
        end: [xMin + CORNER_R, yMin],
    },
    // top-right: 중심 (xMax-R, yMin+R)
    {
        start: [xMax - CORNER_R, yMin],
        mid: [xMax - off, yMin + off],
        end: [xMax, yMin + CORNER_R],
    },
    // bottom-right: 중심 (xMax-R, yMax-R)
    {
        start: [xMax, yMax - CORNER_R],
        mid: [xMax - off, yMax - off],
        end: [xMax - CORNER_R, yMax],
    },
    // bottom-left: 중심 (xMin+R, yMax-R)
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

const lastClose = pcb.lastIndexOf(')')
if (lastClose < 0) throw new Error('PCB closing paren not found')

const updated = pcb.slice(0, lastClose) + edgeCutsBlock + '\n' + pcb.slice(lastClose)
writeFileSync(PCB_PATH, updated)

console.log(`Added Edge.Cuts: 4 lines + 4 arcs`)
console.log(`Outline: X ${fmt(xMin)} ~ ${fmt(xMax)} (W ${PLATE_W})`)
console.log(`         Y ${fmt(yMin)} ~ ${fmt(yMax)} (D ${PLATE_D})`)
console.log(`         R ${CORNER_R}`)
console.log(`Backup: ${PCB_PATH}.bak`)
