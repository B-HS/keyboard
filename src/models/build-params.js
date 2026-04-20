import { keys49 } from './layout';
import { deriveDefaults } from './reference';
export const buildParamsFromReference = (ref) => {
    const d = deriveDefaults(ref, keys49);
    const plate = {
        thickness: d.thickness,
        padding: d.padding,
        cornerRadius: d.cornerRadius,
        switchCutoutSize: d.switchCutoutSize,
        switchCutoutCornerRadius: d.switchCutoutCornerRadius,
        screwHoleRadius: d.screwHoleRadius,
        screwHoleMargin: d.screwHoleMargin,
        stabilizer: d.stabilizer,
    };
    return { plate };
};
