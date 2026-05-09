#!/usr/bin/env bun
/**
 * keyboard.kicad_sch 에 와이어 납땜용 1x01 핀 패드 18 개 추가.
 *  - ROW0~ROW3 (4)
 *  - COL0~COL13 (14)
 * 각 인스턴스의 pin 1 위치에 동일 이름 global_label 부착 → 기존 매트릭스 net 자동 연결.
 *
 * 실행: bun run 49-pcba/49-pcba-pcb-extended/scripts/add-wire-pads.ts
 * 백업: keyboard.kicad_sch.bak (자동 생성)
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const SCH_PATH = '/Users/hyunseokbyun/keyboard/49-pcba/49-pcba-pcb-extended/keyboard/keyboard.kicad_sch'
const LIB_PATH = '/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Connector.kicad_sym'

const SYMBOL_NAME = 'Conn_01x01_Pin'
const LIB_ID = `Connector:${SYMBOL_NAME}`
const FOOTPRINT = 'Connector_PinHeader_2.54mm:PinHeader_1x01_P2.54mm_Vertical'

// keyboard.kicad_sch 의 root sheet UUID + project name (기존 instance 와 동일하게).
const SHEET_UUID = '9e45a776-7007-48ff-b543-dc98423173b7'
const PROJECT_NAME = 'template'

const NETS = ['ROW0', 'ROW1', 'ROW2', 'ROW3', ...Array.from({ length: 14 }, (_, i) => `COL${i}`)]

// sch 빈 영역 (X 254 부근). 5.08mm 간격 세로 일렬.
const START_X = 254
const START_Y = 30
const PITCH_Y = 5.08

// Conn_01x01_Pin 표준 정의: pin 1 connection point 가 심볼 origin 으로부터 (5.08, 0).
const PIN_OFFSET_X = 5.08
const PIN_OFFSET_Y = 0

const extractSExprAt = (text: string, startIdx: number): string => {
    let depth = 0
    let inString = false
    let escape = false
    for (let i = startIdx; i < text.length; i++) {
        const c = text[i]
        if (escape) {
            escape = false
            continue
        }
        if (c === '\\') {
            escape = true
            continue
        }
        if (c === '"') {
            inString = !inString
            continue
        }
        if (inString) continue
        if (c === '(') depth++
        else if (c === ')') {
            depth--
            if (depth === 0) return text.substring(startIdx, i + 1)
        }
    }
    throw new Error('unmatched paren starting at ' + startIdx)
}

// 1) Connector lib 에서 symbol 정의 추출.
const lib = readFileSync(LIB_PATH, 'utf8')
const symStartMarker = `(symbol "${SYMBOL_NAME}"`
const symStart = lib.indexOf(symStartMarker)
if (symStart < 0) throw new Error(`${SYMBOL_NAME} not found in ${LIB_PATH}`)
const libSymbolDef = extractSExprAt(lib, symStart)

// sch 의 lib_symbols 안에서는 lib_id 를 "Connector:Conn_01x01_Pin" 형태로 prefix.
const schSymbolDef = libSymbolDef.replace(symStartMarker, `(symbol "${LIB_ID}"`)

// 2) sch 읽기 + 백업.
const sch = readFileSync(SCH_PATH, 'utf8')
copyFileSync(SCH_PATH, `${SCH_PATH}.bak`)

// 3) lib_symbols 안에 정의 추가 (이미 있으면 skip).
let updated = sch
if (!sch.includes(`"${LIB_ID}"`)) {
    const libIdx = sch.indexOf('(lib_symbols')
    if (libIdx < 0) throw new Error('lib_symbols block not found in sch')
    const libBlock = extractSExprAt(sch, libIdx)
    const libCloseIdx = libIdx + libBlock.length - 1
    updated = sch.slice(0, libCloseIdx) + '\n' + schSymbolDef + '\n' + sch.slice(libCloseIdx)
    console.log(`Inserted ${LIB_ID} into lib_symbols.`)
} else {
    console.log(`${LIB_ID} already in lib_symbols, skipping injection.`)
}

// 4) 18 개 인스턴스 + global_label 블록 생성.
const blocks: string[] = []
NETS.forEach((net, i) => {
    const sx = START_X
    const sy = START_Y + i * PITCH_Y
    const pinX = sx + PIN_OFFSET_X
    const pinY = sy + PIN_OFFSET_Y
    const ref = `J_${net}`
    const symU = randomUUID()
    const pinU = randomUUID()
    const labelU = randomUUID()

    blocks.push(
        `(symbol (lib_id "${LIB_ID}") (at ${sx} ${sy} 0) (unit 1) (exclude_from_sim no) (in_bom yes) (on_board yes) (dnp no) (uuid "${symU}")
(property "Reference" "${ref}" (at ${sx - 8} ${sy} 0) (effects (font (size 1.27 1.27)) (justify right)))
(property "Value" "${SYMBOL_NAME}" (at ${sx} ${sy + 5.08} 0) (effects (font (size 1.27 1.27)) (hide yes)))
(property "Footprint" "${FOOTPRINT}" (at ${sx} ${sy} 0) (effects (font (size 1.27 1.27)) (hide yes)))
(property "Datasheet" "~" (at ${sx} ${sy} 0) (effects (font (size 1.27 1.27)) (hide yes)))
(property "Description" "" (at ${sx} ${sy} 0) (effects (font (size 1.27 1.27)))) (pin "1" (uuid "${pinU}")) (instances (project "${PROJECT_NAME}" (path "/${SHEET_UUID}" (reference "${ref}") (unit 1)))))
(global_label "${net}" (shape input) (at ${pinX} ${pinY} 0) (fields_autoplaced) (effects (font (size 1.27 1.27)) (justify left)) (uuid "${labelU}")
(property "Intersheetrefs" "\${INTERSHEET_REFS}" (at ${pinX} ${pinY} 0) (effects (font (size 1.27 1.27)) (justify left) hide)))`,
    )
})

// 5) sch 의 가장 마지막 ) 직전에 새 블록 삽입.
const lastClose = updated.lastIndexOf(')')
if (lastClose < 0) throw new Error('sch closing paren not found')
updated = updated.slice(0, lastClose) + '\n' + blocks.join('\n\n') + '\n' + updated.slice(lastClose)

writeFileSync(SCH_PATH, updated)
console.log(`Added ${NETS.length} wire pads (${NETS.join(', ')})`)
console.log(`Backup at ${SCH_PATH}.bak`)
