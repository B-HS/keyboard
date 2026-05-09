#!/usr/bin/env bun
/**
 * keyboard.kicad_sch 에 ROW0~ROW3 와이어 납땜용 1x01 핀 패드 4 개 추가.
 * COL 은 SW.pin1 PTH 에서 직접 와이어 가져갈 거라 추가 안 함.
 *
 * 실행: bun run 49-pcba/no-hotswap-diode-arranged/scripts/add-row-pads.ts
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'

const SCH_PATH = '/Users/hyunseokbyun/keyboard/49-pcba/no-hotswap-diode-arranged/keyboard/keyboard.kicad_sch'
const LIB_PATH = '/Applications/KiCad/KiCad.app/Contents/SharedSupport/symbols/Connector.kicad_sym'

const SYMBOL_NAME = 'Conn_01x01_Pin'
const LIB_ID = `Connector:${SYMBOL_NAME}`
const FOOTPRINT = 'TestPoint:TestPoint_THTPad_D2.0mm_Drill1.0mm'

const SHEET_UUID = '9e45a776-7007-48ff-b543-dc98423173b7'
const PROJECT_NAME = 'template'

const NETS = ['ROW0', 'ROW1', 'ROW2', 'ROW3']

const START_X = 254
const START_Y = 30
const PITCH_Y = 5.08

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

const lib = readFileSync(LIB_PATH, 'utf8')
const symStartMarker = `(symbol "${SYMBOL_NAME}"`
const symStart = lib.indexOf(symStartMarker)
if (symStart < 0) throw new Error(`${SYMBOL_NAME} not found in ${LIB_PATH}`)
const libSymbolDef = extractSExprAt(lib, symStart)
const schSymbolDef = libSymbolDef.replace(symStartMarker, `(symbol "${LIB_ID}"`)

const sch = readFileSync(SCH_PATH, 'utf8')
copyFileSync(SCH_PATH, `${SCH_PATH}.bak`)

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

const lastClose = updated.lastIndexOf(')')
if (lastClose < 0) throw new Error('sch closing paren not found')
updated = updated.slice(0, lastClose) + '\n' + blocks.join('\n\n') + '\n' + updated.slice(lastClose)

writeFileSync(SCH_PATH, updated)
console.log(`Added ${NETS.length} ROW pads (${NETS.join(', ')})`)
console.log(`Backup: ${SCH_PATH}.bak`)
