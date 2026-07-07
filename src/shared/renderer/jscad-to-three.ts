import { geometries, type Geom3 } from '@jscad/modeling'
import { BufferGeometry, Float32BufferAttribute } from 'three'

const { geom3 } = geometries

export const toBufferGeometry = (geom: Geom3) => {
    const polygons = geom3.toPolygons(geom)
    const positions: number[] = []
    for (const poly of polygons) {
        const v = poly.vertices
        for (let i = 2; i < v.length; i++) {
            const a = v[0]
            const b = v[i - 1]
            const c = v[i]
            if (!a || !b || !c) continue
            positions.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2])
        }
    }
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
    geometry.computeVertexNormals()
    return geometry
}
