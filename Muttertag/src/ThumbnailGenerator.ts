import * as THREE from 'three';

export class ThumbnailGenerator {
    private renderer: THREE.WebGLRenderer;
    private scene: THREE.Scene;
    private camera: THREE.PerspectiveCamera;

    constructor() {
        // Create a small offscreen renderer
        this.renderer = new THREE.WebGLRenderer({ 
            alpha: true, 
            antialias: true,
            preserveDrawingBuffer: true 
        });
        this.renderer.setSize(256, 256);
        this.renderer.setPixelRatio(1);

        this.scene = new THREE.Scene();
        this.scene.background = null;

        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        this.camera.position.set(0, 3, 6);
        this.camera.lookAt(0, 0, 0);

        // Match main scene lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(2, 5, 2);
        this.scene.add(directionalLight);
    }

    public generate(flower: THREE.Group): string {
        // Temporarily add to our hidden scene
        this.scene.add(flower);
        
        // Render one frame
        this.renderer.render(this.scene, this.camera);
        
        // Convert to data URL (WebP is smaller/faster if supported)
        const dataUrl = this.renderer.domElement.toDataURL('image/webp', 0.8);
        
        // Clean up
        this.scene.remove(flower);
        
        return dataUrl;
    }
}

// Singleton instance
export const thumbnailGenerator = new ThumbnailGenerator();
