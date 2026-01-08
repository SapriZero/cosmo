// simulation-controller.js — Logica di controllo UI + simulazione
// Dipende da: window.ui, window.state, window.bodies, window.scene, ecc.

window.SimulationController = (function() {
    // Alias per leggibilità
    const ui = window.ui;
    const getState = () => window.state;
    const setState = (s) => { window.state = s; };
    const getBodies = () => window.bodies;
    const getScene = () => window.scene;
    const getTrajectories = () => window.trajectories;
    const getTrailMaterials = () => window.trailMaterials;
    const getFieldLines = () => window.fieldLines;
    const setFieldLines = (fl) => { window.fieldLines = fl; };

    // === Funzioni di utilità ===
    function getBodyRadius(mass) {
        const radius = 0.03 + 0.08 * Math.pow(mass, 1/3);
        return Math.max(0.03, radius);
    }

    function generateColors(n) {
        const colors = [];
        for (let i = 0; i < n; i++) {
            const hue = (i * 137.507) % 360;
            const color = new THREE.Color(`hsl(${hue}, 80%, 65%)`);
            colors.push(color);
        }
        return colors;
    }

    // === Editor corpo ===
    let selectedBodyIndex = 0;

    function loadBodyParameters(index) {
        const state = getState();
        if (!state || index >= state.length) return;
        const body = state[index];
        ui.massSlider.value = body.m;
        ui.massValue.textContent = body.m.toFixed(1);
        ui.posX.value = body.r[0].toFixed(2);
        ui.posY.value = body.r[1].toFixed(2);
        ui.posZ.value = body.r[2].toFixed(2);
        ui.velX.value = body.v[0].toFixed(2);
        ui.velY.value = body.v[1].toFixed(2);
        ui.velZ.value = body.v[2].toFixed(2);
        selectedBodyIndex = index;
    }

    function applyBodyParameters() {
        const state = getState();
        if (!state || selectedBodyIndex >= state.length) return;
        
        const m = parseFloat(ui.massSlider.value);
        const r = [
            parseFloat(ui.posX.value || 0),
            parseFloat(ui.posY.value || 0),
            parseFloat(ui.posZ.value || 0)
        ];
        const v = [
            parseFloat(ui.velX.value || 0),
            parseFloat(ui.velY.value || 0),
            parseFloat(ui.velZ.value || 0)
        ];
        
        const newState = [...state];
        newState[selectedBodyIndex] = new Body(m, r, v);
        setState(newState);
        
        // Aggiorna mesh
        const bodies = getBodies();
        const newRadius = getBodyRadius(m);
        bodies[selectedBodyIndex].geometry.dispose();
        bodies[selectedBodyIndex].geometry = new THREE.SphereGeometry(newRadius, 16, 16);
        
        if (!window.isRunning) {
            window.E0 = window.totalEnergy(newState);
            updateUI();
        }
        
        createGravitationalField();
    }

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
        
        ui.massSlider.value = 0.5 + Math.random() * 2.0;
        ui.posX.value = x.toFixed(2);
        ui.posY.value = y.toFixed(2);
        ui.posZ.value = z.toFixed(2);
        ui.velX.value = vx.toFixed(2);
        ui.velY.value = vy.toFixed(2);
        ui.velZ.value = vz.toFixed(2);
        ui.massValue.textContent = ui.massSlider.value;
    }

    // === Aggiornamenti UI ===
    function updateUI() {
        ui.E0Value.textContent = window.E0.toFixed(6);
        ui.timeValue.textContent = "0.000";
        ui.E1Value.textContent = window.E0.toFixed(6);
        ui.relErrorValue.textContent = "0.00e+0";
        ui.relErrorValue.className = 'energy-good';
    }

    function updateEnergyUI() {
        const state = getState();
        const E1 = window.totalEnergy(state);
        const relError = Math.abs(E1 - window.E0) / (Math.abs(window.E0) + 1e-15);
        ui.E1Value.textContent = E1.toFixed(6);
        ui.relErrorValue.textContent = relError.toExponential(2);
        if (relError < 1e-4) ui.relErrorValue.className = 'energy-good';
        else if (relError < 1e-2) ui.relErrorValue.className = 'energy-warning';
        else ui.relErrorValue.className = 'energy-bad';
        ui.timeValue.textContent = window.simulatedTime.toFixed(3);
    }

    // === Campo gravitazionale ===
    function createGravitationalField() {
        const fieldLines = getFieldLines();
        const scene = getScene();
        fieldLines.forEach(line => scene.remove(line));
        setFieldLines([]);

        if (!ui.showField || !ui.showField.checked || getState().length > 5) return;

        const size = 2.0;
        const step = (2 * size) / (5 - 1);
        const half = size;

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 5; j++) {
                for (let k = 0; k < 5; k++) {
                    const x = -half + i * step;
                    const y = -half + j * step;
                    const z = -half + k * step;

                    let ax = 0, ay = 0, az = 0;
                    const G = 1.0, eps = 1e-3;
                    for (const body of getState()) {
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

                    const scale = Math.min(accMag, 1.0) * 0.2;
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
                    setFieldLines([...getFieldLines(), arrow]);
                }
            }
        }
    }

    // === Registrazione video ===
    function startRecording() {
        if (window.isRecording) return;
        window.recordedChunks = [];
        const stream = window.renderer.domElement.captureStream(30);
        window.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        window.mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) window.recordedChunks.push(event.data);
        };
        window.mediaRecorder.onstop = () => {
            const blob = new Blob(window.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `n-body-${window.currentN}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            window.isRecording = false;
            ui.recordBtn.textContent = '⏺️ Record Video';
        };
        window.mediaRecorder.start();
        window.isRecording = true;
        ui.recordBtn.textContent = '⏹️ Stop Recording';
    }

    function stopRecording() {
        if (window.mediaRecorder && window.isRecording) {
            window.mediaRecorder.stop();
        }
    }

    // === Inizializzazione simulazione ===
    function setupSceneForN(n) {
        const bodies = getBodies();
        const scene = getScene();

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
        const newBodies = [];
        const newTrajectories = Array(n).fill().map(() => []);
        const newTrailMaterials = [];

        // Crea nuovi corpi
        const colors = generateColors(n);
        const state = getState();
        for (let i = 0; i < n; i++) {
            const mass = state[i].m;
            const radius = getBodyRadius(mass);
            const geometry = new THREE.SphereGeometry(radius, 16, 16);
            const material = new THREE.MeshPhongMaterial({ color: colors[i] });
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            newBodies.push(mesh);
            newTrailMaterials.push(new THREE.LineBasicMaterial({ color: colors[i] }));
        }

        // Aggiorna globali
        window.bodies = newBodies;
        window.trajectories = newTrajectories;
        window.trailMaterials = newTrailMaterials;

        // Aggiorna menu corpo
        if (ui.bodySelect) {
            ui.bodySelect.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Body ${i + 1}`;
                ui.bodySelect.appendChild(option);
            }
            selectedBodyIndex = 0;
            if (n > 0) loadBodyParameters(0);
        }
    }

    function initSimulation(configKey, N) {
        window.currentConfig = configKey;
        window.currentN = N;

        let newState;
        if (N === 3 && configKey === 'lagrange') {
            newState = window.InitialConfigurations.lagrange.fn();
        } else if (N === 3 && configKey === 'figure8') {
            newState = window.InitialConfigurations.figure8.fn();
        } else {
            // Stato casuale stabile
            newState = [];
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
                newState.push(new Body(1.0, [x, y, z], [vx, vy, vz]));
            }
        }

        window.state = newState;
        setupSceneForN(N);
        window.E0 = window.totalEnergy(newState);
        window.simulatedTime = 0;
        window.trajectories.forEach(t => t.length = 0);
        updateUI();
        createGravitationalField();
    }

    // === Gestori eventi ===
    function setupEventListeners() {
        ui.playBtn.addEventListener('click', () => {
            window.isRunning = true;
            ui.statusText.textContent = 'Running';
            ui.playBtn.disabled = true;
            ui.pauseBtn.disabled = false;
            if (!window.animationId) window.animate();
        });

        ui.pauseBtn.addEventListener('click', () => {
            window.isRunning = false;
            ui.statusText.textContent = 'Paused';
            ui.playBtn.disabled = false;
            ui.pauseBtn.disabled = true;
        });

        ui.resetBtn.addEventListener('click', () => {
            window.isRunning = false;
            if (window.animationId) {
                cancelAnimationFrame(window.animationId);
                window.animationId = null;
            }
            ui.playBtn.disabled = false;
            ui.pauseBtn.disabled = true;
            ui.statusText.textContent = 'Reset';
            initSimulation(window.currentConfig, window.currentN);
            window.updateVisualization(); // deve essere esposto in window
        });

        ui.recordBtn.addEventListener('click', () => {
            if (window.isRecording) {
                stopRecording();
            } else {
                if (!window.isRunning) {
                    alert("Please start the simulation first.");
                    return;
                }
                startRecording();
            }
        });

        ui.configSelect.addEventListener('change', (e) => {
            if (window.isRunning) {
                alert("Pause the simulation before changing configuration.");
                return;
            }
            const newConfig = (window.currentN === 3) ? e.target.value : 'chaotic';
            initSimulation(newConfig, window.currentN);
            window.updateVisualization();
        });

        if (ui.showField) {
            ui.showField.addEventListener('change', () => {
                createGravitationalField();
            });
        }

        ui.dtSlider.addEventListener('input', () => {
            window.dt = parseFloat(ui.dtSlider.value);
            ui.dtValue.textContent = window.dt.toFixed(4);
        });

        if (ui.nBodiesSlider) {
            ui.nBodiesSlider.addEventListener('input', () => {
                const N = parseInt(ui.nBodiesSlider.value);
                ui.nBodiesValue.textContent = N;
                if (!window.isRunning) {
                    const newConfig = (N === 3) ? window.currentConfig : 'chaotic';
                    initSimulation(newConfig, N);
                    window.updateVisualization();
                    if (ui.configSelect) ui.configSelect.disabled = (N !== 3);
                }
            });
        }

        if (ui.bodySelect) {
            ui.bodySelect.addEventListener('change', (e) => {
                loadBodyParameters(parseInt(e.target.value));
            });
        }

        if (ui.massSlider) {
            ui.massSlider.addEventListener('input', () => {
                ui.massValue.textContent = ui.massSlider.value;
            });
        }

        if (ui.applyBtn) {
            ui.applyBtn.addEventListener('click', () => {
                applyBodyParameters();
                window.updateVisualization();
            });
        }

        if (ui.randomizeBtn) {
            ui.randomizeBtn.addEventListener('click', () => {
                randomizeBodyParameters();
            });
        }
    }

    // API pubblica
    return {
        initSimulation,
        setupEventListeners,
        updateEnergyUI,
        createGravitationalField
    };
})();
