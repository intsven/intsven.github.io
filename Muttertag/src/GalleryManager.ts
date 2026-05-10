import * as THREE from 'three';
import { FlowerGenerator } from './FlowerGenerator';
import type { FlowerParams } from './FlowerGenerator';
import { thumbnailGenerator } from './ThumbnailGenerator';

export class GalleryManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private gridItems: { 
        element: HTMLElement, 
        previewEl: HTMLElement, 
        imgEl: HTMLImageElement,
        params: FlowerParams, 
        flower: THREE.Group,
        isHovered: boolean,
        isDragged: boolean,
        offsetX: number,
        offsetY: number
    }[] = [];
    private sharedRotationY = 0;
    private sharedRotationX = 0;
    private onSelectCallback: (params: FlowerParams) => void;
    private onDeleteCallback: (idx: number) => void;

    constructor(renderer: THREE.WebGLRenderer, onSelect: (params: FlowerParams) => void, onDelete: (idx: number) => void) {
        this.renderer = renderer;
        this.onSelectCallback = onSelect;
        this.onDeleteCallback = onDelete;
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

    public updateGrid(favorites: FlowerParams[], container: HTMLElement) {
        container.innerHTML = '';
        this.gridItems = [];
        this.scene.children = this.scene.children.filter(c => !(c instanceof THREE.Group));

        favorites.forEach((params, idx) => {
            const itemEl = document.createElement('div');
            itemEl.className = 'fav-item';
            
            const previewEl = document.createElement('div');
            previewEl.className = 'item-preview';

            const flower = FlowerGenerator.createFlower(params);
            
            const imgEl = document.createElement('img');
            imgEl.className = 'static-preview';
            imgEl.src = thumbnailGenerator.generate(flower);
            previewEl.appendChild(imgEl);

            const itemObj = { 
                element: itemEl, 
                previewEl, 
                imgEl, 
                params, 
                flower,
                isHovered: false,
                isDragged: false,
                offsetX: 0,
                offsetY: 0
            };

            previewEl.onmouseenter = () => {
                itemObj.offsetX = flower.rotation.x - this.sharedRotationX;
                itemObj.offsetY = flower.rotation.y - this.sharedRotationY;
                itemObj.isHovered = true;
                imgEl.style.opacity = '0';
            };
            previewEl.onmouseleave = () => {
                itemObj.isHovered = false;
                if (!itemObj.isDragged) {
                    imgEl.src = thumbnailGenerator.generate(flower);
                    imgEl.style.opacity = '1';
                }
            };
            previewEl.addEventListener('mousedown', () => { 
                itemObj.offsetX = flower.rotation.x - this.sharedRotationX;
                itemObj.offsetY = flower.rotation.y - this.sharedRotationY;
                itemObj.isDragged = true; 
                imgEl.style.opacity = '0'; 
            });
            previewEl.addEventListener('touchstart', () => { 
                itemObj.offsetX = flower.rotation.x - this.sharedRotationX;
                itemObj.offsetY = flower.rotation.y - this.sharedRotationY;
                itemObj.isDragged = true; 
                imgEl.style.opacity = '0'; 
            });

            const controlsEl = document.createElement('div');
            controlsEl.className = 'item-controls';

            const selectBtn = document.createElement('button');
            selectBtn.className = 'btn-select';
            selectBtn.textContent = 'Wählen';
            selectBtn.onclick = (e) => { e.stopPropagation(); this.onSelectCallback(params); };
            controlsEl.appendChild(selectBtn);

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-fav';
            deleteBtn.innerHTML = '✕';
            deleteBtn.title = 'Entfernen';
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                this.onDeleteCallback(idx);
            };
            controlsEl.appendChild(deleteBtn);
            itemEl.appendChild(controlsEl);

            itemEl.appendChild(previewEl);
            container.appendChild(itemEl);
            this.gridItems.push(itemObj);
        });
    }

    public clearDragStates() {
        this.gridItems.forEach(item => {
            if (item.isDragged) {
                item.isDragged = false;
                item.imgEl.src = thumbnailGenerator.generate(item.flower);
                item.imgEl.style.opacity = '1';
            }
        });
    }

    public updateSnapshots() {
        this.gridItems.forEach(item => {
            item.imgEl.src = thumbnailGenerator.generate(item.flower);
            item.imgEl.style.opacity = '1';
            item.isHovered = false;
        });
    }

    public update(rotationX: number, rotationY: number) {
        this.sharedRotationX = rotationX;
        this.sharedRotationY = rotationY;
    }

    public render(forceAll: boolean = false) {
        this.renderer.setScissorTest(true);
        this.gridItems.forEach(item => {
            if (!item.isHovered && !item.isDragged && !forceAll) return;

            const rect = item.previewEl.getBoundingClientRect();
            if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) return;
            const width = rect.right - rect.left, height = rect.bottom - rect.top;
            const left = rect.left, bottom = window.innerHeight - rect.bottom;
            this.renderer.setViewport(left, bottom, width, height);
            this.renderer.setScissor(left, bottom, width, height);
            const existingFlower = this.scene.children.find(c => c instanceof THREE.Group);
            if (existingFlower) this.scene.remove(existingFlower);
            
            item.flower.rotation.x = this.sharedRotationX + item.offsetX;
            item.flower.rotation.y = this.sharedRotationY + item.offsetY;
            
            this.scene.add(item.flower);
            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.render(this.scene, this.camera);
        });
    }
}
