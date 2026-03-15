/**
 * @fileoverview Result<T, E> - Implementazione like Rust
 *
 * Result.ok(value)      - Ok(value)
 * Result.err(error)     - Err(error)
 * Result.fromTry(fn)    - Cattura eccezioni
 */

class _Result {
    constructor(tag, value, error) {
        this.tag = tag;
        this._value = value;
        this._error = error;
    }

    isOk() { return this.tag === 'Ok'; }
    isErr() { return this.tag === 'Err'; }

    map(fn) {
        if (this.isErr()) return this;
        return Result.ok(fn(this._value));
    }

    mapErr(fn) {
        if (this.isOk()) return this;
        return Result.err(fn(this._error));
    }

    andThen(fn) {
        if (this.isErr()) return this;
        return fn(this._value);
    }

    unwrapOr(defaultValue) {
        return this.isOk() ? this._value : defaultValue;
    }

    unwrapOrElse(fn) {
        return this.isOk() ? this._value : fn(this._error);
    }

    match(patterns) {
        if (this.isOk()) {
            if (typeof patterns.ok === 'function') {
                return patterns.ok(this._value);
            }
            throw new Error('Pattern missing for Ok');
        } else {
            if (typeof patterns.err === 'function') {
                return patterns.err(this._error);
            }
            throw new Error('Pattern missing for Err');
        }
    }

    toString() {
        return this.isOk() ? `Ok(${this._value})` : `Err(${this._error})`;
    }
}

class _Ok extends _Result {
    constructor(value) {
        super('Ok', value, null);
    }
}

class _Err extends _Result {
    constructor(error) {
        super('Err', null, error);
    }
}

export const Result = {
    ok(value) {
        return new _Ok(value);
    },

    err(error) {
        return new _Err(error);
    },

    fromTry(fn) {
        try {
            return Result.ok(fn());
        } catch (error) {
            return Result.err(error);
        }
    },

    isResult(obj) {
        return obj instanceof _Result;
    }
};

export const _ResultType = _Result;
