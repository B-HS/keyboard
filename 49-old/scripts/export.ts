import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { serialize as stlSerialize } from '@jscad/stl-serializer'
import { deserialize as stlDeserialize } from '@jscad/stl-deserializer'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { buildCaseTop, buildCaseBottom, DEFAULT_CASE_PARAMS, plateBoundsFromGeom } from '../src/models/case'
import { keys49, computeBounds } from '../src/models/layout'
import { defaults } from './load-defaults'

const outDir = fileURLToPath(new URL('../docs/export/', import.meta.url))
mkdirSync(outDir, { recursive: true })

const loadPlateBounds = () => {
    try {
        const platePath = fileURLToPath(new URL('../docs/models/plate/keyboard-plate.stl', import.meta.url))
        const buffer = readFileSync(platePath)
        const result = stlDeserialize(
            { output: 'geometry', addColors: false },
            new Uint8Array(buffer),
        )
        const geom = (Array.isArray(result) ? result[0] : result) as Geom3
        return plateBoundsFromGeom(geom)
    } catch {
        return computeBounds(keys49, defaults.plate.padding)
    }
}

const plateBounds = loadPlateBounds()
console.log(`plate bounds: X[${plateBounds.minX.toFixed(3)}, ${plateBounds.maxX.toFixed(3)}] Y[${plateBounds.minY.toFixed(3)}, ${plateBounds.maxY.toFixed(3)}]`)

const writeStl = (name: string, solid: unknown) => {
    const data = stlSerialize({ binary: true }, solid)
    const buffer = Buffer.concat(data.map((chunk: ArrayBuffer | Uint8Array) => Buffer.from(chunk as ArrayBuffer)))
    const path = `${outDir}${name}.stl`
    writeFileSync(path, buffer)
    console.log(`Wrote ${path} (${(buffer.length / 1024).toFixed(1)} KB)`)
}

for (const name of [
    'plate.stl', 'case.stl', 'plate.dxf', 'case-top.stl', 'case-bottom.stl',
    '1_case-top.stl', '2_case-bottom.stl',
]) {
    try {
        rmSync(`${outDir}${name}`)
    } catch {
        // ignore if not exists
    }
}

writeStl('1_case-top', buildCaseTop(keys49, defaults, DEFAULT_CASE_PARAMS, plateBounds))
writeStl('2_case-bottom', buildCaseBottom(keys49, defaults, DEFAULT_CASE_PARAMS, plateBounds))

console.log('\nDone. Files are in docs/export/')
