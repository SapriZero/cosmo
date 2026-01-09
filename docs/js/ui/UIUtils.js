window.UIUtils = {
    getBodyRadius(mass) {
        // Raggio proporzionale alla radice cubica della massa (volume ∝ massa)
        // Scala per visibilità: minimo 0.05, tipico ~0.08–0.2
        const radius = 0.05 + 0.12 * Math.pow(mass, 1/3);
        return Math.max(0.05, radius); // mai troppo piccolo
    },

    generateColors(n) {
        const colors = [];
        for (let i = 0; i < n; i++) {
            const hue = (i * 137.507) % 360;
            const color = new THREE.Color(`hsl(${hue}, 80%, 65%)`);
            colors.push(color);
        }
        return colors;
    }
};
