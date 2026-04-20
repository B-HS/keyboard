import { primitives, transforms, booleans, extrusions } from '@jscad/modeling';
import { computeBounds, screwPositions, stabbedKeys } from './layout';
const { roundedRectangle, circle } = primitives;
const { translate } = transforms;
const { union, subtract } = booleans;
const { extrudeLinear } = extrusions;
export const outlineRect = (bounds, cornerRadius) => {
    const width = bounds.maxX - bounds.minX;
    const height = bounds.maxY - bounds.minY;
    const cx = (bounds.maxX + bounds.minX) / 2;
    const cy = (bounds.maxY + bounds.minY) / 2;
    return translate([cx, cy, 0], roundedRectangle({ size: [width, height], roundRadius: cornerRadius }));
};
export const buildPlate2d = (keys, params) => {
    const bounds = computeBounds(keys, params.padding);
    const outline = outlineRect(bounds, params.cornerRadius);
    const switchCuts = keys.map((k) => translate([k.cx, k.cy, 0], roundedRectangle({
        size: [params.switchCutoutSize, params.switchCutoutSize],
        roundRadius: params.switchCutoutCornerRadius,
    })));
    const stabPads = stabbedKeys(keys, params.stabilizer).flatMap((k) => {
        const spacing = params.stabilizer.spacingByWidth[k.w];
        const pad = roundedRectangle({
            size: params.stabilizer.padSize,
            roundRadius: params.stabilizer.padCornerRadius,
        });
        const y = k.cy + params.stabilizer.padOffsetY;
        return [translate([k.cx - spacing, y, 0], pad), translate([k.cx + spacing, y, 0], pad)];
    });
    const screws = params.screwHoleRadius > 0
        ? screwPositions(bounds, params.screwHoleMargin).map((pos) => translate([pos[0], pos[1], 0], circle({ radius: params.screwHoleRadius })))
        : [];
    const cutouts = union(...switchCuts, ...stabPads, ...screws);
    return subtract(outline, cutouts);
};
export const buildPlate = (keys, params) => {
    const plate2d = buildPlate2d(keys, params);
    return extrudeLinear({ height: params.thickness }, plate2d);
};
