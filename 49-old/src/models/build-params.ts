import { keys49 } from './layout'
import { deriveDefaults, type ReferenceSpec } from './reference'
import type { PlateParams } from './plate'

export type BuildParams = {
    plate: PlateParams
}

export const buildParamsFromReference = (ref: ReferenceSpec): BuildParams => {
    const d = deriveDefaults(ref, keys49)
    const plate: PlateParams = {
        thickness: d.thickness,
        padding: d.padding,
        cornerRadius: d.cornerRadius,
        switchCutoutSize: d.switchCutoutSize,
        switchCutoutCornerRadius: d.switchCutoutCornerRadius,
        screwHoleRadius: d.screwHoleRadius,
        screwHoleMargin: d.screwHoleMargin,
        stabilizer: d.stabilizer,
    }
    return { plate }
}
