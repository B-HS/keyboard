import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serialize as stlSerialize } from '@jscad/stl-serializer';
import { buildCaseTop, buildCaseBottom, DEFAULT_CASE_PARAMS } from '../src/models/case';
import { buildBatteryCover as _buildBatteryCover } from '../src/models/accessories';
import { keys49 } from '../src/models/layout';
import { defaults } from './load-defaults';
const outDir = fileURLToPath(new URL('../docs/export/', import.meta.url));
mkdirSync(outDir, { recursive: true });
const writeStl = (name, solid) => {
    const data = stlSerialize({ binary: true }, solid);
    const buffer = Buffer.concat(data.map((chunk) => Buffer.from(chunk)));
    const path = `${outDir}${name}.stl`;
    writeFileSync(path, buffer);
    console.log(`Wrote ${path} (${(buffer.length / 1024).toFixed(1)} KB)`);
};
for (const name of ['plate.stl', 'case.stl', 'plate.dxf']) {
    try {
        rmSync(`${outDir}${name}`);
    }
    catch {
        // ignore if not exists
    }
}
writeStl('case-top', buildCaseTop(keys49, defaults));
writeStl('case-bottom', buildCaseBottom(keys49, defaults));
writeStl('battery-cover', _buildBatteryCover(DEFAULT_CASE_PARAMS));
console.log('\nDone. Files are in docs/export/');
