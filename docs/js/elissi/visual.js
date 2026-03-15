/**
 * @fileoverview Visualizzazione Three.js per URCMK con sistema definizioni
 * Dipende da: store/definitions.js, src/urcmk/calculator.js, src/urcmk/curves.js
 */

// visual.js - Import corretti per la struttura attuale
import { UI, U, Config, _F, _S } from '../store/definitions.js';
import { Calculator } from '../lib/elissi/calculator.js';        // senza 'Urcmk' nel nome
import { Curves } from '../lib/elissi/curves.js';                // senza 'Generator'
import { Store } from '../lib/store/store.js';
import { Binder } from '../ui/binder.js';                   // senza 'UI' nel nome
import { Option, Result, match } from '../lib/core/index.js';

// All'inizio del file, subito dopo gli import
console.log('🚀 visual.js: inizio caricamento');

window.addEventListener('error', (e) => {
    console.error('🔥 ERRORE CATTURATO:', e.error || e.message);
});

try {
    // Il resto del codice...
} catch (e) {
    console.error('❌ ERRORE IN visual.js:', e);
}

class UrcmkVisualizer {
    constructor(containerId, colorScheme = 'ideal', store = null) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container ${containerId} non trovato`);
        }

        this.colorScheme = colorScheme;
        this.store = store;
        this.color = colorScheme === 'ideal' ? 0x63b3ed : 0x9f7aea;
        this.autoRotate = colorScheme === 'ideal';

        // Inizializza Three.js
        this._initThree();

        // Avvia animazione
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this._onResize());
    }

    _initThree() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c14);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = 1.0;

        // Luci
        const ambientLight = new THREE.AmbientLight(0x404060);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(1, 2, 1);
        this.scene.add(dirLight);

        const backLight = new THREE.PointLight(0x4466aa, 0.5);
        backLight.position.set(-2, 1, -2);
        this.scene.add(backLight);

        // Griglia
        const gridHelper = new THREE.GridHelper(20, 20, 0x4a5568, 0x2d3748);
        this.scene.add(gridHelper);

        // Linea principale
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            linewidth: 2
        });
        this.lineGeometry = new THREE.BufferGeometry();
        this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.line);

        // Punti di controllo
        this.pointsMaterial = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 0.15,
            sizeAttenuation: true
        });
        this.pointsGeometry = new THREE.BufferGeometry();
        this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
        this.scene.add(this.points);
    }

    updateCurve(punti, evidenziaPunti = 10) {
        if (!punti || punti.length === 0) return;

        // Aggiorna linea
        const positions = [];
        punti.forEach(p => {
            positions.push(p.x, p.y, p.z);
        });

        this.lineGeometry.setAttribute('position',
            new THREE.Float32BufferAttribute(positions, 3));
        this.lineGeometry.setDrawRange(0, punti.length);

        // Aggiorna punti di controllo
        const step = Math.max(1, Math.floor(punti.length / evidenziaPunti));
        const pointPositions = [];
        for (let i = 0; i < punti.length; i += step) {
            pointPositions.push(punti[i].x, punti[i].y, punti[i].z);
        }

        this.pointsGeometry.setAttribute('position',
            new THREE.Float32BufferAttribute(pointPositions, 3));
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    destroy() {
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
    }
}

// Inizializzazione principale con definizioni
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Avvio URCMK con sistema definizioni');

    // Crea store con stato iniziale
    const store = new Store({
        calc: {
            theoric: 0,
            result: 0,
            error: { abs: 0, rel: 0 },
            operations: 0,
            time: 0,
            delta: Config.defaultDelta,
            segments: Config.defaultSegments,
            mode: Config.defaultMode
        },
        curve: {
            type: Config.defaultCurve,
            points: [],
            k: 0.5
        },
        perf: {
            lastTime: 0,
            fps: 0
        },
        ui: {
            ..._S.physics  // stato iniziale
        }
    });

    // Crea binder con definizioni
    const binder = new UIBinder(store, UI, U);
    binder.bindAll();

    // Inizializza visualizzatori
    const visualIdeale = new UrcmkVisualizer('canvas-ideal', 'ideal', store);
    const visualUrcmk = new UrcmkVisualizer('canvas-approx', 'urcmk', store);

    const calculator = new UrcmkCalculator();

    // Funzione di aggiornamento principale
    function aggiornaVisualizzazione() {
        // Leggi stato dallo store
        const tipo = store.get(UI.data.curveType.path, Config.defaultCurve);
        const mode = store.get(UI.data.mode?.path || 'calc.mode', Config.defaultMode);
        const delta = store.get(UI.data.delta.path, Config.defaultDelta);
        const segments = store.get(UI.data.segments.path, Config.defaultSegments);

        // Genera punti
        const punti = Option.fromNullable(CurveGenerators[tipo])
            .map(gen => gen(200))
            .unwrapOr(CurveGenerators.sine(200));

        // Aggiorna punti nello store
        store.set(UI.data.punti.path, punti);

        // Calcola teorico (simulato con segmentazione fine)
        const teoricoResult = calculator.segmentato(punti, 64);
        const teorico = teoricoResult.isOk() ? teoricoResult._value : 0;
        store.set(UI.data.teorico.path, teorico);

        // Calcola con metodo selezionato
        const start = performance.now();

        const result = match(mode, {
            'ultrafast': () => calculator.rapporto2(punti),
            'fast': () => calculator.media3(punti),
            'precise': () => calculator.prezioso(punti, delta),
            'segment': () => calculator.segmentato(punti, segments),
            _: () => Result.err('Metodo sconosciuto')
        });

        const tempoMs = performance.now() - start;
        store.set(UI.data.tempo.path, tempoMs);
        store.set(UI.data.perfTime.path, tempoMs);

        // Gestisci risultato
        match(result, {
            ok: (val) => {
                const valore = typeof val === 'object' ? val.valore : val;
                store.set(UI.data.urcmk.path, valore);

                const erroreAss = Math.abs(valore - teorico);
                const erroreRel = (erroreAss / teorico * 100);

                store.set(UI.data.erroreAss.path, erroreAss);
                store.set(UI.data.erroreRel.path, erroreRel);

                // Aggiorna k se disponibile
                if (typeof val === 'object' && val.k) {
                    store.set(UI.data.kValue.path, val.k);
                }
            },
            err: (e) => {
                console.error('Errore calcolo:', e);
                store.set('calc.error.message', e);
            }
        });

        // Aggiorna operazioni
        const ops = match(mode, {
            'ultrafast': 2,
            'fast': 3,
            'precise': 7,
            'segment': 7 * segments,
            _: 0
        });
        store.set(UI.data.ops.path, ops);

        // Aggiorna visualizzatori
        visualIdeale.updateCurve(punti);
        visualUrcmk.updateCurve(punti);

        // Aggiorna tutti i binding
        binder.updateAll();
    }
    
    // === EVENT LISTENERS (da mettere dentro DOMContentLoaded) ===

		// Curve type
		const curveType = document.getElementById('curveType');
		if (curveType) {
		    curveType.addEventListener('change', (e) => {
		        console.log('Curva cambiata:', e.target.value);
		        store.set('curve.type', e.target.value);
		        aggiornaVisualizzazione();
		    });
		} else console.warn('curveType non trovato');
		
		// Precision mode
		const precisionMode = document.getElementById('precisionMode');
		if (precisionMode) {
		    precisionMode.addEventListener('change', (e) => {
		        console.log('Modo cambiato:', e.target.value);
		        store.set('calc.mode', e.target.value);
		        aggiornaVisualizzazione();
		    });
		} else console.warn('precisionMode non trovato');
		
		// Delta slider
		const deltaSlider = document.getElementById('deltaSlider');
		if (deltaSlider) {
		    deltaSlider.addEventListener('input', (e) => {
		        const val = parseFloat(e.target.value);
		        document.getElementById('deltaValue').textContent = val.toFixed(2);
		        store.set('calc.delta', val);
		        aggiornaVisualizzazione();
		    });
		} else console.warn('deltaSlider non trovato');
		
		// Segment slider
		const segmentSlider = document.getElementById('segmentSlider');
		if (segmentSlider) {
		    segmentSlider.addEventListener('input', (e) => {
		        const val = parseInt(e.target.value);
		        document.getElementById('segmentValue').textContent = val;
		        store.set('calc.segments', val);
		        aggiornaVisualizzazione();
		    });
		} else console.warn('segmentSlider non trovato');
		
		// Mode buttons
		const modeRendering = document.getElementById('modeRendering');
		if (modeRendering) {
		    modeRendering.addEventListener('click', () => {
		        store.batch?.(() => {
		            store.set('calc.mode', 'ultrafast');
		            store.set('calc.delta', 0);
		            store.set('calc.segments', 4);
		        }) || (() => {
		            store.set('calc.mode', 'ultrafast');
		            store.set('calc.delta', 0);
		            store.set('calc.segments', 4);
		        })();
		        document.getElementById('precisionMode').value = 'ultrafast';
		        aggiornaVisualizzazione();
		    });
		}
		
		// Random button
		const randomBtn = document.getElementById('randomBtn');
		if (randomBtn) {
		    randomBtn.addEventListener('click', () => {
		        const tipi = ['sine', 'circle', 'flag', 'helix', 'parabola', 'lissajous', 'random'];
		        const randomTipo = tipi[Math.floor(Math.random() * tipi.length)];
		        store.set('curve.type', randomTipo);
		        document.getElementById('curveType').value = randomTipo;
		        aggiornaVisualizzazione();
		    });
		}
		
		// Compare button
		const compareBtn = document.getElementById('compareBtn');
		if (compareBtn) {
		    compareBtn.addEventListener('click', () => {
		        alert('Confronto: errore ' + store.get('calc.error.rel', 0).toFixed(2) + '%');
		    });
		}
		
		// Back button
		const backBtn = document.getElementById('backBtn');
		if (backBtn) {
		    backBtn.addEventListener('click', () => {
		        window.location.href = '../index.html';
		    });
		}
    
    // Sottoscrivi ai cambiamenti per debug
    store.subscribeWildcard(({ path, newValue }) => {
        if (path.includes('error') || path.includes('result')) {
            console.log(`📊 ${path}:`, newValue);
        }
    });

    // Avvia
    aggiornaVisualizzazione();
    console.log('✅ URCMK inizializzato con definizioni');
});
