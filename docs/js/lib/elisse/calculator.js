/**
 * @fileoverview URCMK Calculator - Implementazione della formula
 * Dipende da: ../core/option.js, ../core/result.js, ../core/match.js
 */

import { Option } from '../core/option.js';
import { Result } from '../core/result.js';
import { match } from '../core/match.js';
import { pipe } from '../core/fp.js';

export class Calculator {
    constructor() {
        // Costanti
        this.PHI = 1.618033988749895;
        this.PHI_INV = 1 / this.PHI;
        this.PI_MEZZO = Math.PI / 2;

        // Cache per performance
        this._cache = {
            dist: new Float64Array(1000),
            k: new Float64Array(1000),
            rapporto: new Float64Array(1000)
        };
    }

    // Metodo 1: Ultra-fast (rapporto 2 punti)
    rapporto2(punti) {
        if (!punti || punti.length < 2) {
            return Result.err('Troppo pochi punti');
        }

        const n = punti.length;
        let somma = 0;
        let count = 0;

        for (let i = 0; i < n - 1; i++) {
            const dx = punti[i+1].x - punti[i].x;
            const dy = punti[i+1].y - punti[i].y;
            const dz = punti[i+1].z - punti[i].z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);

            this._cache.dist[i] = dist;

            if (i > 0) {
                const rapporto = dist / this._cache.dist[i-1];
                somma += rapporto;
                count++;
            }
        }

        const risultato = count > 0 ? somma / count : 1.0;
        return Result.ok(risultato);
    }

    // Metodo 2: Fast (media su 3 punti)
    media3(punti) {
        if (!punti || punti.length < 3) {
            return Result.err('Troppo pochi punti');
        }

        const n = punti.length;
        let sommaK = 0;
        let count = 0;

        for (let i = 0; i < n - 2; i++) {
            const dx1 = punti[i+1].x - punti[i].x;
            const dy1 = punti[i+1].y - punti[i].y;
            const dz1 = punti[i+1].z - punti[i].z;
            const d1 = Math.sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1);

            const dx2 = punti[i+2].x - punti[i+1].x;
            const dy2 = punti[i+2].y - punti[i+1].y;
            const dz2 = punti[i+2].z - punti[i+1].z;
            const d2 = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);

            const rapporto = d2 / d1;
            const k = 1 - rapporto; // approssimazione veloce

            sommaK += k;
            count++;
            this._cache.k[i] = k;
        }

        const kMedio = sommaK / count;

        // Formula semplificata
        const radice = Math.sqrt(Math.max(0, 1 - kMedio * kMedio));
        const base = (1 + radice) / 2;
        const risultato = this.PI_MEZZO * base;

        return Result.ok(risultato);
    }

    // Metodo 3: Preciso (formula completa con δ)
    preciso(punti, delta = 0.23) {
        if (!punti || punti.length < 3) {
            return Result.err('Troppo pochi punti');
        }

        const n = punti.length;
        let sommaK = 0;
        let count = 0;

        for (let i = 0; i < n - 2; i++) {
            const dx1 = punti[i+1].x - punti[i].x;
            const dy1 = punti[i+1].y - punti[i].y;
            const dz1 = punti[i+1].z - punti[i].z;
            const d1 = Math.sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1);

            const dx2 = punti[i+2].x - punti[i+1].x;
            const dy2 = punti[i+2].y - punti[i+1].y;
            const dz2 = punti[i+2].z - punti[i+1].z;
            const d2 = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);

            const rapporto = d2 / d1;
            const k = Math.sqrt(Math.max(0, 1 - rapporto * rapporto));

            sommaK += k;
            count++;
        }

        const kMedio = sommaK / count;

        // Formula completa
        const radice = Math.sqrt(1 - kMedio * kMedio);
        const base = (1 + radice) / 2;
        const potenza = Math.pow(base, this.PHI_INV);
        const risultato = this.PI_MEZZO * potenza * (1 + delta);

        return Result.ok({
            valore: risultato,
            k: kMedio,
            delta: delta
        });
    }

    // Metodo 4: Segmentato (alta precisione)
    segmentato(punti, segmenti = 8) {
        if (!punti || punti.length < 3) {
            return Result.err('Troppo pochi punti');
        }

        const n = punti.length;
        const puntiPerSegmento = Math.floor(n / segmenti);
        let totale = 0;
        let pesoTotale = 0;

        for (let s = 0; s < segmenti; s++) {
            const inizio = s * puntiPerSegmento;
            const fine = (s === segmenti-1) ? n : inizio + puntiPerSegmento;

            if (fine - inizio < 3) continue;

            // Estrai segmento
            const segmento = [];
            for (let i = inizio; i < fine; i++) {
                segmento.push(punti[i]);
            }

            // Calcola k medio sul segmento
            let sommaK = 0;
            let countK = 0;
            for (let i = 0; i < segmento.length - 2; i++) {
                const dx1 = segmento[i+1].x - segmento[i].x;
                const dy1 = segmento[i+1].y - segmento[i].y;
                const dz1 = segmento[i+1].z - segmento[i].z;
                const d1 = Math.sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1);

                const dx2 = segmento[i+2].x - segmento[i+1].x;
                const dy2 = segmento[i+2].y - segmento[i+1].y;
                const dz2 = segmento[i+2].z - segmento[i+1].z;
                const d2 = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);

                const rapporto = d2 / d1;
                const k = Math.sqrt(Math.max(0, 1 - rapporto * rapporto));
                sommaK += k;
                countK++;
            }

            const kLocale = countK > 0 ? sommaK / countK : 0.5;
            const delta = this._deltaPerK(kLocale);

            // Calcola valore segmento
            const radice = Math.sqrt(1 - kLocale * kLocale);
            const base = (1 + radice) / 2;
            const potenza = Math.pow(base, this.PHI_INV);
            const valore = this.PI_MEZZO * potenza * (1 + delta);

            const peso = fine - inizio;
            totale += valore * peso;
            pesoTotale += peso;
        }

        const risultato = pesoTotale > 0 ? totale / pesoTotale : this.PI_MEZZO;
        return Result.ok(risultato);
    }

    // Helper: delta in base a k
    _deltaPerK(k) {
        if (k < 0.1) return 0.0;
        if (k < 0.5) return 0.23;
        if (k < 0.7) return 0.25;
        if (k < 0.8) return 0.4;
        if (k < 0.9) return 0.7;
        if (k < 0.95) return 1.0;
        return 1.5 + (k - 0.95) * 10;
    }

    // Calcola curvatura da tre punti
    kDaTrePunti(p1, p2, p3) {
        const dx1 = p2.x - p1.x;
        const dy1 = p2.y - p1.y;
        const dz1 = p2.z - p1.z;
        const d1 = Math.sqrt(dx1*dx1 + dy1*dy1 + dz1*dz1);

        const dx2 = p3.x - p2.x;
        const dy2 = p3.y - p2.y;
        const dz2 = p3.z - p2.z;
        const d2 = Math.sqrt(dx2*dx2 + dy2*dy2 + dz2*dz2);

        const rapporto = d2 / d1;
        return Math.sqrt(Math.max(0, 1 - rapporto * rapporto));
    }

    // Versione funzionale (currying)
    static conDelta(delta) {
        return (punti) => {
            const calc = new Calculator();
            return calc.prezioso(punti, delta);
        };
    }

    static conMetodo(mode) {
        return (punti, delta, segments) => {
            const calc = new Calculator();
            return match(mode, {
                'ultrafast': () => calc.rapporto2(punti),
                'fast': () => calc.media3(punti),
                'precise': () => calc.prezioso(punti, delta),
                'segment': () => calc.segmentato(punti, segments),
                _: () => Result.err(`Metodo sconosciuto: ${mode}`)
            });
        };
    }
}
