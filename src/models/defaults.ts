import jscadSource from '../../docs/models/49-final.jscad?raw'
import { parseReference } from './reference'
import { buildParamsFromReference } from './build-params'

export const reference = parseReference(jscadSource)

const base = buildParamsFromReference(reference)

export const DEFAULT_BUILD_PARAMS = {
    ...base,
    plate: {
        ...base.plate,
        switchCutoutSize: 13.95,
        padding: {
            top: 2.475,
            bottom: 4.475,
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
