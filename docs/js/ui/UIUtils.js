// ui/UIUtils.js
window.UIUtils = {

    getBodyRadius(mass) {
     //   const radius = 0.03;  // + 0.08 * Math.pow(mass, 1/3);
       // return Math.max(0.03, radius);
         return 0.2; // fisso e grande per test
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
