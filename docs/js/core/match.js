/**
 * @fileoverview Pattern matching like Rust
 *
 * match(value, patterns)
 * matchOption(opt, { some, none })
 * matchResult(res, { ok, err })
 * matchCond(value, conditions)
 */

import { Option } from './option.js';
import { Result } from './result.js';

export function match(value, patterns) {
    // Se è un Option
    if (Option.isOption(value)) {
        return value.match(patterns);
    }

    // Se è un Result
    if (Result.isResult(value)) {
        return value.match(patterns);
    }

    // Pattern matching su valore diretto
    for (const [predicate, fn] of Object.entries(patterns)) {
        if (predicate === '_') continue; // default case

        let matches = false;
        if (typeof predicate === 'function') {
            matches = predicate(value);
        } else {
            matches = value === predicate;
        }

        if (matches) {
            return fn(value);
        }
    }

    // Default case
    if (patterns._) {
        return patterns._(value);
    }

    throw new Error(`No pattern matched for value: ${value}`);
}

export function matchOption(opt, patterns) {
    if (!Option.isOption(opt)) {
        throw new Error('matchOption richiede un Option');
    }
    return opt.match(patterns);
}

export function matchResult(res, patterns) {
    if (!Result.isResult(res)) {
        throw new Error('matchResult richiede un Result');
    }
    return res.match(patterns);
}

export function matchCond(value, conditions) {
    for (const [predicate, fn] of conditions) {
        if (predicate(value)) {
            return fn(value);
        }
    }
    throw new Error(`No condition matched for value: ${value}`);
}

export function matchType(value, typePatterns) {
    for (const [type, fn] of typePatterns) {
        if (value instanceof type) {
            return fn(value);
        }
    }
    throw new Error(`No type pattern matched for value: ${value}`);
}