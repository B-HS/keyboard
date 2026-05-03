import { KEYBOARD_GEOMETRY } from '@shared/config/keyboard'

/**
 * jscad source 평가 시 prepend 되는 prelude.
 * KEYBOARD_GEOMETRY 를 jscad 코드 안에서 그대로 참조 가능.
 */
export const JSCAD_PRELUDE = `const KEYBOARD_GEOMETRY = ${JSON.stringify(KEYBOARD_GEOMETRY)};\n`
