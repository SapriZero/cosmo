/**
 * @fileoverview UI Definitions - Sistema dichiarativo per binding DOM
 * Basato sulla filosofia URCM (naming gerarchico, alias, formati)
 */

// Namespace principale
const _namespace = 'urcmk.ui';

// Definizione campi riutilizzabili con formati
const _fields = {
    number: {
        format: (v, decimals = 6) => v?.toFixed(decimals) ?? '0.000000',
        default: 0,
        decimals: 6
    },
    integer: {
        format: (v) => v?.toString() ?? '0',
        default: 0
    },
    percent: {
        format: (v) => (v !== undefined && v !== null) ? v.toFixed(2) + '%' : '0%',
        default: '0%'
    },
    time: {
        format: (v) => (v !== undefined && v !== null) ? v.toFixed(3) + ' ms' : '0 ms',
        default: '0 ms'
    },
    raw: {
        format: (v) => v?.toString() ?? '',
        default: ''
    },
    float1: {
        format: (v) => v?.toFixed(1) ?? '0.0',
        default: 0
    },
    float2: {
        format: (v) => v?.toFixed(2) ?? '0.00',
        default: 0
    },
    float3: {
        format: (v) => v?.toFixed(3) ?? '0.000',
        default: 0
    }
};

// Path dei dati (alias lunghi)
const data = {
    // Calcoli
    teorico:   { path: 'calc.theoric',   type: 'number', decimals: 6 },
    urcmk:     { path: 'calc.result',    type: 'number', decimals: 6 },
    erroreAss: { path: 'calc.error.abs', type: 'number', decimals: 6 },
    erroreRel: { path: 'calc.error.rel', type: 'percent' },
    ops:       { path: 'calc.operations', type: 'integer' },
    tempo:     { path: 'calc.time',      type: 'time' },

    // Parametri
    kValue:    { path: 'curve.k',        type: 'float3' },
    delta:     { path: 'calc.delta',     type: 'float2' },
    segments:  { path: 'calc.segments',  type: 'integer' },

    // Curva
    curveType: { path: 'curve.type',     type: 'raw' },
    punti:     { path: 'curve.points',   type: 'raw' },

    // Performance
    perfTime:  { path: 'perf.lastTime',  type: 'time' },
    fps:       { path: 'perf.fps',       type: 'float1' }
};

// Binding DOM (ID HTML → path dati)
const dom = {
    // Stats panel
    valTeorico:   'teorico',
    valUrcmk:     'urcmk',
    valErroreAss: 'erroreAss',
    valErroreRel: 'erroreRel',
    valOps:       'ops',
    valTempo:     'tempo',
    kValue:       'kValue',

    // Sliders display
    deltaValue:   'delta',
    segmentValue: 'segments',

    // Performance
    perfDisplay:  'tempo'  // alias
};

// Flag compatti per modalità
const _F = {
    mode: ['ultrafast', 'fast', 'precise', 'segment'],
    curve: ['sine', 'circle', 'flag', 'helix', 'random'],
    precision: ['low', 'medium', 'high', 'extreme']
};

// Stati UI predefiniti
const _S = {
    rendering: {
        mode: 'ultrafast',
        delta: 0,
        segments: 4,
        description: 'Ultra-fast (2 punti, errore 5-10%)'
    },
    trading: {
        mode: 'fast',
        delta: 0.23,
        segments: 8,
        description: 'Fast (3 punti, errore 2-5%)'
    },
    physics: {
        mode: 'precise',
        delta: 0.23,
        segments: 16,
        description: 'Precise (formula + δ, errore 0.1-1%)'
    },
    scientific: {
        mode: 'segment',
        delta: 0.1,
        segments: 32,
        description: 'Segmentata (alta precisione)'
    }
};

// Configurazioni di default
const Config = {
    decimalPlaces: 6,
    timeDecimalPlaces: 3,
    defaultDelta: 0.23,
    defaultSegments: 8,
    defaultMode: 'precise',
    defaultCurve: 'sine',

    // Limiti UI
    deltaMin: 0,
    deltaMax: 2.0,
    deltaStep: 0.01,

    segmentsMin: 1,
    segmentsMax: 64,
    segmentsStep: 1
};

// Versioni compatte (alias 2-3 char) per accesso rapido
const U = {
    // Dati
    t: 'teorico',     // teorico
    u: 'urcmk',       // urcmk
    ea: 'erroreAss',  // errore assoluto
    er: 'erroreRel',  // errore relativo
    o: 'ops',         // operations
    tm: 'tempo',      // tempo
    k: 'kValue',      // curvatura
    d: 'delta',       // delta
    s: 'segments',    // segments

    // Display
    perf: 'tempo',    // perf display

    // Comandi
    mode: 'calc.mode',
    type: 'curve.type'
};

// Esporta tutto
export const UI = {
    _namespace,
    _fields,
    data,
    dom,
    _F,
    _S,
    Config,
    U
};

// Esporta anche singolarmente per comodità
export { _fields, data, dom, _F, _S, Config, U };
export default UI;
