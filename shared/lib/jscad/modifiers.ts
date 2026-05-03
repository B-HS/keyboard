import * as jscadModeling from '@jscad/modeling'

/**
 * @jscad/modeling 의 modifiers 서브모듈은 d.ts 가 잘못되어 있어
 * (`export { default as generalize }` 인데 실제로는 named export) destructure 후
 * 호출 시 ts 가 callable 로 인식하지 못함. 런타임은 정상 동작하므로 type 우회.
 */
type GeneralizeOptions = { snap?: boolean; simplify?: boolean; triangulate?: boolean }

const modifiers = jscadModeling.modifiers as unknown as {
    generalize: <T>(options: GeneralizeOptions, geometry: T) => T
    retessellate: <T>(geometry: T) => T
    snap: <T>(geometry: T) => T
}

export const generalize = modifiers.generalize
export const retessellate = modifiers.retessellate
export const snap = modifiers.snap
