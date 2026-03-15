/**
 * @fileoverview Visualizzatore Three.js per 
 * Dipende da: store/definitions.js per i binding
 */

import { Calculator } from '../lib/elissi/calculator.js';
import { Curves } from '../lib//elissi/curves.js';
import { Store } from '../store/store.js';
import { Binder } from '../ui/binder.js';
import { Option, Result, match } from '../lib/core/index.js';

export class Visualizer {
    constructor(containerId, colorScheme = 'ideal', store = null) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container ${containerId} non trovato`);
        }

        this.colorScheme = colorScheme;
        this.store = store;
        this.color = colorScheme === 'ideal' ? 0x63b3ed : 0x9f7aea;
        this.autoRotate = colorScheme === 'ideal';

        // Inizializza Three.js
        this._initThree();

        // Binding con store se fornito
        if (store) {
            this._bindStore();
        }

        // Avvia animazione
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this._onResize());
    }

    _initThree() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // Scene
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0a0c14);

        // Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.container.appendChild(this.renderer.domElement);

        // Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = this.autoRotate;
        this.controls.autoRotateSpeed = 1.0;

        // Luci
        const ambientLight = new THREE.AmbientLight(0x404060);
        this.scene.add(ambientLight);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(1, 2, 1);
        this.scene.add(dirLight);

        const backLight = new THREE.PointLight(0x4466aa, 0.5);
        backLight.position.set(-2, 1, -2);
        this.scene.add(backLight);

        // Griglia
        const gridHelper = new THREE.GridHelper(20, 20, 0x4a5568, 0x2d3748);
        this.scene.add(gridHelper);

        // Linea principale
        this.lineMaterial = new THREE.LineBasicMaterial({
            color: this.color,
            linewidth: 2
        });
        this.lineGeometry = new THREE.BufferGeometry();
        this.line = new THREE.Line(this.lineGeometry, this.lineMaterial);
        this.scene.add(this.line);

        // Punti di controllo
        this.pointsMaterial = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 0.15,
            sizeAttenuation: true
        });
        this.pointsGeometry = new THREE.BufferGeometry();
        this.points = new THREE.Points(this.pointsGeometry, this.pointsMaterial);
        this.scene.add(this.points);

        // Sfere per i punti principali (opzionale)
        this.spheres = [];
        this.sphereGroup = new THREE.Group();
        this.scene.add(this.sphereGroup);
    }

    _bindStore() {
        // Sottoscrivi ai cambiamenti dei punti
        this.unsubscribe = this.store.subscribe(
            UI.data.punti.path,
            (punti) => this.updateCurve(punti)
        );
    }

    updateCurve(punti, evidenziaPunti = 10) {
        if (!punti || punti.length === 0) return;

        // Aggiorna linea
        const positions = [];
        punti.forEach(p => {
            positions.push(p.x, p.y, p.z);
        });

        this.lineGeometry.setAttribute('position',
            new THREE.Float32BufferAttribute(positions, 3));
        this.lineGeometry.setDrawRange(0, punti.length);

        // Aggiorna punti di controllo
        const step = Math.max(1, Math.floor(punti.length / evidenziaPunti));
        const pointPositions = [];
        for (let i = 0; i < punti.length; i += step) {
            pointPositions.push(punti[i].x, punti[i].y, punti[i].z);
        }

        this.pointsGeometry.setAttribute('position',
            new THREE.Float32BufferAttribute(pointPositions, 3));

        // Aggiorna sfere (se attive)
        if (this.showSpheres) {
            this._updateSpheres(punti);
        }
    }

    _updateSpheres(punti, ogni = 10) {
        // Rimuovi sfere vecchie
        while(this.sphereGroup.children.length > 0) {
            this.sphereGroup.remove(this.sphereGroup.children[0]);
        }
        this.spheres = [];

        // Aggiungi nuove sfere
        for (let i = 0; i < punti.length; i += ogni) {
            const p = punti[i];
            const geometry = new THREE.SphereGeometry(0.1, 16, 16);
            const material = new THREE.MeshStandardMaterial({
                color: this.color,
                emissive: 0x333333
            });
            const sphere = new THREE.Mesh(geometry, material);
            sphere.position.set(p.x, p.y, p.z);
            this.sphereGroup.add(sphere);
            this.spheres.push(sphere);
        }
    }

    toggleSpheres(show) {
        this.showSpheres = show;
        this.sphereGroup.visible = show;
    }

    setColor(color) {
        this.color = color;
        this.lineMaterial.color.setHex(color);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    _onResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    destroy() {
        if (this.unsubscribe) {
            this.unsubscribe();
        }
        window.removeEventListener('resize', this._onResize);
        this.renderer.dispose();
    }
}
