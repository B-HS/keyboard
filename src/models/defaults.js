import jscadSource from '../../docs/models/49-final.jscad?raw';
import { parseReference } from './reference';
import { buildParamsFromReference } from './build-params';
export const reference = parseReference(jscadSource);
export const DEFAULT_BUILD_PARAMS = buildParamsFromReference(reference);
