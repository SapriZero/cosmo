// ui/BodyEditor.js

window.BodyEditor = class {
    constructor(engine, ui, threejsRenderer) {
        this.engine = engine;
        this.ui = ui;
        this.renderer = threejsRenderer; // ✅ Necessario per accedere alle mesh
        this.selectedBodyIndex = 0;
    }

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

        // Aggiorna lo stato fisico
        this.engine.updateBody(this.selectedBodyIndex, m, r, v);

        // ✅ AGGIORNA LA MESH THREE.JS CON NUOVO RAGGIO
        const newRadius = window.UIUtils.getBodyRadius(m);
        const mesh = this.renderer.bodies[this.selectedBodyIndex];
        if (mesh) {
            mesh.geometry.dispose();
            mesh.geometry = new THREE.SphereGeometry(newRadius, 16, 16);
        }
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

    setupEventListeners() {
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
            });
        }

        if (this.ui.randomizeBtn) {
            this.ui.randomizeBtn.addEventListener('click', () => {
                this.randomizeBodyParameters();
            });
        }
    }
};
