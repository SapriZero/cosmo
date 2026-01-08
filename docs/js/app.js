// app.js — Final N-Body 3D Simulator with Full Features
document.addEventListener('DOMContentLoaded', () => {

let scene, camera, renderer, controls;
let bodies = []; // Three.js meshes (dinamico)
let trajectories = []; // dinamico
const MAX_TRAIL = 500;
let trailMaterials = []; // dinamico

// Gravitational field
let fieldLines = [];
const FIELD_RESOLUTION = 5;
const FIELD_SCALE = 0.2;

// Simulation state
let state, E0, simulatedTime = 0, dt = 0.001;
let isRunning = false;
let animationId = null;
let currentConfig = 'lagrange';
let currentN = 3;

// Recording
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;

// UI elements
const dtSlider = document.getElementById('dtSlider');
const dtValue = document.getElementById('dtValue');
const timeValue = document.getElementById('timeValue');
const E0Value = document.getElementById('E0Value');
const E1Value = document.getElementById('E1Value');
const relErrorValue = document.getElementById('relErrorValue');
const statusText = document.getElementById('statusText');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const resetBtn = document.getElementById('resetBtn');
const recordBtn = document.getElementById('recordBtn');
const configSelect = document.getElementById('configSelect');
const showFieldCheckbox = document.getElementById('showField');
const nBodiesSlider = document.getElementById('nBodiesSlider');
const nBodiesValue = document.getElementById('nBodiesValue');

// Editor corpo
let selectedBodyIndex = 0;
const bodySelect = document.getElementById('bodySelect');
const massSlider = document.getElementById('massSlider');
const massValue = document.getElementById('massValue');
const posX = document.getElementById('posX');
const posY = document.getElementById('posY');
const posZ = document.getElementById('posZ');
const velX = document.getElementById('velX');
const velY = document.getElementById('velY');
const velZ = document.getElementById('velZ');
const applyBtn = document.getElementById('applyBtn');
const randomizeBtn = document.getElementById('randomizeBtn');

// Utility: raggio in base alla massa (r ∝ m^(1/3))
function getBodyRadius(mass) {
    const radius = 0.03 + 0.08 * Math.pow(mass, 1/3);
    return Math.max(0.03, radius); // minimo visibile
}

// Utility: colori distinti
function generateColors(n) {
    const colors = [];
    for (let i = 0; i < n; i++) {
        const hue = (i * 137.507) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 65%)`);
        colors.push(color);
    }
    return colors;
}

// Inizializza Three.js
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a14);
    scene.fog = new THREE.Fog(0x0a0a14, 10, 20);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 5);

    renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(document.getElementById('canvas-container').clientWidth, 
                      document.getElementById('canvas-container').clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('canvas-container').appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    window.addEventListener('resize', onWindowResize);
}

function onWindowResize() {
    const container = document.getElementById('canvas-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

// Ricrea la scena per N corpi (con dimensioni proporzionali alla massa)
function setupSceneForN(n) {
    // Rimuovi vecchi oggetti
    bodies.forEach(mesh => {
        mesh.geometry.dispose();
        scene.remove(mesh);
    });
    for (let i = 0; i < 100; i++) {
        const trail = scene.getObjectByName(`trail-${i}`);
        if (trail) scene.remove(trail);
    }

    // Reset
    bodies = [];
    trajectories = Array(n).fill().map(() => []);
    trailMaterials = [];

    // Crea nuovi corpi con dimensione basata sulla massa
    const colors = generateColors(n);
    for (let i = 0; i < n; i++) {
	const mass = state[i].m;

        const radius = getBodyRadius(mass);
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshPhongMaterial({ color: colors[i] });
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);
        bodies.push(mesh);
        trailMaterials.push(new THREE.LineBasicMaterial({ color: colors[i] }));
    }

    // Aggiorna menu corpo
    if (bodySelect) {
        bodySelect.innerHTML = '';
        for (let i = 0; i < n; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `Body ${i + 1}`;
            bodySelect.appendChild(option);
        }
        selectedBodyIndex = 0;
        if (n > 0) loadBodyParameters(0);
    }
}

// Stato casuale stabile per N corpi
function createRandomStableState(N) {
    const bodies = [];
    for (let i = 0; i < N; i++) {
        const angle = (i / N) * Math.PI * 2 + Math.random() * 0.5;
        const radius = 1.0 + Math.random() * 2.0;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = (Math.random() - 0.5) * 0.1;

        const speed = 0.8 / Math.sqrt(radius);
        const vx = -Math.sin(angle) * speed + (Math.random() - 0.5) * 0.1;
        const vy = Math.cos(angle) * speed + (Math.random() - 0.5) * 0.1;
        const vz = (Math.random() - 0.5) * 0.05;

        bodies.push(new Body(1.0, [x, y, z], [vx, vy, vz]));
    }
    return bodies;
}

// Campo gravitazionale (solo per N ≤ 5)
function createGravitationalField() {
    fieldLines.forEach(line => scene.remove(line));
    fieldLines = [];

    if (!showFieldCheckbox || !showFieldCheckbox.checked || state.length > 5) return;

    const size = 2.0;
    const step = (2 * size) / (FIELD_RESOLUTION - 1);
    const half = size;

    for (let i = 0; i < FIELD_RESOLUTION; i++) {
        for (let j = 0; j < FIELD_RESOLUTION; j++) {
            for (let k = 0; k < FIELD_RESOLUTION; k++) {
                const x = -half + i * step;
                const y = -half + j * step;
                const z = -half + k * step;

                let ax = 0, ay = 0, az = 0;
                const G = 1.0, eps = 1e-3;
                for (const body of state) {
                    const dx = body.r[0] - x;
                    const dy = body.r[1] - y;
                    const dz = body.r[2] - z;
                    const distSq = dx*dx + dy*dy + dz*dz;
                    const dist = Math.sqrt(distSq) + eps;
                    const distCubed = dist * distSq;
                    const factor = G * body.m / distCubed;
                    ax += factor * dx;
                    ay += factor * dy;
                    az += factor * dz;
                }

                const accMag = Math.sqrt(ax*ax + ay*ay + az*az);
                if (accMag < 0.1) continue;

                const scale = Math.min(accMag, 1.0) * FIELD_SCALE;
                const dirX = ax / accMag * scale;
                const dirY = ay / accMag * scale;
                const dirZ = az / accMag * scale;

                const origin = new THREE.Vector3(x, y, z);
                const direction = new THREE.Vector3(dirX, dirY, dirZ);
                const arrow = new THREE.ArrowHelper(
                    direction.clone().normalize(),
                    origin,
                    direction.length(),
                    0x5555ff,
                    0.1,
                    0.05
                );
                scene.add(arrow);
                fieldLines.push(arrow);
            }
        }
    }
}

// Inizializza simulazione
function initSimulation(configKey = currentConfig, N = currentN) {
    currentConfig = configKey;
    currentN = N;

    if (N === 3 && configKey === 'lagrange') {
        state = window.InitialConfigurations.lagrange.fn();
    } else if (N === 3 && configKey === 'figure8') {
        state = window.InitialConfigurations.figure8.fn();
    } else {
        state = createRandomStableState(N);
    }

    setupSceneForN(N);
    E0 = window.totalEnergy(state);
    simulatedTime = 0;
    trajectories.forEach(t => t.length = 0);
    updateUI();
    createGravitationalField();
}

// Aggiorna visualizzazione
function updateVisualization() {
    for (let i = 0; i < state.length; i++) {
        bodies[i].position.set(state[i].r[0], state[i].r[1], state[i].r[2]);
    }

    for (let i = 0; i < state.length; i++) {
        trajectories[i].push([...state[i].r]);
        if (trajectories[i].length > MAX_TRAIL) {
            trajectories[i].shift();
        }

        const existing = scene.getObjectByName(`trail-${i}`);
        if (existing) scene.remove(existing);

        if (trajectories[i].length > 1) {
            const points = trajectories[i].map(p => new THREE.Vector3(p[0], p[1], p[2]));
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const line = new THREE.Line(geometry, trailMaterials[i]);
            line.name = `trail-${i}`;
            scene.add(line);
        }
    }

    if (Math.floor(simulatedTime / dt) % 10 === 0) {
        createGravitationalField();
    }
}

// Passo simulazione
function step() {
    if (!isRunning) return;
    state = window.leapfrogStep(state, dt);
    simulatedTime += dt;
    updateVisualization();
    updateEnergyUI();
}

// Energia
function updateEnergyUI() {
    const E1 = window.totalEnergy(state);
    const relError = Math.abs(E1 - E0) / (Math.abs(E0) + 1e-15);
    E1Value.textContent = E1.toFixed(6);
    relErrorValue.textContent = relError.toExponential(2);
    if (relError < 1e-4) relErrorValue.className = 'energy-good';
    else if (relError < 1e-2) relErrorValue.className = 'energy-warning';
    else relErrorValue.className = 'energy-bad';
    timeValue.textContent = simulatedTime.toFixed(3);
}

function updateUI() {
    E0Value.textContent = E0.toFixed(6);
    timeValue.textContent = "0.000";
    E1Value.textContent = E0.toFixed(6);
    relErrorValue.textContent = "0.00e+0";
    relErrorValue.className = 'energy-good';
}

// Video
function startRecording() {
    if (isRecording) return;
    recordedChunks = [];
    const stream = renderer.domElement.captureStream(30);
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
    mediaRecorder.ondataavailable = event => {
        if (event.data.size > 0) recordedChunks.push(event.data);
    };
    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `n-body-${currentN}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
        isRecording = false;
        recordBtn.textContent = '⏺️ Record Video';
    };
    mediaRecorder.start();
    isRecording = true;
    recordBtn.textContent = '⏹️ Stop Recording';
}

function stopRecording() {
    if (mediaRecorder && isRecording) mediaRecorder.stop();
}

// Editor: carica parametri corpo
function loadBodyParameters(index) {
    if (!state || index >= state.length) return;
    const body = state[index];
    massSlider.value = body.m;
    massValue.textContent = body.m.toFixed(1);
    posX.value = body.r[0].toFixed(2);
    posY.value = body.r[1].toFixed(2);
    posZ.value = body.r[2].toFixed(2);
    velX.value = body.v[0].toFixed(2);
    velY.value = body.v[1].toFixed(2);
    velZ.value = body.v[2].toFixed(2);
    selectedBodyIndex = index;
}

// Editor: applica modifiche
function applyBodyParameters() {
    if (!state || selectedBodyIndex >= state.length) return;
    
    const m = parseFloat(massSlider.value);
    const r = [
        parseFloat(posX.value || 0),
        parseFloat(posY.value || 0),
        parseFloat(posZ.value || 0)
    ];
    const v = [
        parseFloat(velX.value || 0),
        parseFloat(velY.value || 0),
        parseFloat(velZ.value || 0)
    ];
    
    // Aggiorna lo stato
    const newState = [...state];
    newState[selectedBodyIndex] = new Body(m, r, v);
    state = newState;
    
    // ✅ Aggiorna la mesh 3D: crea NUOVA geometria con nuovo raggio
    const newRadius = getBodyRadius(m);
    
    // Rimuovi la vecchia geometria
    bodies[selectedBodyIndex].geometry.dispose();
    
    // Crea nuova geometria
    const newGeometry = new THREE.SphereGeometry(newRadius, 16, 16);
    bodies[selectedBodyIndex].geometry = newGeometry;
    
    // ✅ Forza l'aggiornamento (opzionale ma sicuro)
    bodies[selectedBodyIndex].scale.set(1, 1, 1);
    
    // Aggiorna energia se in pausa
    if (!isRunning) {
        E0 = window.totalEnergy(state);
        updateUI();
    }
    
    createGravitationalField();
}

// Editor: randomizza
function randomizeBodyParameters() {
    const angle = Math.random() * Math.PI * 2;
    const radius = 0.5 + Math.random() * 3.0;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    const z = (Math.random() - 0.5) * 0.5;
    const speed = (0.5 + Math.random()) / Math.sqrt(radius);
    const vx = -Math.sin(angle) * speed;
    const vy = Math.cos(angle) * speed;
    const vz = (Math.random() - 0.5) * 0.2;
    
    massSlider.value = 0.5 + Math.random() * 2.0;
    posX.value = x.toFixed(2);
    posY.value = y.toFixed(2);
    posZ.value = z.toFixed(2);
    velX.value = vx.toFixed(2);
    velY.value = vy.toFixed(2);
    velZ.value = vz.toFixed(2);
    massValue.textContent = massSlider.value;
}

// Event listeners
playBtn.addEventListener('click', () => {
    isRunning = true;
    statusText.textContent = 'Running';
    playBtn.disabled = true;
    pauseBtn.disabled = false;
    if (!animationId) animate();
});

pauseBtn.addEventListener('click', () => {
    isRunning = false;
    statusText.textContent = 'Paused';
    playBtn.disabled = false;
    pauseBtn.disabled = true;
});

resetBtn.addEventListener('click', () => {
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    playBtn.disabled = false;
    pauseBtn.disabled = true;
    statusText.textContent = 'Reset';
    initSimulation();
    updateVisualization();
});

recordBtn.addEventListener('click', () => {
    if (isRecording) {
        stopRecording();
    } else {
        if (!isRunning) {
            alert("Please start the simulation first.");
            return;
        }
        startRecording();
    }
});

configSelect.addEventListener('change', (e) => {
    if (isRunning) {
        alert("Pause the simulation before changing configuration.");
        return;
    }
    const newConfig = (currentN === 3) ? e.target.value : 'chaotic';
    initSimulation(newConfig, currentN);
    updateVisualization();
});

if (showFieldCheckbox) {
    showFieldCheckbox.addEventListener('change', () => {
        createGravitationalField();
    });
}

dtSlider.addEventListener('input', () => {
    dt = parseFloat(dtSlider.value);
    dtValue.textContent = dt.toFixed(4);
});

// Slider N corpi
if (nBodiesSlider) {
    nBodiesSlider.addEventListener('input', () => {
        const N = parseInt(nBodiesSlider.value);
        nBodiesValue.textContent = N;
        if (!isRunning) {
            const newConfig = (N === 3) ? currentConfig : 'chaotic';
            initSimulation(newConfig, N);
            updateVisualization();
            if (configSelect) configSelect.disabled = (N !== 3);
        }
    });
}

// Editor eventi
if (bodySelect) {
    bodySelect.addEventListener('change', (e) => {
        loadBodyParameters(parseInt(e.target.value));
    });
}

if (massSlider) {
    massSlider.addEventListener('input', () => {
        massValue.textContent = massSlider.value;
    });
}

if (applyBtn) {
    applyBtn.addEventListener('click', () => {
        applyBodyParameters();
        updateVisualization();
    });
}

if (randomizeBtn) {
    randomizeBtn.addEventListener('click', () => {
        randomizeBodyParameters();
    });
}

// Inizializza
initThreeJS();
initSimulation();
updateVisualization();
dtValue.textContent = dt.toFixed(4);
if (nBodiesValue) nBodiesValue.textContent = currentN.toString();
statusText.textContent = 'Paused';

// Loop
function animate() {
    step();
    controls.update();
    renderer.render(scene, camera);
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

}); // fine DOMContentLoaded
