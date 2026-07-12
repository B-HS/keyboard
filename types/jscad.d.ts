declare module '@jscad/modeling' {
    export type Vec2 = [number, number]
    export type Vec3 = [number, number, number]

    export type Geom2 = { readonly __brand: 'geom2' }
    export type Geom3 = { readonly __brand: 'geom3' }
    export type Polygon = { vertices: Vec3[] }

    export const geometries: {
        geom2: {
            toOutlines: (geom: Geom2) => Vec2[][]
            fromPoints: (points: Vec2[]) => Geom2
        }
        geom3: {
            toPolygons: (geom: Geom3) => Polygon[]
        }
    }

    export const primitives: {
        rectangle: (options: { size: Vec2; center?: Vec2 }) => Geom2
        roundedRectangle: (options: { size: Vec2; roundRadius: number; segments?: number; center?: Vec2 }) => Geom2
        circle: (options: { radius: number; segments?: number; center?: Vec2 }) => Geom2
        cylinder: (options: { height: number; radius: number; segments?: number; center?: Vec3 }) => Geom3
        cylinderElliptic: (options: { height: number; startRadius: Vec2; endRadius: Vec2; segments?: number; center?: Vec3 }) => Geom3
        cuboid: (options: { size: Vec3; center?: Vec3 }) => Geom3
    }

    export const booleans: {
        union: {
            (...geoms: Geom2[]): Geom2
            (...geoms: Geom3[]): Geom3
        }
        subtract: {
            (...geoms: Geom2[]): Geom2
            (...geoms: Geom3[]): Geom3
        }
        intersect: {
            (...geoms: Geom2[]): Geom2
            (...geoms: Geom3[]): Geom3
        }
    }

    export const extrusions: {
        extrudeLinear: (options: { height: number }, geom: Geom2) => Geom3
    }

    export const transforms: {
        translate: {
            (offset: Vec3, geom: Geom2): Geom2
            (offset: Vec3, geom: Geom3): Geom3
        }
        rotateX: {
            (angle: number, geom: Geom3): Geom3
        }
        rotateZ: {
            (angle: number, geom: Geom2): Geom2
            (angle: number, geom: Geom3): Geom3
        }
        rotate: {
            (angles: Vec3, geom: Geom2): Geom2
            (angles: Vec3, geom: Geom3): Geom3
        }
        scale: {
            (factors: Vec3, geom: Geom3): Geom3
        }
        mirror: {
            (options: { normal: Vec3 }, geom: Geom2): Geom2
        }
    }

    export const hulls: {
        hull: (...geoms: Geom2[]) => Geom2
    }

    export const expansions: {
        offset: (options: { delta: number; corners?: 'round' | 'edge' | 'chamfer'; segments?: number }, geom: Geom2) => Geom2
    }

    export const measurements: {
        measureBoundingBox: (geom: Geom3) => [Vec3, Vec3]
    }
}

declare module '@jscad/dxf-serializer' {
    import type { Geom2 } from '@jscad/modeling'
    const serializer: { serialize: (options: Record<string, unknown>, geom: Geom2) => string[] }
    export default serializer
}

declare module '@jscad/stl-serializer' {
    import type { Geom3 } from '@jscad/modeling'
    const serializer: { serialize: (options: { binary: boolean }, geom: Geom3) => ArrayBuffer[] }
    export default serializer
}
