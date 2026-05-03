/**
 * STL 파일 분석 — 평면 그룹별 삼각형 분포 확인
 */
import { readFileSync } from 'node:fs'

const file = process.argv[2]
if (!file) {
    console.error('usage: bun run scripts/analyze-stl.ts <path>')
    process.exit(1)
}

const buf = readFileSync(file)
const count = buf.readUInt32LE(80)
type V3 = [number, number, number]
const tris: { n: V3; v: [V3, V3, V3] }[] = []
for (let i = 0; i < count; i++) {
    const o = 84 + i * 50
    tris.push({
        n: [buf.readFloatLE(o), buf.readFloatLE(o + 4), buf.readFloatLE(o + 8)],
        v: [
            [buf.readFloatLE(o + 12), buf.readFloatLE(o + 16), buf.readFloatLE(o + 20)],
            [buf.readFloatLE(o + 24), buf.readFloatLE(o + 28), buf.readFloatLE(o + 32)],
            [buf.readFloatLE(o + 36), buf.readFloatLE(o + 40), buf.readFloatLE(o + 44)],
        ],
    })
}

const r = (n: number) => Number(n.toFixed(3))
const groups = new Map<string, number>()
for (const t of tris) {
    const nx = r(t.n[0])
    const ny = r(t.n[1])
    const nz = r(t.n[2])
    const d = r(t.n[0] * t.v[0][0] + t.n[1] * t.v[0][1] + t.n[2] * t.v[0][2])
    const k = `${nx}|${ny}|${nz}|${d}`
    groups.set(k, (groups.get(k) || 0) + 1)
}

const sorted = [...groups.entries()].sort((a, b) => b[1] - a[1])
console.log(`File: ${file}`)
console.log(`Total triangles: ${count}`)
console.log(`Unique planes: ${groups.size}`)
console.log(`\nTop 15 plane groups (most triangles):`)
for (let i = 0; i < Math.min(15, sorted.length); i++) {
    console.log(`  ${sorted[i][1]} tri  plane=${sorted[i][0]}`)
}
const histogram = new Map<number, number>()
for (const c of groups.values()) histogram.set(c, (histogram.get(c) || 0) + 1)
const histSorted = [...histogram.entries()].sort((a, b) => a[0] - b[0])
console.log(`\nHistogram (triangles per plane: count):`)
for (const [tri, cnt] of histSorted) console.log(`  ${tri} tri × ${cnt} planes`)
