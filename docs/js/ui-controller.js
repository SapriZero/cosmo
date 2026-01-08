// ui-controller.js — Controller UI con dipendenze iniettate

class UIController {
    constructor(engine, ui, threejsRenderer) {
        this.engine = engine;
        this.ui = ui;
        this.renderer = threejsRenderer; // { scene, bodies, trailMaterials }
        this.selectedBodyIndex = 0;
        this.isRecording = false;
        this.mediaRecorder = null;
        this.recordedChunks = [];
        this.animationId = null;
    }

    // === Utilità ===
    getBodyRadius(mass) {
        const radius = 0.03 + 0.08 * Math.pow(mass, 1/3);
        return Math.max(0.03, radius);
    }

    generateColors(n) {
        const colors = [];
        for (let i = 0; i < n; i++) {
            const hue = (i * 137.507) % 360;
            const color = new THREE.Color(`hsl(${hue}, 80%, 65%)`);
            colors.push(color);
        }
        return colors;
    }

    // === Inizializzazione scena Three.js per N corpi ===
    setupSceneForN(n) {
        const { scene, bodies, trailMaterials } = this.renderer;

        // Pulisci vecchi oggetti
        bodies.forEach(mesh => {
            mesh.geometry.dispose();
            scene.remove(mesh);
        });
        for (let i = 0; i < 100; i++) {
            const trail = scene.getObjectByName(`trail-${i}`);
            if (trail) scene.remove(trail);
        }

        // Reset array
        const newBodies = [];
        const newTrailMaterials = [];

        // Crea nuovi corpi
        const colors = this.generateColors(n);
        const state = this.engine.getState();
        for (let i = 0; i < n; i++) {
            const mass = state[i].m;
            const radius = this.getBodyRadius(mass);
            const geometry = new THREE.SphereGeometry(radius, 16, 16);
            const material = new THREE.MeshPhongMaterial({ color: colors[i] });
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            newBodies.push(mesh);
            newTrailMaterials.push(new THREE.LineBasicMaterial({ color: colors[i] }));
        }

        // Aggiorna renderer
        this.renderer.bodies = newBodies;
        this.renderer.trailMaterials = newTrailMaterials;

        // Aggiorna menu corpo
        if (this.ui.bodySelect) {
            this.ui.bodySelect.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Body ${i + 1}`;
                this.ui.bodySelect.appendChild(option);
            }
            this.selectedBodyIndex = 0;
            if (n > 0) this.loadBodyParameters(0);
        }
    }

    // === Editor corpo ===
    loadBodyParameters(index) {
        const state = this.engine.getState();
        if (!state || index >= state.length) return;
        const body = state[index];
        this.ui.massSlider.value = body.m;
        this.ui.massValue.textContent = body.m.toFixed(1);
        this.ui.posX.value = body.r[0].toFixed(2);
        this.ui.posY.value = body.r[1].toFixed(2);
        this.ui.posZ.value = body.r[2].toFixed(2);
        this.ui.velX.value = body.v[0].toFixed(2);
        this.ui.velY.value = body.v[1].toFixed(2);
        this.ui.velZ.value = body.v[2].toFixed(2);
        this.selectedBodyIndex = index;
    }

    applyBodyParameters() {
        const m = parseFloat(this.ui.massSlider.value);
        const r = [
            parseFloat(this.ui.posX.value || 0),
            parseFloat(this.ui.posY.value || 0),
            parseFloat(this.ui.posZ.value || 0)
        ];
        const v = [
            parseFloat(this.ui.velX.value || 0),
            parseFloat(this.ui.velY.value || 0),
            parseFloat(this.ui.velZ.value || 0)
        ];

        this.engine.updateBody(this.selectedBodyIndex, m, r, v);

        // Aggiorna mesh
        const bodies = this.renderer.bodies;
        const newRadius = this.getBodyRadius(m);
        bodies[this.selectedBodyIndex].geometry.dispose();
        bodies[this.selectedBodyIndex].geometry = new THREE.SphereGeometry(newRadius, 16, 16);

        this.updateUI();
        this.createGravitationalField();
    }

    randomizeBodyParameters() {
        const angle = Math.random() * Math.PI * 2;
        const radius = 0.5 + Math.random() * 3.0;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        const z = (Math.random() - 0.5) * 0.5;
        const speed = (0.5 + Math.random()) / Math.sqrt(radius);
        const vx = -Math.sin(angle) * speed;
        const vy = Math.cos(angle) * speed;
        const vz = (Math.random() - 0.5) * 0.2;

        this.ui.massSlider.value = 0.5 + Math.random() * 2.0;
        this.ui.posX.value = x.toFixed(2);
        this.ui.posY.value = y.toFixed(2);
        this.ui.posZ.value = z.toFixed(2);
        this.ui.velX.value = vx.toFixed(2);
        this.ui.velY.value = vy.toFixed(2);
        this.ui.velZ.value = vz.toFixed(2);
        this.ui.massValue.textContent = this.ui.massSlider.value;
    }

    // === Campo gravitazionale ===
    createGravitationalField() {
        const { scene } = this.renderer;
        let fieldLines = [];
        const existingLines = scene.children.filter(child => child.name?.startsWith('field-'));
        existingLines.forEach(line => scene.remove(line));

        const state = this.engine.getState();
        if (!this.ui.showField || !this.ui.showField.checked || state.length > 5) return;

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
                    arrow.name = `field-${i}-${j}-${k}`;
                    scene.add(arrow);
                }
            }
        }
    }

    // === Registrazione video ===
    startRecording() {
        if (this.isRecording) return;
        this.recordedChunks = [];
        const stream = this.renderer.renderer.domElement.captureStream(30);
        this.mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp9' });
        this.mediaRecorder.ondataavailable = event => {
            if (event.data.size > 0) this.recordedChunks.push(event.data);
        };
        this.mediaRecorder.onstop = () => {
            const blob = new Blob(this.recordedChunks, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = `n-body-${this.engine.currentN}-${new Date().toISOString().slice(0,19).replace(/:/g,'-')}.webm`;
            document.body.appendChild(a);
            a.click();
            setTimeout(() => {
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }, 100);
            this.isRecording = false;
            this.ui.recordBtn.textContent = '⏺️ Record Video';
        };
        this.mediaRecorder.start();
        this.isRecording = true;
        this.ui.recordBtn.textContent = '⏹️ Stop Recording';
    }

    stopRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
        }
    }

    // === Aggiornamenti UI ===
    updateUI() {
        this.ui.E0Value.textContent = this.engine.E0.toFixed(6);
        this.ui.timeValue.textContent = "0.000";
        this.ui.E1Value.textContent = this.engine.E0.toFixed(6);
        this.ui.relErrorValue.textContent = "0.00e+0";
        this.ui.relErrorValue.className = 'energy-good';
    }

    updateEnergyUI() {
        const E1 = this.engine.getCurrentEnergy();
        const relError = this.engine.getEnergyError();
        this.ui.E1Value.textContent = E1.toFixed(6);
        this.ui.relErrorValue.textContent = relError.toExponential(2);
        if (relError < 1e-4) this.ui.relErrorValue.className = 'energy-good';
        else if (relError < 1e-2) this.ui.relErrorValue.className = 'energy-warning';
        else this.ui.relErrorValue.className = 'energy-bad';
        this.ui.timeValue.textContent = this.engine.simulatedTime.toFixed(3);
    }

    updateVisualization() {
        const state = this.engine.getState();
        const trajectories = this.engine.getTrajectories();
        const { scene, bodies, trailMaterials } = this.renderer;

        // Aggiorna posizioni
        for (let i = 0; i < state.length; i++) {
            bodies[i].position.set(state[i].r[0], state[i].r[1], state[i].r[2]);
        }

        // Aggiorna traiettorie
        for (let i = 0; i < state.length; i++) {
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

        if (Math.floor(this.engine.simulatedTime / this.engine.dt) % 10 === 0) {
            this.createGravitationalField();
        }
    }

    // === Animazione ===
    startAnimation() {
        const animate = () => {
            this.engine.step();
            this.updateVisualization();
            this.updateEnergyUI();
            if (this.engine.isRunning) {
                this.animationId = requestAnimationFrame(animate);
            }
        };
        animate();
    }

    // === Configurazione ===
    setupConfiguration() {
        this.ui.configSelect.addEventListener('change', (e) => {
            if (this.engine.isRunning) {
                alert("Pause the simulation before changing configuration.");
                return;
            }
            const newConfig = (this.engine.currentN === 3) ? e.target.value : 'chaotic';
            this.engine.initSimulation(newConfig, this.engine.currentN);
            this.setupSceneForN(this.engine.currentN);
            this.updateVisualization();
            this.updateUI();
        });

        if (this.ui.nBodiesSlider) {
            this.ui.nBodiesSlider.addEventListener('input', () => {
                const N = parseInt(this.ui.nBodiesSlider.value);
                this.ui.nBodiesValue.textContent = N;
                if (!this.engine.isRunning) {
                    const newConfig = (N === 3) ? this.engine.currentConfig : 'chaotic';
                    this.engine.initSimulation(newConfig, N);
                    this.setupSceneForN(N);
                    this.updateVisualization();
                    this.updateUI();
                    if (this.ui.configSelect) this.ui.configSelect.disabled = (N !== 3);
                }
            });
        }
    }

    // === Editor corpo ===
    setupBodyEditor() {
        if (this.ui.bodySelect) {
            this.ui.bodySelect.addEventListener('change', (e) => {
                this.loadBodyParameters(parseInt(e.target.value));
            });
        }

        if (this.ui.massSlider) {
            this.ui.massSlider.addEventListener('input', () => {
                this.ui.massValue.textContent = this.ui.massSlider.value;
            });
        }

        if (this.ui.applyBtn) {
            this.ui.applyBtn.addEventListener('click', () => {
                this.applyBodyParameters();
                this.updateVisualization();
            });
        }

        if (this.ui.randomizeBtn) {
            this.ui.randomizeBtn.addEventListener('click', () => {
                this.randomizeBodyParameters();
            });
        }
    }

    // === Eventi principali ===
    setupMainControls() {
        this.ui.playBtn.addEventListener('click', () => {
            this.engine.isRunning = true;
            this.ui.statusText.textContent = 'Running';
            this.ui.playBtn.disabled = true;
            this.ui.pauseBtn.disabled = false;
            if (!this.animationId) this.startAnimation();
        });

        this.ui.pauseBtn.addEventListener('click', () => {
            this.engine.isRunning = false;
            this.ui.statusText.textContent = 'Paused';
            this.ui.playBtn.disabled = false;
            this.ui.pauseBtn.disabled = true;
        });

        this.ui.resetBtn.addEventListener('click', () => {
            this.engine.isRunning = false;
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            this.ui.playBtn.disabled = false;
            this.ui.pauseBtn.disabled = true;
            this.ui.statusText.textContent = 'Reset';
            this.engine.initSimulation(this.engine.currentConfig, this.engine.currentN);
            this.setupSceneForN(this.engine.currentN);
            this.updateVisualization();
            this.updateUI();
        });

        this.ui.recordBtn.addEventListener('click', () => {
            if (this.isRecording) {
                this.stopRecording();
            } else {
                if (!this.engine.isRunning) {
                    alert("Please start the simulation first.");
                    return;
                }
                this.startRecording();
            }
        });

        if (this.ui.showField) {
            this.ui.showField.addEventListener('change', () => {
                this.createGravitationalField();
            });
        }

        this.ui.dtSlider.addEventListener('input', () => {
            this.engine.dt = parseFloat(this.ui.dtSlider.value);
            this.ui.dtValue.textContent = this.engine.dt.toFixed(4);
        });
    }

    // === Avvio ===
    setupEventListeners() {
        this.setupMainControls();
        this.setupConfiguration();
        this.setupBodyEditor();
    }
}
