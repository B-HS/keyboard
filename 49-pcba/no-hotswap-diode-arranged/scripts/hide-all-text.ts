#!/usr/bin/env bun
/**
 * keyboard.kicad_pcb 의 모든 footprint 텍스트 (Reference + Value) 와 fp_text 를 silk 에서 숨김.
 * SW1~SW49 도 포함 — 사용자가 모든 reference text 제거 요청.
 *
 * 실행: bun run 49-pcba/no-hotswap-diode-arranged/scripts/hide-all-text.ts
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const PCB_PATH = '/Users/hyunseokbyun/keyboard/49-pcba/no-hotswap-diode-arranged/keyboard/keyboard.kicad_pcb'

const findCloseParen = (text: string, startIdx: number): number => {
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
            if (depth === 0) return i
        }
    }
    throw new Error('unmatched paren at ' + startIdx)
}

/** 블록 (시작 ( 부터 끝 ) 까지) 안에 (hide yes) 가 없으면 닫는 ) 직전에 추가. */
const ensureHide = (block: string): { block: string; modified: boolean } => {
    if (block.includes('(hide yes)')) return { block, modified: false }
    const closeIdx = block.lastIndexOf(')')
    if (closeIdx < 0) return { block, modified: false }
    return {
        block: block.slice(0, closeIdx) + '\n\t\t\t(hide yes)\n\t\t' + block.slice(closeIdx),
        modified: true,
    }
}

const pcb = readFileSync(PCB_PATH, 'utf8')
copyFileSync(PCB_PATH, `${PCB_PATH}.bak`)

let result = ''
let i = 0
let refCount = 0
let valCount = 0
let textCount = 0

while (i < pcb.length) {
    const fpStart = pcb.indexOf('(footprint "', i)
    if (fpStart < 0) {
        result += pcb.slice(i)
        break
    }
    result += pcb.slice(i, fpStart)
    const fpEnd = findCloseParen(pcb, fpStart)
    let fp = pcb.slice(fpStart, fpEnd + 1)

    // 1. Reference property hide
    const refStart = fp.indexOf('(property "Reference"')
    if (refStart >= 0) {
        const refEnd = findCloseParen(fp, refStart)
        const ref = fp.slice(refStart, refEnd + 1)
        const { block: newRef, modified } = ensureHide(ref)
        if (modified) {
            fp = fp.slice(0, refStart) + newRef + fp.slice(refEnd + 1)
            refCount++
        }
    }

    // 2. Value property hide (재탐색 — fp 길이 바뀌었음)
    const valStart = fp.indexOf('(property "Value"')
    if (valStart >= 0) {
        const valEnd = findCloseParen(fp, valStart)
        const val = fp.slice(valStart, valEnd + 1)
        const { block: newVal, modified } = ensureHide(val)
        if (modified) {
            fp = fp.slice(0, valStart) + newVal + fp.slice(valEnd + 1)
            valCount++
        }
    }

    // 3. fp_text 들 모두 hide (보통 user 또는 reference 아닌 silk text)
    let searchFrom = 0
    while (true) {
        const tStart = fp.indexOf('(fp_text ', searchFrom)
        if (tStart < 0) break
        const tEnd = findCloseParen(fp, tStart)
        const t = fp.slice(tStart, tEnd + 1)
        const { block: newT, modified } = ensureHide(t)
        if (modified) {
            fp = fp.slice(0, tStart) + newT + fp.slice(tEnd + 1)
            textCount++
            searchFrom = tStart + newT.length
        } else {
            searchFrom = tEnd + 1
        }
    }

    result += fp
    i = fpEnd + 1
}

writeFileSync(PCB_PATH, result)
console.log(`Reference hidden: ${refCount}`)
console.log(`Value hidden:     ${valCount}`)
console.log(`fp_text hidden:   ${textCount}`)
console.log(`Backup: ${PCB_PATH}.bak`)
