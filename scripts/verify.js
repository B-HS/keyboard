import { measurements } from '@jscad/modeling';
import { buildPlate } from '../src/models/plate';
import { keys49, computeBounds, screwPositions, stabbedKeys } from '../src/models/layout';
import { formatSummary } from '../src/models/reference';
import { reference, defaults } from './load-defaults';
const { measureBoundingBox } = measurements;
const fmt = (n) => n.toFixed(3);
const reportBbox = (label, solid) => {
    const bb = measureBoundingBox(solid);
    const [[x0, y0, z0], [x1, y1, z1]] = bb;
    console.log(`${label}`);
    console.log(`  size:   ${fmt(x1 - x0)} × ${fmt(y1 - y0)} × ${fmt(z1 - z0)}`);
    console.log(`  x:      [${fmt(x0)}, ${fmt(x1)}]`);
    console.log(`  y:      [${fmt(y0)}, ${fmt(y1)}]`);
    console.log(`  z:      [${fmt(z0)}, ${fmt(z1)}]`);
};
console.log('=== Parsed from docs/models/49-final.jscad ===');
console.log(formatSummary(reference, defaults.plate));
console.log();
const bounds = computeBounds(keys49, defaults.plate.padding);
console.log('=== Derived bounds ===');
console.log(`  x: [${fmt(bounds.minX)}, ${fmt(bounds.maxX)}]`);
console.log(`  y: [${fmt(bounds.minY)}, ${fmt(bounds.maxY)}]`);
console.log(`  size: ${fmt(bounds.maxX - bounds.minX)} × ${fmt(bounds.maxY - bounds.minY)}`);
console.log();
console.log('=== Screw positions ===');
for (const [x, y] of screwPositions(bounds, defaults.plate.screwHoleMargin)) {
    console.log(`  (${fmt(x)}, ${fmt(y)})`);
}
console.log();
console.log('=== Stabilizer targets ===');
for (const k of stabbedKeys(keys49, defaults.plate.stabilizer)) {
    const sp = defaults.plate.stabilizer.spacingByWidth[k.w];
    const y = k.cy + defaults.plate.stabilizer.padOffsetY;
    console.log(`  key ${k.id} (${k.w}u): (${fmt(k.cx - sp)}, ${fmt(y)})  (${fmt(k.cx + sp)}, ${fmt(y)})`);
}
console.log();
console.log('=== Plate solid bbox ===');
reportBbox('Plate', buildPlate(keys49, defaults.plate));
