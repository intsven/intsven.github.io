import * as THREE from 'three';

export interface LayerParams {
    petalCount: number;
    petalLength: number;
    petalWidth: number;
    cupStrength: number;    
    petalColor: string;     // Base Color
    petalColor2: string;    // Tip Color
    opacity: number;
    elevation: number;
    midWidthPos: number;    
    midWidthScale: number;  
    tipPointiness: number;  
    
    // NEW: Vertical Bend Parameters
    bendStrength: number;   // Overall bend intensity
    bendMidPos: number;     // Where the bend is most pronounced (0-1)
    bendEndAngle: number;   // Tip angle offset
}

export interface FlowerParams {
    centerColor: string;
    visualStyle: 'low-poly' | 'smooth' | 'wireframe';
    stemLength: number;
    petalSteps: number;      
    layers: LayerParams[];
}

export class FlowerGenerator {
    static createFlower(params: FlowerParams): THREE.Group {
        const flowerGroup = new THREE.Group();

        // 1. Center
        const centerGeo = new THREE.CylinderGeometry(0.15, 0.1, 0.15, 32);
        const centerMat = new THREE.MeshPhongMaterial({ 
            color: params.centerColor,
            flatShading: params.visualStyle === 'low-poly'
        });
        const center = new THREE.Mesh(centerGeo, centerMat);
        center.position.y = 0.05;
        flowerGroup.add(center);

        // 1.5 Stem
        if (params.stemLength > 0) {
            const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, params.stemLength, 16);
            const stemMat = new THREE.MeshPhongMaterial({ color: '#2d5a27' });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = -params.stemLength / 2;
            flowerGroup.add(stem);
        }

        // 3. Independent Symmetrical Layers
        for (let s = 0; s < params.petalSteps; s++) {
            const lp = params.layers[s];
            if (!lp) continue;

            const petalBaseGeo = this.createPetalGeometry(lp);
            const petalMat = new THREE.MeshPhongMaterial({ 
                vertexColors: true,
                side: THREE.DoubleSide,
                flatShading: params.visualStyle === 'low-poly',
                wireframe: params.visualStyle === 'wireframe',
                transparent: lp.opacity < 1,
                opacity: lp.opacity
            });

            for (let i = 0; i < lp.petalCount; i++) {
                const petal = new THREE.Mesh(petalBaseGeo, petalMat);
                petal.rotation.order = 'YXZ';
                
                const t = s / Math.max(1, params.petalSteps - 1);
                const openAngle = Math.PI * 0.4;
                const closedAngle = Math.PI * 0.05;
                petal.rotation.x = openAngle - (t * (openAngle - closedAngle));
                petal.rotation.y = (i / lp.petalCount) * Math.PI * 2;
                
                petal.position.set(0, lp.elevation, 0); 
                flowerGroup.add(petal);
            }
        }

        return flowerGroup;
    }

    private static createPetalGeometry(lp: LayerParams): THREE.BufferGeometry {
        const shape = new THREE.Shape();
        const midY = lp.petalLength * lp.midWidthPos;
        const midW = lp.petalWidth * lp.midWidthScale;
        const tipY = lp.petalLength;

        shape.moveTo(0, 0);
        shape.bezierCurveTo(midW, 0.1, midW, midY, 0, tipY);
        shape.bezierCurveTo(-midW, midY, -midW, 0.1, 0, 0);

        const extrudeSettings = {
            steps: 8, // More steps for smoother bend
            depth: 0.01, bevelEnabled: true,
            bevelThickness: 0.005, bevelSize: 0.005, bevelSegments: 2
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        const positions = geometry.attributes.position;
        const colors = new Float32Array(positions.count * 3);
        
        const c1 = new THREE.Color(lp.petalColor);
        const c2 = new THREE.Color(lp.petalColor2);
        const tempColor = new THREE.Color();

        for (let i = 0; i < positions.count; i++) {
            const x = positions.getX(i);
            const y = positions.getY(i);
            const z = positions.getZ(i);
            
            const ny = THREE.MathUtils.clamp(y / lp.petalLength, 0, 1);
            const nx = x / (lp.petalWidth * 1.5 + 0.001);
            
            // PARAMETRIC VERTICAL BEND
            // t = normalized position along length (0 to 1)
            // Quadratic bend based on mid-position and end angle
            const bendZ = lp.bendStrength * (Math.pow(ny, 2) * (1 - lp.bendMidPos) + Math.sin(ny * Math.PI * lp.bendMidPos));
            
            // Tip-specific angle influence
            const angleInfluence = Math.pow(ny, 3) * lp.bendEndAngle;
            
            const cupZ = Math.pow(nx, 2) * lp.cupStrength;
            
            positions.setZ(i, z + bendZ + cupZ + angleInfluence);

            tempColor.copy(c1).lerp(c2, ny);
            colors[i * 3] = tempColor.r;
            colors[i * 3 + 1] = tempColor.g;
            colors[i * 3 + 2] = tempColor.b;
        }
        
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.computeVertexNormals();
        return geometry;
    }
}
