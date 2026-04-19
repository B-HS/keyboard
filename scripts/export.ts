import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serialize as stlSerialize } from '@jscad/stl-serializer'
import { serialize as dxfSerialize } from '@jscad/dxf-serializer'
import { buildCaseTop, buildCaseBottom, DEFAULT_CASE_PARAMS } from '../src/models/case'
import { buildPlate2d } from '../src/models/plate'
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

const writeDxf = (name: string, solid: unknown) => {
    const data = dxfSerialize({}, solid)
    const path = `${outDir}${name}.dxf`
    writeFileSync(path, data.join(''))
    console.log(`Wrote ${path}`)
}

try {
    rmSync(`${outDir}plate.stl`)
} catch {
    // ignore if not exists
}
try {
    rmSync(`${outDir}case.stl`)
} catch {
    // ignore if not exists
}

writeStl('case-top', buildCaseTop(keys49, defaults))
writeStl('case-bottom', buildCaseBottom(keys49, defaults))
writeStl('battery-cover', _buildBatteryCover(DEFAULT_CASE_PARAMS))
writeDxf('plate', buildPlate2d(keys49, defaults.plate))

console.log('\nDone. Files are in docs/export/')
