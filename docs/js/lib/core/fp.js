/**
 * @fileoverview Funzioni funzionali di base
 *
 * compose, pipe, tap, identity, constant, mask
 */

// compose(f, g) = f(g(x)) - da destra a sinistra
export function compose(...fns) {
    return function(x) {
        return fns.reduceRight((acc, fn) => fn(acc), x);
    };
}

// pipe(x, f, g) = g(f(x)) - da sinistra a destra
export function pipe(...fns) {
    return function(x) {
        return fns.reduce((acc, fn) => fn(acc), x);
    };
}

// pipe con valore iniziale (versione pratica)
export function pipeValue(value, ...fns) {
    return fns.reduce((acc, fn) => fn(acc), value);
}

// tap per side effects
export function tap(value, fn) {
    fn(value);
    return value;
}

// identity function
export function identity(x) {
    return x;
}

// constant function
export function constant(x) {
    return () => x;
}

// mask: bool -> 0/1
export function mask(condition) {
    return condition ? 1 : 0;
}

// curry una funzione
export function curry(fn, arity = fn.length) {
    return function curried(...args) {
        if (args.length >= arity) {
            return fn(...args);
        }
        return (...more) => curried(...args, ...more);
    };
}

// flip ordine parametri
export function flip(fn) {
    return (a, b) => fn(b, a);
}

// applica parzialmente
export function partial(fn, ...args) {
    return (...rest) => fn(...args, ...rest);
}
