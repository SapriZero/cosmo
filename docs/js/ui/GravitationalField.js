// ui/GravitationalField.js

window.GravitationalField = class {
    constructor(scene, getState, ui) {
        this.scene = scene;
        this.getState = getState;
        this.ui = ui;
    }

    createField() {
        // Rimuovi campi esistenti
        const existingLines = this.scene.children.filter(child => child.name?.startsWith('field-'));
        existingLines.forEach(line => this.scene.remove(line));

        const state = this.getState();
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
                    this.scene.add(arrow);
                }
            }
        }
    }
}
