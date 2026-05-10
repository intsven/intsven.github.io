import * as THREE from 'three';
import { FlowerGenerator } from './FlowerGenerator';
import type { FlowerParams } from './FlowerGenerator';

export class SweepGridManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private gridItems: { element: HTMLElement, params: FlowerParams, flower: THREE.Group }[] = [];
    private sharedRotationY = 0;
    private sharedRotationX = 0;

    constructor(renderer: THREE.WebGLRenderer) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();
        this.scene.background = null;

        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.camera.position.set(0, 3, 6);
        this.camera.lookAt(0, 0, 0);

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 5, 2);
        this.scene.add(directionalLight);
    }

    public updateGrid(baseParams: FlowerParams, sweepX: keyof FlowerParams, sweepY: keyof FlowerParams, container: HTMLElement) {
        container.innerHTML = '';
        this.gridItems = [];
        this.scene.children = this.scene.children.filter(c => !(c instanceof THREE.Group));

        const rangeX = this.getSweepRange(sweepX);
        const rangeY = this.getSweepRange(sweepY);
        
        // Use a 3x3 grid (9 items total) for the 2D sweep
        const gridSize = 3;
        container.style.gridTemplateColumns = `repeat(${gridSize}, 1fr)`;

        for (let y = 0; y < gridSize; y++) {
            for (let x = 0; x < gridSize; x++) {
                const tx = x / (gridSize - 1);
                const ty = y / (gridSize - 1);
                
                const valX = rangeX.min + (rangeX.max - rangeX.min) * tx;
                const valY = rangeY.min + (rangeY.max - rangeY.min) * ty;
                
                const params = { ...baseParams, [sweepX]: valX, [sweepY]: valY };
                const itemEl = document.createElement('div');
                itemEl.className = 'grid-item';
                
                const label = document.createElement('div');
                label.className = 'grid-label';
                label.innerHTML = `X: ${valX.toFixed(2)}<br>Y: ${valY.toFixed(2)}`;
                itemEl.appendChild(label);
                
                container.appendChild(itemEl);

                const flower = FlowerGenerator.createFlower(params);
                this.gridItems.push({ element: itemEl, params, flower });
            }
        }
    }

    private getSweepRange(param: keyof FlowerParams) {
        // Broad default ranges for all numeric params
        const defaults: Record<string, { min: number, max: number }> = {
            petalCount: { min: 3, max: 30 },
            petalLength: { min: 0.5, max: 4 },
            petalWidth: { min: 0.1, max: 1.5 },
            petalCurvature: { min: -1, max: 3 },
            spiralTwist: { min: -2, max: 2 },
            petalSteps: { min: 1, max: 10 },
            stepRotation: { min: 0, max: Math.PI },
            innerScale: { min: 0.2, max: 1 },
            petalJitter: { min: 0, max: 1 },
            colorGradient: { min: 0, max: 2 },
            petalThinning: { min: 0.5, max: 3 },
            stemLength: { min: 0, max: 5 },
            opacity: { min: 0.1, max: 1 }
        };
        return defaults[param as string] || { min: 0, max: 1 };
    }

    public update(rotationX: number, rotationY: number) {
        this.sharedRotationX = rotationX;
        this.sharedRotationY = rotationY;
    }

    public render() {
        this.renderer.setScissorTest(true);

        this.gridItems.forEach(item => {
            const rect = item.element.getBoundingClientRect();

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

            const existingFlower = this.scene.children.find(c => c instanceof THREE.Group);
            if (existingFlower) this.scene.remove(existingFlower);
            
            // Sync rotation
            item.flower.rotation.x = this.sharedRotationX;
            item.flower.rotation.y = this.sharedRotationY;
            this.scene.add(item.flower);

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();

            this.renderer.render(this.scene, this.camera);
        });
    }
}
