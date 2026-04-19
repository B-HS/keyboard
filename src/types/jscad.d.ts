declare module '@jscad/stl-serializer' {
    export const serialize: (options: { binary?: boolean }, ...solids: unknown[]) => ArrayBuffer[]
    export const mimeType: string
}

declare module '@jscad/stl-deserializer' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const deserialize: (options: { output?: 'geometry' | 'script'; addColors?: boolean; filename?: string }, data: Uint8Array | string) => any
    export const mimeType: string
    export const extension: string
}

declare module '*.stl?url' {
    const url: string
    export default url
}

declare module '@jscad/dxf-serializer' {
    export const serialize: (options: Record<string, unknown>, ...solids: unknown[]) => string[]
    export const mimeType: string
}

declare module '*.jscad?raw' {
    const content: string
    export default content
}

declare module '@jscad/regl-renderer' {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const prepareRender: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const drawCommands: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const cameras: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const controls: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    export const entitiesFromSolids: any
}
