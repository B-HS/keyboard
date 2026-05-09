#!/usr/bin/env bun
/**
 * keyboard.kicad_pcb 의 footprint 중 SW (Cherry MX 키 스위치) 가 아닌 부품의
 * Reference 텍스트를 silk 에서 숨김. SW 만 PCB 표면에 SW1~SW49 표시 유지.
 *
 * silk_over_copper 경고 (D, ST, J 의 reference text 가 SW pad 위에 겹치는 경우) 제거 목적.
 * 실행: bun run 49-pcba/no-hotswap-diode-arranged/scripts/hide-non-sw-refs.ts
 */

import { copyFileSync, readFileSync, writeFileSync } from 'node:fs'

const PCB_PATH = '/Users/hyunseokbyun/keyboard/49-pcba/no-hotswap-diode-arranged/keyboard/keyboard.kicad_pcb'

// paren depth-aware 끝 인덱스 (text[startIdx] 가 '(' 인 지점부터)
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

const pcb = readFileSync(PCB_PATH, 'utf8')
copyFileSync(PCB_PATH, `${PCB_PATH}.bak`)

let result = ''
let i = 0
let modified = 0
let alreadyHidden = 0

while (i < pcb.length) {
    const fpStart = pcb.indexOf('(footprint "', i)
    if (fpStart < 0) {
        result += pcb.slice(i)
        break
    }
    result += pcb.slice(i, fpStart)

    const fpEnd = findCloseParen(pcb, fpStart)
    let fpBlock = pcb.slice(fpStart, fpEnd + 1)

    const nameMatch = fpBlock.match(/^\(footprint "([^"]+)"/)
    const fpName = nameMatch ? nameMatch[1] : ''

    // SW (Cherry MX 키 스위치) 만 keep
    if (!fpName.includes('SW_Cherry')) {
        // Reference property 위치 (footprint 블록 내 상대)
        const refStart = fpBlock.indexOf('(property "Reference"')
        if (refStart >= 0) {
            const refEnd = findCloseParen(fpBlock, refStart)
            const refBlock = fpBlock.slice(refStart, refEnd + 1)

            if (refBlock.includes('(hide yes)')) {
                alreadyHidden++
            } else {
                // 그냥 Reference property 자체에 (hide yes) 삽입 — 닫는 ) 직전.
                // KiCad 9 PCB 가 이 형식을 footprint property level 에서 인식.
                const insertAt = refEnd
                const newFpBlock =
                    fpBlock.slice(0, insertAt) +
                    '\n\t\t\t(hide yes)\n\t\t' +
                    fpBlock.slice(insertAt)
                fpBlock = newFpBlock
                modified++
            }
        }
    }

    result += fpBlock
    i = fpEnd + 1
}

writeFileSync(PCB_PATH, result)
console.log(`Hidden Reference on ${modified} non-SW footprints`)
console.log(`Already hidden: ${alreadyHidden}`)
console.log(`Backup: ${PCB_PATH}.bak`)
