// ui/UIController.js

window.UIController = class {
    constructor(engine, ui, threejsRenderer) {
        this.engine = engine;
        this.ui = ui;
        this.renderer = threejsRenderer;

        // Sottosistemi
        this.videoRecorder = new VideoRecorder(
            threejsRenderer.renderer.domElement,
            ui,
            () => engine.currentN
        );
        this.gravitationalField = new GravitationalField(
            threejsRenderer.scene,
            () => engine.getState(),
            ui
        );
        this.bodyEditor = new BodyEditor(engine, ui, threejsRenderer);

        this.animationId = null;
    }

    setupSceneForN(n) {
        const { scene, bodies, trailMaterials } = this.renderer;
        bodies.forEach(mesh => {
            mesh.geometry.dispose();
            scene.remove(mesh);
        });
        for (let i = 0; i < 100; i++) {
            const trail = scene.getObjectByName(`trail-${i}`);
            if (trail) scene.remove(trail);
        }

        const newBodies = [];
        const newTrailMaterials = [];
        const colors = UIUtils.generateColors(n);
        const state = this.engine.getState();
        for (let i = 0; i < n; i++) {
            const mass = state[i].m;
            const radius = UIUtils.getBodyRadius(mass);
            const geometry = new THREE.SphereGeometry(radius, 16, 16);
            const material = new THREE.MeshPhongMaterial({ color: colors[i] });
            const mesh = new THREE.Mesh(geometry, material);
            scene.add(mesh);
            newBodies.push(mesh);
            newTrailMaterials.push(new THREE.LineBasicMaterial({ color: colors[i] }));
        }

        this.renderer.bodies = newBodies;
        this.renderer.trailMaterials = newTrailMaterials;

        if (this.ui.bodySelect) {
            this.ui.bodySelect.innerHTML = '';
            for (let i = 0; i < n; i++) {
                const option = document.createElement('option');
                option.value = i;
                option.textContent = `Body ${i + 1}`;
                this.ui.bodySelect.appendChild(option);
            }
            this.bodyEditor.loadBodyParameters(0);
        }
    }

    updateVisualization() {
        const state = this.engine.getState();
        const trajectories = this.engine.getTrajectories();
        const { scene, bodies, trailMaterials } = this.renderer;

        for (let i = 0; i < state.length; i++) {
            bodies[i].position.set(state[i].r[0], state[i].r[1], state[i].r[2]);
        }

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
            this.gravitationalField.createField();
        }
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

    updateUI() {
        this.ui.E0Value.textContent = this.engine.E0.toFixed(6);
        this.ui.timeValue.textContent = "0.000";
        this.ui.E1Value.textContent = this.engine.E0.toFixed(6);
        this.ui.relErrorValue.textContent = "0.00e+0";
        this.ui.relErrorValue.className = 'energy-good';
    }

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

    setupEventListeners() {
        // Controlli principali
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
            if (this.videoRecorder.isCurrentlyRecording()) {
                this.videoRecorder.stopRecording();
            } else {
                if (!this.engine.isRunning) {
                    alert("Please start the simulation first.");
                    return;
                }
                this.videoRecorder.startRecording();
            }
        });

        if (this.ui.showField) {
            this.ui.showField.addEventListener('change', () => {
                this.gravitationalField.createField();
            });
        }

        this.ui.dtSlider.addEventListener('input', () => {
            this.engine.dt = parseFloat(this.ui.dtSlider.value);
            this.ui.dtValue.textContent = this.engine.dt.toFixed(4);
        });

        // Configurazione N corpi
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

        // Configurazione tipo
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

        // Editor corpo
        this.bodyEditor.setupEventListeners();
    }
}
