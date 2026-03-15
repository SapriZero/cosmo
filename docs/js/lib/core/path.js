/**
 * @fileoverview Gestione path (come macro Rust)
 *
 * Path.of('a.b.c') -> Path(['a','b','c'])
 * get(obj, path)
 * set(obj, path, value)
 * update(obj, path, fn)
 */

// Classe Path
export class Path {
    constructor(segments) {
        this._segments = Array.isArray(segments) ? segments : [];
    }

    static of(path) {
        if (path instanceof Path) return path;
        if (Array.isArray(path)) return new Path(path);
        if (typeof path === 'string') {
            return new Path(path.split('.').filter(s => s.length > 0));
        }
        return new Path([]);
    }

    toArray() {
        return [...this._segments];
    }

    toString() {
        return this._segments.join('.');
    }

    parent() {
        if (this._segments.length <= 1) return new Path([]);
        return new Path(this._segments.slice(0, -1));
    }

    last() {
        return this._segments[this._segments.length - 1];
    }

    append(segment) {
        return new Path([...this._segments, segment]);
    }

    prepend(segment) {
        return new Path([segment, ...this._segments]);
    }

    length() {
        return this._segments.length;
    }

    isEmpty() {
        return this._segments.length === 0;
    }
}

// Get value at path
export function get(obj, path, defaultValue) {
    const segments = Path.of(path).toArray();
    let current = obj;

    for (let i = 0; i < segments.length; i++) {
        if (current === null || current === undefined) {
            return defaultValue;
        }
        current = current[segments[i]];
    }

    return current !== undefined ? current : defaultValue;
}

// Set value at path (immutable)
export function set(obj, path, value) {
    const segments = Path.of(path).toArray();
    if (segments.length === 0) return value;

    const result = Array.isArray(obj) ? [...obj] : { ...obj };
    let current = result;
    let parent = null;
    let lastKey = null;

    for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        parent = current;
        lastKey = key;

        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }

    const last = segments[segments.length - 1];
    current[last] = value;

    return result;
}

// Update value at path with function
export function update(obj, path, fn) {
    const current = get(obj, path);
    return set(obj, path, fn(current));
}

// Check if path exists
export function has(obj, path) {
    const segments = Path.of(path).toArray();
    let current = obj;

    for (let i = 0; i < segments.length; i++) {
        if (current === null || current === undefined) {
            return false;
        }
        if (!Object.prototype.hasOwnProperty.call(current, segments[i])) {
            return false;
        }
        current = current[segments[i]];
    }

    return true;
}

// Get nested value with fallback
export function getIn(obj, ...paths) {
    for (const path of paths) {
        const value = get(obj, path);
        if (value !== undefined) return value;
    }
    return undefined;
}

// Versione currying di get
export const getCurried = (path, defaultValue) => (obj) => get(obj, path, defaultValue);

// Versione currying di set
export const setCurried = (path) => (value) => (obj) => set(obj, path, value);

// Versione currying di update
export const updateCurried = (path) => (fn) => (obj) => update(obj, path, fn);