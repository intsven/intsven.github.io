import * as THREE from 'three';
import { FlowerGenerator } from './FlowerGenerator';
import type { FlowerParams } from './FlowerGenerator';

export class HistoryManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private gridItems: { element: HTMLElement, params: FlowerParams, flower: THREE.Group }[] = [];
    private sharedRotationY = 0;
    private sharedRotationX = 0;
    private onSelectCallback: (params: FlowerParams) => void;

    constructor(renderer: THREE.WebGLRenderer, onSelect: (params: FlowerParams) => void) {
        this.renderer = renderer;
        this.onSelectCallback = onSelect;
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

    public updateGrid(history: FlowerParams[], container: HTMLElement) {
        container.innerHTML = '';
        this.gridItems = [];
        this.scene.children = this.scene.children.filter(c => !(c instanceof THREE.Group));

        history.forEach((params) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'history-item';
            
            // Controls wrapper (at the top)
            const controlsEl = document.createElement('div');
            controlsEl.className = 'item-controls';

            const selectBtn = document.createElement('button');
            selectBtn.className = 'btn-select';
            selectBtn.textContent = 'Ansehen';
            selectBtn.onclick = (e) => { e.stopPropagation(); this.onSelectCallback(params); };
            controlsEl.appendChild(selectBtn);
            itemEl.appendChild(controlsEl);

            // Preview area (at the bottom)
            const previewEl = document.createElement('div');
            previewEl.className = 'item-preview';
            itemEl.appendChild(previewEl);
            
            container.appendChild(itemEl);

            const flower = FlowerGenerator.createFlower(params);
            this.gridItems.push({ element: previewEl, params, flower });
        });
    }

    public update(rotationX: number, rotationY: number) {
        this.sharedRotationX = rotationX;
        this.sharedRotationY = rotationY;
    }

    public render() {
        this.renderer.setScissorTest(true);
        this.gridItems.forEach(item => {
            const rect = item.element.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;
            const width = rect.right - rect.left, height = rect.bottom - rect.top;
            const left = rect.left, bottom = window.innerHeight - rect.bottom;
            this.renderer.setViewport(left, bottom, width, height);
            this.renderer.setScissor(left, bottom, width, height);
            const existingFlower = this.scene.children.find(c => c instanceof THREE.Group);
            if (existingFlower) this.scene.remove(existingFlower);
            item.flower.rotation.x = this.sharedRotationX;
            item.flower.rotation.y = this.sharedRotationY;
            this.scene.add(item.flower);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.render(this.scene, this.camera);
        });
    }
}
