// app.js — Entry point (global scripts, no modules)

// Inizializza Three.js e restituisce oggetto con scena, renderer, ecc.
function initThreeJS() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 20);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error("❌ Element #canvas-container not found!");
        return null;
    }

    // Imposta dimensione minima se necessario
    if (container.clientHeight === 0) {
        container.style.height = '600px';
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);
    
    // Luce molto forte per assicurare visibilità
    const debugLight = new THREE.PointLight(0xffffff, 5, 100);
    debugLight.position.set(0, 0, 10);
    scene.add(debugLight);
    scene.background = new THREE.Color(0x222222); // grigio scuro invece di nero

// Assicurati che la camera guardi l'origine
camera.lookAt(0, 0, 0);

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
    const engine = new SimulationEngine();

    // 4. Crea controller UI
    const controller = new UIController(engine, ui, threejs);

    // 5. Inizializza simulazione
    engine.initSimulation('lagrange', 3);
console.log("About to call setupSceneForN...");
controller.setupSceneForN(3);
console.log("setupSceneForN called.");
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
