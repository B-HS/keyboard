import * as jscadModeling from '@jscad/modeling'
import * as THREE from 'three'
import { JSCAD_PRELUDE } from './prelude'

type Geom3 = ReturnType<typeof jscadModeling.primitives.cube>
type Poly3 = { vertices: ReadonlyArray<[number, number, number]> }

const requireShim = (id: string): unknown => {
    if (id === '@jscad/modeling') return jscadModeling
    throw new Error(`Unsupported require('${id}') in jscad source`)
}

export const evaluateJscadSource = (source: string): Geom3 => {
    const factory = new Function('require', 'module', 'exports', JSCAD_PRELUDE + source) as (
        req: typeof requireShim,
        mod: { exports: Record<string, unknown> },
        exp: Record<string, unknown>,
    ) => void

    const moduleObj: { exports: Record<string, unknown> } = { exports: {} }
    factory(requireShim, moduleObj, moduleObj.exports)

    const main = moduleObj.exports.main as (() => Geom3) | undefined
    if (typeof main !== 'function') throw new Error('jscad source did not export main()')
    const result = main()
    if (Array.isArray(result)) return result[0] as Geom3
    return result
}

export const geom3ToBufferGeometry = (geom: Geom3): THREE.BufferGeometry => {
    const polygons = jscadModeling.geometries.geom3.toPolygons(geom) as ReadonlyArray<Poly3>

    const positions: number[] = []
    const normals: number[] = []

    for (const poly of polygons) {
        const verts = poly.vertices
        if (verts.length < 3) continue

        const a = verts[0]
        const b = verts[1]
        const c = verts[2]
        const ux = b[0] - a[0]
        const uy = b[1] - a[1]
        const uz = b[2] - a[2]
        const vx = c[0] - a[0]
        const vy = c[1] - a[1]
        const vz = c[2] - a[2]
        let nx = uy * vz - uz * vy
        let ny = uz * vx - ux * vz
        let nz = ux * vy - uy * vx
        const len = Math.hypot(nx, ny, nz) || 1
        nx /= len
        ny /= len
        nz /= len

        for (let i = 1; i < verts.length - 1; i++) {
            const v0 = verts[0]
            const v1 = verts[i]
            const v2 = verts[i + 1]
            positions.push(v0[0], v0[1], v0[2], v1[0], v1[1], v1[2], v2[0], v2[1], v2[2])
            normals.push(nx, ny, nz, nx, ny, nz, nx, ny, nz)
        }
    }

    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    geometry.computeBoundingBox()
    geometry.computeBoundingSphere()
    return geometry
}

export const buildGeometryFromJscad = (jscadSource: string): THREE.BufferGeometry => {
    const geom = evaluateJscadSource(jscadSource)
    return geom3ToBufferGeometry(geom)
}
