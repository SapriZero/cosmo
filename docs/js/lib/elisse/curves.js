/**
 * @fileoverview Generatori di curve per URCMK
 * Produce punti in formato {x, y, z}
 */

import { Option } from '../core/option.js';
import { Result } from '../core/result.js';
import { match } from '../core/match.js';

export const CurveGenerators = {
    // Sinusoide
    sine: (numPunti = 200, params = {}) => {
        const { ampiezza = 2.0, frequenza = 1.0, offset = 0 } = params;
        const punti = [];

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);
            const theta = t * Math.PI * 2 * frequenza + offset;

            punti.push({
                x: t * 10 - 5,
                y: Math.sin(theta) * ampiezza,
                z: 0
            });
        }

        return punti;
    },

    // Cerchio
    circle: (numPunti = 200, params = {}) => {
        const { raggio = 3.0, offset = 0 } = params;
        const punti = [];

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);
            const angolo = t * Math.PI * 2 + offset;

            punti.push({
                x: Math.cos(angolo) * raggio,
                y: Math.sin(angolo) * raggio,
                z: 0
            });
        }

        return punti;
    },

    // Bandiera che sventola (onda complessa)
    flag: (numPunti = 200, params = {}) => {
        const { ampiezza = 2.0, frequenza = 1.0, vento = 0.5 } = params;
        const punti = [];

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);
            const theta = t * Math.PI * 2 * frequenza;

            // Onda principale + armoniche
            const y1 = Math.sin(theta) * ampiezza;
            const y2 = Math.sin(theta * 3) * ampiezza * 0.2;
            const y3 = Math.cos(theta * 2) * ampiezza * vento;

            // Leggera profondità per effetto 3D
            const z = Math.cos(theta * 1.5) * ampiezza * 0.3;

            punti.push({
                x: t * 8 - 4,
                y: y1 + y2 + y3,
                z: z
            });
        }

        return punti;
    },

    // Elica 3D
    helix: (numPunti = 200, params = {}) => {
        const { raggio = 2.0, altezza = 5.0, giri = 2.0 } = params;
        const punti = [];

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);
            const angolo = t * Math.PI * 2 * giri;

            punti.push({
                x: Math.cos(angolo) * raggio,
                y: Math.sin(angolo) * raggio,
                z: (t - 0.5) * altezza
            });
        }

        return punti;
    },

    // Curva random (per test)
    random: (numPunti = 200, params = {}) => {
        const { ampiezza = 2.0, seed = 12345 } = params;
        const punti = [];

        // Semplice PRNG
        let r = seed;
        const rand = () => {
            r = (r * 9301 + 49297) % 233280;
            return r / 233280;
        };

        let y = 0;
        let z = 0;

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);

            // Random walk con smoothing
            y += (rand() - 0.5) * ampiezza * 0.2;
            z += (rand() - 0.5) * ampiezza * 0.1;

            punti.push({
                x: t * 10 - 5,
                y: Math.sin(t * Math.PI * 4) * ampiezza * 0.5 + y,
                z: Math.cos(t * Math.PI * 3) * ampiezza * 0.3 + z
            });
        }

        return punti;
    },

    // Parabola
    parabola: (numPunti = 200, params = {}) => {
        const { ampiezza = 2.0, offset = 0 } = params;
        const punti = [];

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);
            const x = t * 8 - 4;

            punti.push({
                x: x,
                y: ampiezza * (1 - (x/4) * (x/4)) + offset,
                z: 0
            });
        }

        return punti;
    },

    // Curva a Lissajous
    lissajous: (numPunti = 200, params = {}) => {
        const { a = 3.0, b = 2.0, delta = Math.PI/2 } = params;
        const punti = [];

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1) * Math.PI * 2;

            punti.push({
                x: Math.sin(a * t) * 3,
                y: Math.sin(b * t + delta) * 3,
                z: Math.cos(t) * 1.5
            });
        }

        return punti;
    },

    // Factory method
    genera: (tipo, numPunti = 200, params = {}) => {
        const generator = CurveGenerators[tipo];
        if (!generator) {
            console.warn(`Tipo curva sconosciuto: ${tipo}, uso sine`);
            return CurveGenerators.sine(numPunti, params);
        }
        return generator(numPunti, params);
    },

    // Versione con Result
    generaResult: (tipo, numPunti = 200, params = {}) => {
        const generator = CurveGenerators[tipo];
        if (!generator) {
            return Result.err(`Tipo curva sconosciuto: ${tipo}`);
        }
        return Result.ok(generator(numPunti, params));
    },

    // Lista tipi disponibili
    tipi: [
        'sine', 'circle', 'flag', 'helix',
        'random', 'parabola', 'lissajous'
    ],

    // Parametri di default per tipo
    defaultParams: (tipo) => match(tipo, {
        'sine': () => ({ ampiezza: 2.0, frequenza: 1.0 }),
        'circle': () => ({ raggio: 3.0 }),
        'flag': () => ({ ampiezza: 2.0, frequenza: 1.0, vento: 0.5 }),
        'helix': () => ({ raggio: 2.0, altezza: 5.0, giri: 2.0 }),
        'random': () => ({ ampiezza: 2.0, seed: 12345 }),
        'parabola': () => ({ ampiezza: 2.0 }),
        'lissajous': () => ({ a: 3.0, b: 2.0, delta: Math.PI/2 }),
        _: () => ({})
    })
};

export default CurveGenerators;
