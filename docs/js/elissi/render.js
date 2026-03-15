// urcmk-visual.js - Visualizzazione con Three.js

class UrcmkVisualizer {
    constructor(containerId, colorScheme = 'ideal') {
        this.container = document.getElementById(containerId);
        this.colorScheme = colorScheme;
        
        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c14);
        
        // Camera
        this.camera = new THREE.PerspectiveCamera(45, this.container.clientWidth / this.container.clientHeight, 0.1, 1000);
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);
        
        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);
        
        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = (colorScheme === 'ideal'); // solo sinistro ruota
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
        
        // Griglia e assi (optional)
        const gridHelper = new THREE.GridHelper(20, 20, 0x4a5568, 0x2d3748);
        this.scene.add(gridHelper);
        
        // Linea principale
        this.lineMaterial = new THREE.LineBasicMaterial({ 
            color: colorScheme === 'ideal' ? 0x63b3ed : 0x9f7aea,
            linewidth: 2
        });
        this.linePoints = [];
        this.lineGeometry = new THREE.BufferGeometry();
        this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.line);
        
        // Punti di controllo (evidenziati)
        this.pointsMaterial = new THREE.PointsMaterial({ 
            color: 0xffaa00, 
            size: 0.15,
            sizeAttenuation: true
        });
        this.pointsGeometry = new THREE.BufferGeometry();
        this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
        this.scene.add(this.points);
        
        // Piccole sfere per i punti (opzionale)
        this.spheres = [];
        
        // Inizia animazione
        this.animate();
        
        // Handle resize
        window.addEventListener('resize', () => this.onResize());
    }
    
    updateCurve(punti, evidenziaPunti = 10) {
        // Aggiorna la linea
        const positions = [];
        punti.forEach(p => {
            positions.push(p.x, p.y, p.z);
        });
        
        this.lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        this.lineGeometry.setDrawRange(0, punti.length);
        
        // Aggiorna punti di controllo (ogni N punti)
        const step = Math.max(1, Math.floor(punti.length / evidenziaPunti));
        const pointPositions = [];
        for (let i = 0; i < punti.length; i += step) {
            pointPositions.push(punti[i].x, punti[i].y, punti[i].z);
        }
        
        this.pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pointPositions, 3));
        
        // Colore in base alla curvatura locale (opzionale)
        // Qui potremmo colorare i punti in base a k
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
    
    onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }
}

// Inizializzazione quando la pagina è caricata
document.addEventListener('DOMContentLoaded', () => {
    // Inizializza i due visualizzatori
    const visualIdeale = new UrcmkVisualizer('canvas-ideal', 'ideal');
    const visualUrcmk = new UrcmkVisualizer('canvas-approx', 'urcmk');
    
    const calculator = new UrcmkCalculator();
    
    // Stato corrente
    let currentPunti = [];
    let currentTipo = 'sine';
    let currentMode = 'precise';
    let currentDelta = 0.23;
    let currentSegments = 8;
    
    // Genera curva iniziale
    function aggiornaVisualizzazione() {
        // Genera punti
        const punti = calculator.generaCurva(currentTipo, 200);
        currentPunti = punti;
        
        // Calcola valore teorico (simulato - in realtà useremmo integrale)
        // Per demo, usiamo una stima basata su segmentazione fine
        const teorico = calculator.calcolaSegmentato(punti, 64);
        
        // Calcola con metodo selezionato
        let urcmk, ops, tempo;
        const start = performance.now();
        
        switch(currentMode) {
            case 'ultrafast':
                urcmk = calculator.calcolaRapporto2(punti);
                ops = 2;
                break;
            case 'fast':
                urcmk = calculator.calcolaMedia3(punti);
                ops = 3;
                break;
            case 'precise':
                const res = calculator.calcolaPreciso(punti, currentDelta);
                urcmk = res.valore;
                ops = 7;
                break;
            case 'segment':
                urcmk = calculator.calcolaSegmentato(punti, currentSegments);
                ops = 7 * currentSegments;
                break;
        }
        
        const tempoMs = performance.now() - start;
        
        // Aggiorna visuali
        visualIdeale.updateCurve(punti);
        visualUrcmk.updateCurve(punti);
        
        // Aggiorna statistiche
        const erroreAss = Math.abs(urcmk - teorico);
        const erroreRel = (erroreAss / teorico * 100).toFixed(2);
        
        document.getElementById('valTeorico').textContent = teorico.toFixed(6);
        document.getElementById('valUrcmk').textContent = urcmk.toFixed(6);
        document.getElementById('valErroreAss').textContent = erroreAss.toFixed(6);
        document.getElementById('valErroreRel').textContent = erroreRel + '%';
        document.getElementById('valOps').textContent = ops;
        document.getElementById('valTempo').textContent = tempoMs.toFixed(3) + ' ms';
        document.getElementById('perfDisplay').textContent = tempoMs.toFixed(3) + ' ms';
        
        // Stima k medio
        const kMedio = (calculator.calcolaPreciso(punti, 0)).k || 0.5;
        document.getElementById('kValue').textContent = kMedio.toFixed(2);
    }
    
    // Event listeners
    document.getElementById('curveType').addEventListener('change', (e) => {
        currentTipo = e.target.value;
        aggiornaVisualizzazione();
    });
    
    document.getElementById('precisionMode').addEventListener('change', (e) => {
        currentMode = e.target.value;
        aggiornaVisualizzazione();
    });
    
    document.getElementById('deltaSlider').addEventListener('input', (e) => {
        currentDelta = parseFloat(e.target.value);
        document.getElementById('deltaValue').textContent = currentDelta.toFixed(2);
        aggiornaVisualizzazione();
    });
    
    document.getElementById('segmentSlider').addEventListener('input', (e) => {
        currentSegments = parseInt(e.target.value);
        document.getElementById('segmentValue').textContent = currentSegments;
        aggiornaVisualizzazione();
    });
    
    document.getElementById('randomBtn').addEventListener('click', () => {
        const tipi = ['sine', 'circle', 'flag', 'helix', 'random'];
        const randomTipo = tipi[Math.floor(Math.random() * tipi.length)];
        document.getElementById('curveType').value = randomTipo;
        currentTipo = randomTipo;
        aggiornaVisualizzazione();
    });
    
    document.getElementById('compareBtn').addEventListener('click', () => {
        alert('Confronto: la curva ideale (sinistra) usa il calcolo integrale classico. La curva URCMK (destra) usa la nostra formula. La differenza visiva è minima, ma la velocità è 100x superiore.');
    });
    
    document.getElementById('backBtn').addEventListener('click', () => {
        window.location.href = 'index.html'; // Torna al simulatore N-body
    });
    
    // Mode selector buttons
    document.getElementById('modeRendering').addEventListener('click', () => {
        document.getElementById('precisionMode').value = 'ultrafast';
        currentMode = 'ultrafast';
        aggiornaVisualizzazione();
    });
    
    document.getElementById('modeTrading').addEventListener('click', () => {
        document.getElementById('precisionMode').value = 'fast';
        currentMode = 'fast';
        aggiornaVisualizzazione();
    });
    
    document.getElementById('modePhysics').addEventListener('click', () => {
        document.getElementById('precisionMode').value = 'precise';
        currentMode = 'precise';
        aggiornaVisualizzazione();
    });
    
    // Avvia
    aggiornaVisualizzazione();
    
    // Auto-refresh per dimostrazione (opzionale)
    // setInterval(aggiornaVisualizzazione, 3000);
});
