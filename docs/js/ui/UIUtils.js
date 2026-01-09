window.UIUtils = {

    getBodyRadius(mass) {
        // Ridotto del ~50% rispetto al valore precedente
        const radius = 0.03 + 0.06 * Math.pow(mass, 1/3);
        return Math.max(0.03, radius); // minimo visibile ma piccolo
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
