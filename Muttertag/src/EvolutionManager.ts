import * as THREE from 'three';
import { FlowerGenerator } from './FlowerGenerator';
import type { FlowerParams } from './FlowerGenerator';

export class EvolutionManager {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;
    private gridItems: { element: HTMLElement, params: FlowerParams, flower: THREE.Group, selected: boolean }[] = [];
    private sharedRotationY = 0;
    private sharedRotationX = 0;
    private onFavoriteCallback: (params: FlowerParams) => void;
    private onSelectionChangeCallback: (count: number) => void;

    constructor(renderer: THREE.WebGLRenderer, onFavorite: (params: FlowerParams) => void, onSelectionChange: (count: number) => void) {
        this.renderer = renderer;
        this.onFavoriteCallback = onFavorite;
        this.onSelectionChangeCallback = onSelectionChange;
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

    public updateGrid(baseParams: FlowerParams, container: HTMLElement) {
        container.innerHTML = '';
        this.gridItems = [];
        this.scene.children = this.scene.children.filter(c => !(c instanceof THREE.Group));

        for (let i = 0; i < 16; i++) {
            const params = i === 0 ? JSON.parse(JSON.stringify(baseParams)) : this.mutate(baseParams);
            this.addGridItem(params, container, i === 0);
        }
    }

    private addGridItem(params: FlowerParams, container: HTMLElement, isOriginal: boolean) {
        const itemEl = document.createElement('div');
        itemEl.className = 'evolution-item';
        
        const itemObj = { element: itemEl, params, flower: FlowerGenerator.createFlower(params), selected: false };

        const favBtn = document.createElement('button');
        favBtn.className = 'btn-fav-icon';
        favBtn.innerHTML = '❤️';
        favBtn.onclick = (e) => { e.stopPropagation(); this.onFavoriteCallback(params); };
        itemEl.appendChild(favBtn);

        const selectBtn = document.createElement('button');
        selectBtn.className = 'btn-select';
        selectBtn.textContent = isOriginal ? 'Basis' : 'Wählen';
        selectBtn.onclick = (e) => {
            e.stopPropagation();
            itemObj.selected = !itemObj.selected;
            itemEl.classList.toggle('selected', itemObj.selected);
            selectBtn.textContent = itemObj.selected ? 'Gewählt ✓' : (isOriginal ? 'Basis' : 'Wählen');
            this.onSelectionChangeCallback(this.getSelectedParams().length);
        };
        itemEl.appendChild(selectBtn);
        container.appendChild(itemEl);

        this.gridItems.push(itemObj);
    }

    public getSelectedParams(): FlowerParams[] {
        return this.gridItems.filter(i => i.selected).map(i => i.params);
    }

    public breed(parents: FlowerParams[], container: HTMLElement) {
        if (parents.length === 0) return;
        
        container.innerHTML = '';
        this.gridItems = [];
        this.scene.children = this.scene.children.filter(c => !(c instanceof THREE.Group));

        for (let i = 0; i < 16; i++) {
            let offspring: FlowerParams;
            
            if (parents.length === 1) {
                // If only one selected, index 0 is copy, others are mutations
                offspring = i === 0 ? JSON.parse(JSON.stringify(parents[0])) : this.mutate(parents[0]);
            } else {
                // Pick two random parents for crossover
                const p1 = parents[Math.floor(Math.random() * parents.length)];
                const p2 = parents[Math.floor(Math.random() * parents.length)];
                offspring = this.crossover(p1, p2);
                if (i > parents.length) offspring = this.mutate(offspring); // Extra mutation for non-elitists
            }
            
            this.addGridItem(offspring, container, i < parents.length);
        }
    }

    private crossover(p1: FlowerParams, p2: FlowerParams): FlowerParams {
        const child: FlowerParams = JSON.parse(JSON.stringify(p1));
        
        // Crossover global props
        if (Math.random() > 0.5) child.centerColor = p2.centerColor;
        if (Math.random() > 0.5) child.visualStyle = p2.visualStyle;
        if (Math.random() > 0.5) child.stemLength = p2.stemLength;

        // Crossover layers
        // We'll take layers from both parents randomly
        const maxLayers = Math.max(p1.petalSteps, p2.petalSteps);
        child.layers = [];
        for (let i = 0; i < maxLayers; i++) {
            const layerFromP1 = p1.layers[i];
            const layerFromP2 = p2.layers[i];
            
            if (layerFromP1 && layerFromP2) {
                child.layers.push(Math.random() > 0.5 ? JSON.parse(JSON.stringify(layerFromP1)) : JSON.parse(JSON.stringify(layerFromP2)));
            } else if (layerFromP1) {
                if (Math.random() > 0.2) child.layers.push(JSON.parse(JSON.stringify(layerFromP1)));
            } else if (layerFromP2) {
                if (Math.random() > 0.2) child.layers.push(JSON.parse(JSON.stringify(layerFromP2)));
            }
        }
        child.petalSteps = child.layers.length;
        return child;
    }

    private mutate(base: FlowerParams): FlowerParams {
        const p: FlowerParams = JSON.parse(JSON.stringify(base));
        if (Math.random() > 0.6) {
            const color = new THREE.Color(p.centerColor);
            color.offsetHSL(Math.random() * 0.4 - 0.2, 0.3, 0);
            p.centerColor = '#' + color.getHexString();
        }
        p.layers.forEach((l) => {
            if (Math.random() > 0.4) l.petalCount = Math.max(3, Math.min(60, l.petalCount + Math.floor(Math.random() * 14 - 7)));
            if (Math.random() > 0.4) l.petalLength *= (0.4 + Math.random() * 1.2);
            if (Math.random() > 0.4) l.petalWidth *= (0.4 + Math.random() * 1.2);
            if (Math.random() > 0.4) l.cupStrength += (Math.random() - 0.5) * 2;
            if (Math.random() > 0.4) l.midWidthPos = Math.max(0.1, Math.min(0.9, l.midWidthPos + (Math.random() - 0.5) * 0.4));
            if (Math.random() > 0.4) l.midWidthScale = Math.max(0.2, Math.min(2.5, l.midWidthScale + (Math.random() - 0.5) * 0.6));
            if (Math.random() > 0.4) l.tipPointiness = Math.max(0, Math.min(1, l.tipPointiness + (Math.random() - 0.5) * 0.4));
            if (Math.random() > 0.4) l.bendStrength = (l.bendStrength || 0) + (Math.random() - 0.5) * 3;
            if (Math.random() > 0.4) l.bendMidPos = Math.max(0.1, Math.min(0.9, (l.bendMidPos || 0.5) + (Math.random() - 0.5) * 0.4));
            if (Math.random() > 0.4) l.bendEndAngle = (l.bendEndAngle || 0) + (Math.random() - 0.5) * 2;

            if (Math.random() > 0.2) {
                const color = new THREE.Color(l.petalColor);
                color.offsetHSL(Math.random() * 0.8 - 0.4, Math.random() * 0.8 - 0.4, Math.random() * 0.5 - 0.25);
                l.petalColor = '#' + color.getHexString();
            }
            if (Math.random() > 0.2) {
                const color = new THREE.Color(l.petalColor2);
                color.offsetHSL(Math.random() * 0.8 - 0.4, Math.random() * 0.8 - 0.4, Math.random() * 0.5 - 0.25);
                l.petalColor2 = '#' + color.getHexString();
            }
        });
        if (Math.random() > 0.8 && p.petalSteps < 12) {
            p.petalSteps++;
            const last = p.layers[p.layers.length-1];
            const nl = JSON.parse(JSON.stringify(last));
            nl.elevation += 0.15;
            p.layers.push(nl);
        } else if (Math.random() > 0.9 && p.petalSteps > 1) {
            p.petalSteps--;
            p.layers.pop();
        }
        return p;
    }

    public update(rotationX: number, rotationY: number) {
        this.sharedRotationX = rotationX; this.sharedRotationY = rotationY;
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
            item.flower.rotation.x = this.sharedRotationX; item.flower.rotation.y = this.sharedRotationY;
            this.scene.add(item.flower);
            this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
            this.renderer.render(this.scene, this.camera);
        });
    }
}
