import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { parseReference } from '../src/models/reference'
import { buildParamsFromReference } from '../src/models/build-params'

const jscadPath = fileURLToPath(new URL('../docs/models/49-final.jscad', import.meta.url))
const source = readFileSync(jscadPath, 'utf8')

export const reference = parseReference(source)
const base = buildParamsFromReference(reference)

export const defaults = {
    ...base,
    plate: {
        ...base.plate,
        switchCutoutSize: 13.95,
        padding: {
            top: 2.475,
            bottom: 2.475,
            left: 2.475,
            right: 2.475,
        },
        screwHoleMargin: 3,
        stabilizer: {
            ...base.plate.stabilizer,
            padSize: [6.9, 14.9] as [number, number],
            padCornerRadius: 1.0,
        },
    },
}
export const jscadSource = source
