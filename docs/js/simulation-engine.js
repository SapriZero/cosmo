// simulation-engine.js — Stato della simulazione incapsulato

window.SimulationEngine = class {
    constructor() {
        this.state = null;
        this.E0 = 0;
        this.simulatedTime = 0;
        this.dt = 0.001;
        this.isRunning = false;
        this.currentConfig = 'lagrange';
        this.currentN = 3;
        this.trajectories = [];
        this.MAX_TRAIL = 500;
    }

    initSimulation(configKey, N) {
        this.currentConfig = configKey;
        this.currentN = N;

        // Genera lo stato iniziale
        if (N === 3 && configKey === 'lagrange') {
            this.state = window.InitialConfigurations.lagrange.fn();
        } else if (N === 3 && configKey === 'figure8') {
            this.state = window.InitialConfigurations.figure8.fn();
        } else {
            this.state = this.createRandomStableState(N);
        }

        // ✅ SPOSTATO QUI: ora this.state esiste
        console.log("Intialized state with", this.state.length, "bodies");

        // Inizializza traiettorie ed energia
        this.trajectories = Array(N).fill().map(() => []);
        this.E0 = window.totalEnergy(this.state);
        this.simulatedTime = 0;
    }

    createRandomStableState(N) {
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
            bodies.push(new window.Body(1.0, [x, y, z], [vx, vy, vz]));
        }
        return bodies;
    }

    step() {
        if (!this.isRunning) return;
        this.state = window.leapfrogStep(this.state, this.dt);
        this.simulatedTime += this.dt;

        for (let i = 0; i < this.state.length; i++) {
            this.trajectories[i].push([...this.state[i].r]);
            if (this.trajectories[i].length > this.MAX_TRAIL) {
                this.trajectories[i].shift();
            }
        }
    }

    updateBody(index, mass, position, velocity) {
        const newState = [...this.state];
        newState[index] = new window.Body(mass, position, velocity);
        this.state = newState;
        if (!this.isRunning) {
            this.E0 = window.totalEnergy(this.state);
        }
    }

    getState() { return this.state; }
    getTrajectories() { return this.trajectories; }
    getEnergyError() {
        const E1 = window.totalEnergy(this.state);
        return Math.abs(E1 - this.E0) / (Math.abs(this.E0) + 1e-15);
    }
    getCurrentEnergy() {
        return window.totalEnergy(this.state);
    }
};
