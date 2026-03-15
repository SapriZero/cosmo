/**
 * @fileoverview Option<T> - Implementazione like Rust
 *
 * Option.some(value)    - Some(value)
 * Option.none()         - None
 * Option.fromNullable(val) - Some se non null/undefined
 */

// Classe base privata
class _Option {
    constructor(tag, value) {
        this.tag = tag;
        this._value = value;
    }

    isSome() { return this.tag === 'Some'; }
    isNone() { return this.tag === 'None'; }

    map(fn) {
        if (this.isNone()) return this;
        const result = fn(this._value);
        return Option.some(result);
    }

    andThen(fn) {
        if (this.isNone()) return this;
        return fn(this._value);
    }

    unwrapOr(defaultValue) {
        return this.isSome() ? this._value : defaultValue;
    }

    unwrapOrElse(fn) {
        return this.isSome() ? this._value : fn();
    }

    filter(pred) {
        if (this.isNone()) return this;
        return pred(this._value) ? this : Option.none();
    }

    match(patterns) {
        if (this.isSome()) {
            if (typeof patterns.some === 'function') {
                return patterns.some(this._value);
            }
            throw new Error('Pattern missing for Some');
        } else {
            if (typeof patterns.none === 'function') {
                return patterns.none();
            }
            throw new Error('Pattern missing for None');
        }
    }

    toString() {
        return this.isSome() ? `Some(${this._value})` : 'None';
    }
}

class _Some extends _Option {
    constructor(value) {
        super('Some', value);
    }
}

class _None extends _Option {
    constructor() {
        super('None', undefined);
    }
}

// Singleton per None
const NONE = new _None();

export const Option = {
    some(value) {
        if (value === null || value === undefined) {
            console.warn('Option.some chiamato con null/undefined, uso Option.none()');
            return Option.none();
        }
        return new _Some(value);
    },

    none() {
        return NONE;
    },

    fromNullable(value) {
        return value === null || value === undefined
            ? Option.none()
            : Option.some(value);
    },

    of(value) {
        return Option.some(value);
    },

    isOption(obj) {
        return obj instanceof _Option;
    }
};

// Export anche le classi per type checking
export const _OptionType = _Option;
