// app.js — Entry point (global scripts, no modules)

// Inizializza Three.js e restituisce oggetto con scena, renderer, ecc.
function initThreeJS() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x111111);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    const container = document.getElementById('canvas-container');
    if (!container) {
        console.error("❌ Element #canvas-container not found!");
        return null;
    }

    if (container.clientHeight === 0) {
        container.style.height = '600px';
    }
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Luci per rendering 3D efficace
    const ambientLight = new THREE.AmbientLight(0x404040, 1.8);
    scene.add(ambientLight);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(3, 4, 5);
    scene.add(mainLight);

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

    // 2. Inizializza Three.js (solo grafica, niente engine qui!)
    const threejs = initThreeJS();
    if (!threejs) {
        console.error("Three.js initialization failed.");
        return;
    }

    // 3. Crea motore di simulazione
    const engine = new window.SimulationEngine();

    // 4. Crea controller UI
    const controller = new window.UIController(engine, ui, threejs);

    // 5. Inizializza simulazione
    engine.initSimulation('lagrange', 3);
    controller.setupSceneForN(3);
    controller.updateVisualization();
    controller.updateUI();

    // 6. Renderizza la scena iniziale (corpi visibili all'avvio)
    threejs.renderer.render(threejs.scene, threejs.camera);

    // 7. Imposta valori UI
    ui.dtValue.textContent = engine.dt.toFixed(4);
    ui.nBodiesValue.textContent = engine.currentN.toString();
    ui.statusText.textContent = 'Paused';

    // 8. Avvia controller
    controller.setupEventListeners();

    console.log("✅ Simulator ready!");
});
