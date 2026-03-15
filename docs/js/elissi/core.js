// urcmk-core.js - Implementazione della formula URCMK
// Nessuna dipendenza esterna, puro JavaScript ottimizzato

class UrcmkCalculator {
    constructor() {
        // Costanti
        this.PHI = 1.618033988749895;
        this.PHI_INV = 1 / this.PHI;
        this.PI_MEZZO = Math.PI / 2;
        
        // Cache per performance
        this._cacheK = new Float64Array(1000);
        this._cacheR = new Float64Array(1000);
        this._punti = {
            x: new Float64Array(1000),
            y: new Float64Array(1000),
            z: new Float64Array(1000)
        };
        this._nPunti = 0;
    }

    // Metodo 1: Ultra-fast (rapporto 2 punti) - per rendering
    calcolaRapporto2(punti) {
        const n = punti.length;
        if (n < 2) return 1.0;
       
        let somma = 0;
        for (let i = 0; i < n - 1; i++) {
            const dx = punti[i+1].x - punti[i].x;
            const dy = punti[i+1].y - punti[i].y;
            const dz = punti[i+1].z - punti[i].z;
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            
            if (i > 0) {
                const rapporto = dist / this._cacheR[i-1];
                somma += rapporto;
            }
            this._cacheR[i] = dist;
        }
        
        return somma / (n - 2); // rapporto medio
    }

    // Metodo 2: Fast (media su 3 punti) - per real-time
    calcolaMedia3(punti) {
        const n = punti.length;
        if (n < 3) return 1.0;
        
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
            this._cacheK[i] = k;
        }
        
        const kMedio = sommaK / count;
        
        // Formula semplificata
        const radice = Math.sqrt(1 - kMedio * kMedio);
        const base = (1 + radice) / 2;
        const risultato = this.PI_MEZZO * base; // senza potenza
        
        return risultato;
    }

    // Metodo 3: Preciso (formula completa con δ)
    calcolaPreciso(punti, delta = 0.23) {
        const n = punti.length;
        if (n < 3) return this.PI_MEZZO;
        
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
            
            // Curvatura più precisa
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
        
        return {
            valore: risultato,
            k: kMedio,
            delta: delta
        };
    }

    // Metodo 4: Segmentato (alta precisione)
    calcolaSegmentato(punti, segmenti = 8) {
        const n = punti.length;
        if (n < 3) return this.PI_MEZZO;
        
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
            
            // Calcola su segmento con δ adatto
            const risultato = this.calcolaPreciso(segmento, this._deltaPerK(0.5)); // k stimato
            const peso = fine - inizio;
            
            totale += risultato.valore * peso;
            pesoTotale += peso;
        }
        
        return pesoTotale > 0 ? totale / pesoTotale : this.PI_MEZZO;
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

    // Genera punti per vari tipi di curva
    generaCurva(tipo, numPunti = 200, parametri = {}) {
        const punti = [];
        const {
            ampiezza = 2.0,
            frequenza = 1.0,
            raggio = 3.0,
            giri = 2.0,
            seed = 12345
        } = parametri;

        for (let i = 0; i < numPunti; i++) {
            const t = i / (numPunti - 1);
            const theta = t * Math.PI * 2 * frequenza;
            
            let x, y, z;
            
            switch(tipo) {
                case 'sine':
                    x = t * 10 - 5;
                    y = Math.sin(theta) * ampiezza;
                    z = 0;
                    break;
                    
                case 'circle':
                    const angolo = t * Math.PI * 2;
                    x = Math.cos(angolo) * raggio;
                    y = Math.sin(angolo) * raggio;
                    z = 0;
                    break;
                    
                case 'flag':
                    // Bandiera che sventola (onda complessa)
                    x = t * 8 - 4;
                    y = Math.sin(theta * 2) * ampiezza * 0.8 
                      + Math.sin(theta * 5) * ampiezza * 0.3;
                    z = Math.cos(theta * 1.5) * ampiezza * 0.5;
                    break;
                    
                case 'helix':
                    const angoloElica = t * Math.PI * 2 * giri;
                    x = Math.cos(angoloElica) * raggio;
                    y = Math.sin(angoloElica) * raggio;
                    z = t * 6 - 3;
                    break;
                    
                case 'random':
                    // Curva random ma smooth (per test)
                    const r1 = Math.sin(t * Math.PI * 2 * 3) * ampiezza;
                    const r2 = Math.cos(t * Math.PI * 2 * 2.7) * ampiezza;
                    const r3 = Math.sin(t * Math.PI * 2 * 4.3) * ampiezza;
                    x = t * 8 - 4 + r1 * 0.3;
                    y = r2;
                    z = r3 * 0.5;
                    break;
                    
                default:
                    x = t; y = 0; z = 0;
            }
            
            punti.push({ x, y, z });
        }
        
        return punti;
    }
}

// Esporta per uso globale
window.UrcmkCalculator = UrcmkCalculator;
