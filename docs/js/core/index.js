/**
 * @fileoverview Entry point per la libreria core
 *
 * Uso: import { Option, Result, match, pipe, Path } from './lib/index.js'
 */

export * from './option.js';
export * from './result.js';
export * from './match.js';
export * from './fp.js';
export * from './path.js';

// Re-export combinati per comodità
import * as Option from './option.js';
import * as Result from './result.js';
import * as match from './match.js';
import * as fp from './fp.js';
import { Path } from './path.js';

export const Core = {
    Option,
    Result,
    match,
    ...fp,
    Path
};

export default Core;
