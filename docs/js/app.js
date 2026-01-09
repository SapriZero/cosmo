// app.js — Entry point (global scripts, no modules)

// Inizializza Three.js e restituisce oggetto con scena, renderer, ecc.
function initThreeJS() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111); // sfondo grigio scuro uniforme

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0); // ✅ Fondamentale!

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error("❌ Element #canvas-container not found!");
        return null;
    }

    // Assicura altezza minima
    if (container.clientHeight === 0) {
        container.style.height = '600px';
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Luci ottimizzate per visibilità
    const ambientLight = new THREE.AmbientLight(0x404040, 2.0); // più intensa
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    // 👁️‍🗨️ Sfera di prova (rimuovi questa se vedi i corpi!)
    
    const testSphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshPhongMaterial({ color: 0x00ff00 })
    );
    scene.add(testSphere);


    // Gestione resize
    function onWindowResize() {
        const width = container.clientWidth;
        const height = container.clientHeight;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }
    window.addEventListener('resize', onWindowResize);

    return { scene, renderer, camera, controls, bodies: [], trailMaterials: [] };
}

// Crea oggetto UI centralizzato
function createUI() {
    const uiElementIds = [
        'dtSlider', 'dtValue', 'timeValue', 'E0Value', 'E1Value', 'relErrorValue',
        'statusText', 'playBtn', 'pauseBtn', 'resetBtn', 'recordBtn', 'configSelect',
        'showField', 'nBodiesSlider', 'nBodiesValue',
        'bodySelect', 'massSlider', 'massValue',
        'posX', 'posY', 'posZ',
        'velX', 'velY', 'velZ',
        'applyBtn', 'randomizeBtn'
    ];

    const ui = {};
    let missingCount = 0;
    uiElementIds.forEach(id => {
        const el = document.getElementById(id);
        if (!el && !['showField', 'configSelect'].includes(id)) {
            console.warn(`⚠️ UI element #${id} not found`);
            missingCount++;
        }
        ui[id] = el;
    });

    if (missingCount > 0) {
        console.error(`❌ ${missingCount} UI elements missing. Check your HTML.`);
    }
    return ui;
}

// Entry point
document.addEventListener('DOMContentLoaded', () => {
    console.log("🚀 Starting N-Body Simulator...");

    // 1. Crea UI
    const ui = createUI();
    if (!ui.playBtn) {
        console.error("UI initialization failed.");
        return;
    }

    // 2. Inizializza Three.js
    const threejs = initThreeJS();
    if (!threejs) {
        console.error("Three.js initialization failed.");
        return;
    }

    // 3. Crea motore di simulazione
    const engine = new window.SimulationEngine();

    // 4. Verifica e crea controller
    if (typeof window.UIController === 'undefined') {
        console.error("❌ UIController not loaded! Check script order and syntax.");
        return;
    }
    const controller = new window.UIController(engine, ui, threejs);

    // 5. Inizializza simulazione
    engine.initSimulation('lagrange', 3);
    controller.setupSceneForN(3);
    controller.updateVisualization();
    controller.updateUI();

    // 6. Imposta valori UI iniziali
    ui.dtValue.textContent = engine.dt.toFixed(4);
    ui.nBodiesValue.textContent = engine.currentN.toString();
    ui.statusText.textContent = 'Paused';

    // 7. Avvia controller
    controller.setupEventListeners();

    console.log("✅ Simulator ready!");
});
