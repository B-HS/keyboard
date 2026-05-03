/// <reference types="vite/client" />

declare module '*.jscad?raw' {
    const content: string
    export default content
}

declare module '*.stl?url' {
    const url: string
    export default url
}

declare module '*.STL?url' {
    const url: string
    export default url
}
