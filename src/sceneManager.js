import * as THREE from 'three';

export class SceneManager {
    constructor(scene, camera, renderer) {
        this.scene = scene;
        this.camera = camera;
        this.renderer = renderer;
        this.gridHelper = null;
        this.axesHelper = null;
    }

    setupScene() {
        // Сетка
        this.gridHelper = new THREE.GridHelper(50, 50, 0x888888, 0x444444);
        this.gridHelper.material.transparent = true;
        this.gridHelper.material.opacity = 0.5;
        this.scene.add(this.gridHelper);

        // Оси
        this.axesHelper = new THREE.AxesHelper(5);
        this.scene.add(this.axesHelper);

        // Освещение 
        this.setupLighting();
    }

    setupLighting() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 15);
        this.scene.add(directionalLight);
    }

    clearScene() {
        const objectsToRemove = [];
        this.scene.traverse((child) => {
            if (child instanceof THREE.Mesh && 
                child !== this.gridHelper && 
                child !== this.axesHelper) {
                objectsToRemove.push(child);
            }
        });
        
        objectsToRemove.forEach(child => this.scene.remove(child));
        return objectsToRemove.length;
    }
}
