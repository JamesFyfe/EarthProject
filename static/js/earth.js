import { Vector3 } from 'three';
import { Vector2 } from 'three';
// import * as THREE from 'three';
import data from '../data/heightData4096.json' assert { type: 'json' };

export class Earth {
    constructor(radius, resolution, position) {
        this.radius = radius;
        this.resolution = resolution;
        this.position = position;
        this.faces = [];
		
        // normal for each face     front, back, right, left, top, bottom
        const normals = [
            new Vector3(0, 0, 1), 
            new Vector3(0, 0, -1), 
            new Vector3(1, 0, 0), 
            new Vector3(-1, 0, 0), 
            new Vector3(0, 1, 0), 
            new Vector3(0, -1, 0)
        ];

        const axesA = [
            new Vector3(1, 0, 0),
            new Vector3(-1, 0, 0),
            new Vector3(0, 0, -1),
            new Vector3(0, 0, 1),
            new Vector3(0, 0, 1),
            new Vector3(0, 0, 1)
        ];

        const axesB = [
            new Vector3(0, -1, 0),
            new Vector3(0, -1, 0),
            new Vector3(0, -1, 0),
            new Vector3(0, -1, 0),
            new Vector3(-1, 0, 0),
            new Vector3(1, 0, 0)
        ]

        const cornerPoints = [
            new Vector3(-1, 1, 1),
            new Vector3(1, 1, -1),
            new Vector3(1, 1, 1),
            new Vector3(-1, 1, -1),
            new Vector3(1, 1, -1),
            new Vector3(-1, -1, -1)
        ]
        
        // calls constructor to make each face
        for(let i=0; i<6; i++) {
            let face = new PlanetFace(radius, resolution, normals[i], axesA[i], axesB[i], cornerPoints[i]);
            this.faces[i] = face;
        }
    }
}

// builds each face
class PlanetFace {
    constructor(radius, resolution, normal, axisA, axisB, cornerPoint, pLOD) {
        this.vertices = [];
        //array storing UV coordinates
        this.uvs = [];
        this.indices = [];
        this.normal = normal;
        this.axisA = axisA;
        this.axisB = axisB;
        this.cornerPoint = cornerPoint;
        this.centerPos = PlanetFace.cubeToSphere(cornerPoint.clone().add(axisA.clone().multiplyScalar(0.5)).add(axisB.clone().multiplyScalar(0.5)));

        // higher level means vertices span shorter distance
        this.lodLevel = 1;
        if(pLOD != undefined) { this.lodLevel = pLOD * 2; }

        // generate vertices, start at corner point then build along axis a then b
        for(let j=0; j <= resolution; j++) 
        {
            const currentVertexB = axisB.clone();
            currentVertexB.multiplyScalar((j / resolution) * 2 / this.lodLevel);
            for(let k=0; k <= resolution; k++)
            {
                const currentVertexA = axisA.clone();
                currentVertexA.multiplyScalar((k / resolution) * 2 / this.lodLevel);

				// add vertexB and vertexA to corner point to get current vertex location
                let currentVertex = cornerPoint.clone();
                currentVertex.add(currentVertexA).add(currentVertexB);

				// get location on sphere and UV
                currentVertex = PlanetFace.cubeToSphere(currentVertex);
                const currentUV = PlanetFace.pointOnSphereToUV(currentVertex);

                // find height at point (inverse y so its not upside down)
				let x = Math.round(data.length * currentUV.x);
				let y = Math.round(data.length/2 - data.length/2 * currentUV.y);

				// so x/y arent out of bounds (data.length is same as 0)
				if(x == data.length) { x=0; }
				if(y == data.length/2) { y=0; }

				let heightMult = 0.015;
				let vertexHeight = radius + data[x][y] / 61826 * heightMult;

                currentVertex.multiplyScalar(vertexHeight);

                // on seam add another vertex with u = 1
                if(currentVertex.z == 0 && normal.x != 1) {
                    if(currentVertex.x > 0) {
                        this.uvs.push(currentUV.x, currentUV.y);
                    } else {
                        this.uvs.push(1, currentUV.y);
                    }
                    this.vertices.push(currentVertex.x, currentVertex.y, currentVertex.z);
                }
                this.uvs.push(currentUV.x, currentUV.y);
                this.vertices.push(currentVertex.x, currentVertex.y, currentVertex.z);
            }
        }

        let i = 0, resolutionX = resolution;
        // fixes seams
        if(normal.x == -1 || normal.y == 1 || normal.y == -1) {
            resolutionX++;
        }
        // build triangles from each point
        for(let j=0; j < resolution; j++) 
        {
            for(let k=0; k < resolutionX; k++)
            {
                const a = i;
                const b = i + 1;
                const c = i + resolutionX + 1;
                const d = i + resolutionX + 2;

                // add indices of both triangles
                this.indices.push(a, c, b);
                this.indices.push(c, d, b);
                i++;
            }
            i++;
        }
    }

    static cubeToSphere(p) {
    	const x2 = p.x * p.x;
    	const y2 = p.y * p.y;
    	const z2 = p.z * p.z;
    	const x = p.x * Math.sqrt(1 - (y2 + z2) / 2 + (y2 * z2) / 3);
    	const y = p.y * Math.sqrt(1 - (z2 + x2) / 2 + (z2 * x2) / 3);
    	const z = p.z * Math.sqrt(1 - (x2 + y2) / 2 + (x2 * y2) / 3);
    	return new Vector3(x, y, z);
    }

    // should calculate all before hand and store in array
    static pointOnSphereToUV(p) {
        const v = 0.5 + (Math.asin(p.y) / Math.PI);
        const u = 0.5 - (Math.atan2(p.z, p.x) / (2 * Math.PI));
        return new Vector2(u, v);
    }
}

export function splitFace(parentFace, rad, res) {
    const pLOD = parentFace.lodLevel;
    const face0 = new PlanetFace(rad, res, parentFace.normal, parentFace.axisA, parentFace.axisB, parentFace.cornerPoint, pLOD);
    const face1 = new PlanetFace(rad, res, parentFace.normal, parentFace.axisA, parentFace.axisB, parentFace.cornerPoint.clone().add(parentFace.axisA.clone().multiplyScalar(1/parentFace.lodLevel)), pLOD);
    const face2 = new PlanetFace(rad, res, parentFace.normal, parentFace.axisA, parentFace.axisB, parentFace.cornerPoint.clone().add(parentFace.axisB.clone().multiplyScalar(1/parentFace.lodLevel)), pLOD);
    const face3 = new PlanetFace(rad, res, parentFace.normal, parentFace.axisA, parentFace.axisB, parentFace.cornerPoint.clone().add(parentFace.axisA.clone().multiplyScalar(1/parentFace.lodLevel)).add(parentFace.axisB.clone().multiplyScalar(1/parentFace.lodLevel)), pLOD);
    return [face0, face1, face2, face3];
}
