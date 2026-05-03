import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { measurements } from '@jscad/modeling'
import { deserialize as stlDeserialize } from '@jscad/stl-deserializer'
import type { Geom3 } from '@jscad/modeling/src/geometries/types'
import { buildCaseTop, buildCaseBottom, DEFAULT_CASE_PARAMS, caseBounds, plateBoundsFromGeom } from '../src/models/case'
import { keys49, computeBounds, screwPositions } from '../src/models/layout'
import { defaults } from './load-defaults'

const { measureBoundingBox } = measurements

const fmt = (n: number) => n.toFixed(3)

let plateGeom: Geom3 | null = null
try {
    const platePath = fileURLToPath(new URL('../docs/models/plate/keyboard-plate.stl', import.meta.url))
    const buffer = readFileSync(platePath)
    const result = stlDeserialize(
        { output: 'geometry', addColors: false },
        new Uint8Array(buffer),
    )
    plateGeom = (Array.isArray(result) ? result[0] : result) as Geom3
} catch (e) {
    console.log('Plate STL load failed:', (e as Error).message)
}

const plateBounds = plateGeom
    ? plateBoundsFromGeom(plateGeom)
    : computeBounds(keys49, defaults.plate.padding)
const cb = caseBounds(plateBounds, DEFAULT_CASE_PARAMS)

console.log('==== DIMENSIONS ====\n')

console.log('PLATE (from STL bounds)')
console.log(`  outline: ${fmt(plateBounds.maxX - plateBounds.minX)} × ${fmt(plateBounds.maxY - plateBounds.minY)} mm`)
console.log(`  X range: [${fmt(plateBounds.minX)}, ${fmt(plateBounds.maxX)}]`)
console.log(`  Y range: [${fmt(plateBounds.minY)}, ${fmt(plateBounds.maxY)}]`)
console.log(`  screw margin assumed: ${defaults.plate.screwHoleMargin} mm`)
console.log(`  derived padding (from keys): T=${fmt(plateBounds.maxY - 9.525)}, B=${fmt(-66.675 - plateBounds.minY)}, L=${fmt(-9.525 - plateBounds.minX)}, R=${fmt(plateBounds.maxX - 257.175)}`)
const scrs = screwPositions(plateBounds, defaults.plate.screwHoleMargin)
console.log(`  screw positions (case pillars):`)
for (const [x, y] of scrs) console.log(`    (${fmt(x)}, ${fmt(y)})`)

console.log('\nCASE OUTER (auto-scaled to plate)')
console.log(`  footprint: ${fmt(cb.maxX - cb.minX)} × ${fmt(cb.maxY - cb.minY)} mm`)
console.log(`  X range: [${fmt(cb.minX)}, ${fmt(cb.maxX)}]`)
console.log(`  Y range: [${fmt(cb.minY)}, ${fmt(cb.maxY)}]`)

console.log('\nCASE TOP')
const caseTop = buildCaseTop(keys49, defaults, DEFAULT_CASE_PARAMS, plateBounds)
const topBB = measureBoundingBox(caseTop)
console.log(`  AABB: [${topBB[0].map(fmt).join(', ')}] — [${topBB[1].map(fmt).join(', ')}]`)
console.log(`  size: ${fmt(topBB[1][0] - topBB[0][0])} × ${fmt(topBB[1][1] - topBB[0][1])} × ${fmt(topBB[1][2] - topBB[0][2])} mm`)

console.log('\nCASE BOTTOM')
const caseBot = buildCaseBottom(keys49, defaults, DEFAULT_CASE_PARAMS, plateBounds)
const botBB = measureBoundingBox(caseBot)
console.log(`  AABB: [${botBB[0].map(fmt).join(', ')}] — [${botBB[1].map(fmt).join(', ')}]`)
console.log(`  size: ${fmt(botBB[1][0] - botBB[0][0])} × ${fmt(botBB[1][1] - botBB[0][1])} × ${fmt(botBB[1][2] - botBB[0][2])} mm`)

if (plateGeom) {
    const bb = measureBoundingBox(plateGeom)
    const expectedX = plateBounds.maxX - plateBounds.minX
    const expectedY = plateBounds.maxY - plateBounds.minY
    const dx = bb[1][0] - bb[0][0]
    const dy = bb[1][1] - bb[0][1]
    const matches = Math.abs(dx - expectedX) < 0.01 && Math.abs(dy - expectedY) < 0.01
    console.log(`\n==== ALIGNMENT: ${matches ? 'MATCH ✓' : 'MISMATCH ✗'} ====`)
}
