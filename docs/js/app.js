// app.js — Entry point con iniezione dipendenze

// Inizializza Three.js e restituisce oggetto renderer
function initThreeJS() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 20);

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(document.getElementById('canvas-container').clientWidth, 
                      document.getElementById('canvas-container').clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    window.addEventListener('resize', () => {
        const container = document.getElementById('canvas-container');
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
    });

    return { scene, renderer, camera, controls, bodies: [], trailMaterials: [] };
}

document.addEventListener('DOMContentLoaded', () => {
    // 1. Crea UI
    const uiElementIds = [
        'dtSlider', 'dtValue', 'timeValue', 'E0Value', 'E1Value', 'relErrorValue',
        'statusText', 'playBtn', 'pauseBtn', 'resetBtn', 'recordBtn', 'configSelect',
        'showField', 'nBodiesSlider', 'nBodiesValue',
        'bodySelect', 'massSlider', 'massValue',
        'posX', 'posY', 'posZ',
        'velX', 'velY', 'velZ',
        'applyBtn', 'randomizeBtn'
    ];

    const ui = uiElementIds.reduce((acc, id) => {
        const el = document.getElementById(id);
        if (!el && !['showField', 'configSelect'].includes(id)) {
            console.warn(`UI element #${id} not found`);
        }
        acc[id] = el;
        return acc;
    }, {});

    // 2. Inizializza Three.js
    const threejsRenderer = initThreeJS();

    // 3. Crea motore di simulazione
    const engine = new SimulationEngine();

    // 4. Crea controller
    const controller = new UIController(engine, ui, threejsRenderer);

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
});
