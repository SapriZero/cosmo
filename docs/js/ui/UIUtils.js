window.UIUtils = {

    getBodyRadius(mass) {
        // Ridotto del ~50% rispetto al valore precedente
        const radius = 0.025 + 0.05 * Math.pow(mass, 1/3); // più piccolo
        return Math.max(0.025, radius);
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
