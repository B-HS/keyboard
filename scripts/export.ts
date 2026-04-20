import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serialize as stlSerialize } from '@jscad/stl-serializer'
import { buildCaseTop, buildCaseBottom, DEFAULT_CASE_PARAMS } from '../src/models/case'
import { buildBatteryCover as _buildBatteryCover } from '../src/models/accessories'
import { keys49 } from '../src/models/layout'
import { defaults } from './load-defaults'

const outDir = fileURLToPath(new URL('../docs/export/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const writeStl = (name: string, solid: unknown) => {
    const data = stlSerialize({ binary: true }, solid)
    const buffer = Buffer.concat(data.map((chunk: ArrayBuffer | Uint8Array) => Buffer.from(chunk as ArrayBuffer)))
    const path = `${outDir}${name}.stl`
    writeFileSync(path, buffer)
    console.log(`Wrote ${path} (${(buffer.length / 1024).toFixed(1)} KB)`)
}

for (const name of ['plate.stl', 'case.stl', 'plate.dxf', 'case-top.stl', 'case-bottom.stl', 'battery-cover.stl']) {
    try {
        rmSync(`${outDir}${name}`)
    } catch {
        // ignore if not exists
    }
}

writeStl('1_case-top', buildCaseTop(keys49, defaults))
writeStl('2_case-bottom', buildCaseBottom(keys49, defaults))
writeStl('3_battery-cover', _buildBatteryCover(DEFAULT_CASE_PARAMS))

const SLA_CASE_PARAMS = {
    ...DEFAULT_CASE_PARAMS,
    cornerBossInsertRadius: 2.0,
    cornerBossInsertDepth: 3.0,
}

writeStl('1_case-top_SLA', buildCaseTop(keys49, defaults, SLA_CASE_PARAMS))
writeStl('2_case-bottom_SLA', buildCaseBottom(keys49, defaults, SLA_CASE_PARAMS))
writeStl('3_battery-cover_SLA', _buildBatteryCover(SLA_CASE_PARAMS))

console.log('\nDone. Files are in docs/export/')
