import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseReference } from '../src/models/reference';
import { buildParamsFromReference } from '../src/models/build-params';
const jscadPath = fileURLToPath(new URL('../docs/models/49-final.jscad', import.meta.url));
const source = readFileSync(jscadPath, 'utf8');
export const reference = parseReference(source);
export const defaults = buildParamsFromReference(reference);
export const jscadSource = source;
