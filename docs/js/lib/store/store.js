/**
 * @fileoverview Store centrale - Gestione stato con path
 * Implementa observer pattern su path specifici
 */

import { Option } from '../core/option.js';
import { Result } from '../core/result.js';
import { match } from '../core/match.js';
import { Path, get, set, update, has } from '../core/path.js';

export class Store {
    constructor(initialState = {}) {
        this._state = initialState;
        this._listeners = new Map();  // path -> Set(callbacks)
        this._wildcardListeners = new Set();  // callback per qualsiasi cambiamento
        this._batchDepth = 0;
        this._batchQueue = [];
        this._transaction = null;
    }

    // Get value at path
    get(path, defaultValue) {
        return get(this._state, path, defaultValue);
    }

    // Get con Option (più funzionale)
    getOption(path) {
        const value = get(this._state, path);
        return Option.fromNullable(value);
    }

    // Get con Result (se il path non esiste)
    getResult(path) {
        const value = get(this._state, path);
        return value !== undefined
            ? Result.ok(value)
            : Result.err(`Path not found: ${path}`);
    }

    // Set value at path (notifica listeners)
    set(path, value) {
        const oldValue = this.get(path);

        // Aggiorna stato in modo immutabile
        this._state = set(this._state, path, value);

        // Notifica se non in batch
        this._notify(path, value, oldValue);

        return this;
    }

    // Update with function
    update(path, fn) {
        const current = this.get(path);
        const newValue = fn(current);
        return this.set(path, newValue);
    }

    // Update con Option (se il path esiste)
    updateOption(path, fn) {
        return this.getOption(path)
            .map(fn)
            .match({
                some: (newValue) => this.set(path, newValue),
                none: () => this
            });
    }

    // Merge oggetto in path specifico
    merge(path, obj) {
        const current = this.get(path, {});
        return this.set(path, { ...current, ...obj });
    }

    // Push a value to an array at path
    push(path, value) {
        const current = this.get(path, []);
        if (!Array.isArray(current)) {
            console.warn(`Path ${path} non è un array, sovrascrivo`);
            return this.set(path, [value]);
        }
        return this.set(path, [...current, value]);
    }

    // Remove value from array at path (by index or predicate)
    remove(path, predicate) {
        const current = this.get(path, []);
        if (!Array.isArray(current)) return this;

        let newArray;
        if (typeof predicate === 'number') {
            newArray = current.filter((_, i) => i !== predicate);
        } else {
            newArray = current.filter((item) => !predicate(item));
        }

        return this.set(path, newArray);
    }

    // Sottoscrivi a cambiamenti su path specifico
    subscribe(path, callback) {
        if (!this._listeners.has(path)) {
            this._listeners.set(path, new Set());
        }
        this._listeners.get(path).add(callback);

        // Return unsubscribe function
        return () => {
            const listeners = this._listeners.get(path);
            if (listeners) {
                listeners.delete(callback);
                if (listeners.size === 0) {
                    this._listeners.delete(path);
                }
            }
        };
    }

    // Sottoscrivi a qualsiasi cambiamento
    subscribeWildcard(callback) {
        this._wildcardListeners.add(callback);
        return () => this._wildcardListeners.delete(callback);
    }

    // Sottoscrivi a più path contemporaneamente
    subscribeMany(paths, callback) {
        const unsubscribers = paths.map(p => this.subscribe(p, callback));
        return () => unsubscribers.forEach(fn => fn());
    }

    // Sottoscrivi con pattern (path che iniziano con...)
    subscribePattern(prefix, callback) {
        // Questa è una implementazione semplificata
        const wrappedCallback = (newValue, oldValue, path) => {
            if (path.startsWith(prefix)) {
                callback(newValue, oldValue, path);
            }
        };

        return this.subscribeWildcard(wrappedCallback);
    }

    // Batch multiple updates (una sola notifica alla fine)
    batch(fn) {
        this._batchDepth++;
        try {
            fn();
        } finally {
            this._batchDepth--;
            if (this._batchDepth === 0) {
                this._flushBatch();
            }
        }
        return this;
    }

    // Transazione: se fallisce, ripristina stato
    transaction(fn) {
        const snapshot = JSON.parse(JSON.stringify(this._state));
        this._transaction = { snapshot, success: false };

        try {
            fn();
            this._transaction.success = true;
        } catch (error) {
            // Rollback
            this._state = snapshot;
            this._transaction = null;
            throw error;
        }

        this._transaction = null;
        return this;
    }

    // Reset completo dello stato
    reset(newState = {}) {
        const oldState = this._state;
        this._state = newState;
        this._notify('*', newState, oldState);
        return this;
    }

    // Verifica se path esiste
    has(path) {
        return has(this._state, path);
    }

    // Ottieni snapshot dello stato (per serializzazione)
    snapshot() {
        return JSON.parse(JSON.stringify(this._state));
    }

    // Carica snapshot
    loadSnapshot(snapshot) {
        return this.reset(snapshot);
    }

    // --- Private methods ---

    _notify(path, newValue, oldValue) {
        // Se siamo in batch, accoda
        if (this._batchDepth > 0 || this._transaction) {
            this._batchQueue.push({ path, newValue, oldValue });
            return;
        }

        // Notifica listener specifici del path
        const listeners = this._listeners.get(path);
        if (listeners) {
            listeners.forEach(cb => {
                try {
                    cb(newValue, oldValue, path);
                } catch (e) {
                    console.error(`Listener error for path ${path}:`, e);
                }
            });
        }

        // Notifica wildcard listeners
        this._wildcardListeners.forEach(cb => {
            try {
                cb({ path, newValue, oldValue });
            } catch (e) {
                console.error('Wildcard listener error:', e);
            }
        });
    }

    _flushBatch() {
        if (this._transaction && !this._transaction.success) {
            // Transazione fallita, non notificare
            this._batchQueue = [];
            return;
        }

        // Processa tutti gli update in batch
        const updates = [...this._batchQueue];
        this._batchQueue = [];

        // Notifica una volta per path (ultimo valore)
        const lastUpdate = new Map();
        updates.forEach(({ path, newValue, oldValue }) => {
            lastUpdate.set(path, { newValue, oldValue });
        });

        lastUpdate.forEach(({ newValue, oldValue }, path) => {
            this._notify(path, newValue, oldValue);
        });
    }
}

// Factory function per creare store con defaults
export function createStore(initialState = {}, defaults = {}) {
    const merged = { ...defaults, ...initialState };
    return new Store(merged);
}

// Hook per React-like (se serve)
export function useStore(store, path) {
    // Questa è una implementazione base, andrebbe adattata al framework
    let value = store.get(path);

    const unsubscribe = store.subscribe(path, (newValue) => {
        value = newValue;
        // Qui andrebbe chiamato un re-render
    });

    // Return cleanup
    return [value, (newValue) => store.set(path, newValue), unsubscribe];
}

export default Store;
