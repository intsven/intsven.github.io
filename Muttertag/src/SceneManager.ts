import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FlowerGenerator } from './FlowerGenerator';
import type { FlowerParams } from './FlowerGenerator';

export class SceneManager {
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private renderer: THREE.WebGLRenderer;
    private controls: OrbitControls;
    private flowerGroup: THREE.Group | null = null;
    private placeholder: HTMLElement;

    constructor(canvasContainer: HTMLElement, mainPlaceholder: HTMLElement) {
        this.placeholder = mainPlaceholder;
        this.scene = new THREE.Scene();
        // Background should be handled by CSS or set to null/transparent if we want to see CSS background
        this.scene.background = null; 

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        canvasContainer.appendChild(this.renderer.domElement);

        this.camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
        this.camera.position.set(2, 2, 5);

        // Controls attached to the placeholder so we can interact with it
        this.controls = new OrbitControls(this.camera, mainPlaceholder);
        this.controls.enableDamping = true;

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        console.log('SceneManager initialized. Canvas added to:', canvasContainer);

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    public updateFlower(params: FlowerParams) {
        if (this.flowerGroup) {
            this.scene.remove(this.flowerGroup);
            this.flowerGroup.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        this.flowerGroup = FlowerGenerator.createFlower(params);
        this.scene.add(this.flowerGroup);
    }

    public setRotation(x: number, y: number) {
        if (this.flowerGroup) {
            this.flowerGroup.rotation.x = x;
            this.flowerGroup.rotation.y = y;
        }
    }

    public render() {
        this.controls.update();

        const rect = this.placeholder.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight ||
            rect.right < 0 || rect.left > window.innerWidth) {
            return;
        }

        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;
        const left = rect.left;
        const bottom = window.innerHeight - rect.bottom;

        this.renderer.setViewport(left, bottom, width, height);
        this.renderer.setScissor(left, bottom, width, height);
        this.renderer.setScissorTest(true);

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.render(this.scene, this.camera);
    }

    public getRenderer(): THREE.WebGLRenderer {
        return this.renderer;
    }
}
