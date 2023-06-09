// import { Vector3 } from 'three';
// import { Vector2 } from 'three';
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
export class PlanetFace {
    constructor(radius, resolution, normal, axisA, axisB, cornerPoint, parentLOD) {
        if(radius == undefined) {
            return this;
        }
        this.vertices = [];
        //array storing UV coordinates
        this.uvs = [];
        //face is on z = 0 line
        this.indices = [];

        this.normal = normal;
        this.axisA = axisA;
        this.axisB = axisB;
        this.cornerPoint = cornerPoint;
        this.centerPos = PlanetFace.cubeToSphere(cornerPoint.clone().add(axisA.clone().multiplyScalar(0.5)).add(axisB.clone().multiplyScalar(0.5)));

        // higher level means vertices span shorter distance
        this.lodLevel = 1;
        if(parentLOD != undefined) { this.lodLevel = parentLOD * 2; }

        // horizontal and vertical axes of plane
        // const axisA = axesAndCorner[0];
        // const axisB = axesAndCorner[1];
        // const cornerPoint = axesAndCorner[2];

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
        return new Vector3(u, v);
    }
}

export function jsonToFace(json) {
    let face = new PlanetFace();
    face.vertices = json['vertices'];
    face.uvs = json['uvs'];
    face.indices = json['indices'];
    face.normal = json['vertices'];
    face.axisA = json['axisA'];
    face.axisB = json['axisV'];
    face.cornerPoint = json['cornerPoint'];
    face.centerPos = json['centerPos'];
    face.lodLevel = json['lodLevel'];
    return face;
}

export function splitFace(parentFaceJson, rad, res) {
    let pNormal = parentFaceJson['normal'];
    let pAxisA = parentFaceJson['axisA'];
    let pAxisB = parentFaceJson['axisB'];
    let pCornerPoint = parentFaceJson['cornerPoint'];
    let pLOD = parentFaceJson['lodLevel'];

    pNormal = new Vector3(pNormal.x, pNormal.y, pNormal.z);
    pAxisA = new Vector3(pAxisA.x, pAxisA.y, pAxisA.z);
    pAxisB = new Vector3(pAxisB.x, pAxisB.y, pAxisB.z);
    pCornerPoint = new Vector3(pCornerPoint.x, pCornerPoint.y, pCornerPoint.z);

    const face0 = new PlanetFace(rad, res, pNormal, pAxisA, pAxisB, pCornerPoint, pLOD);
    const face1 = new PlanetFace(rad, res, pNormal, pAxisA, pAxisB, pCornerPoint.clone().add(pAxisA.clone().multiplyScalar(1/pLOD)), pLOD);
    const face2 = new PlanetFace(rad, res, pNormal, pAxisA, pAxisB, pCornerPoint.clone().add(pAxisB.clone().multiplyScalar(1/pLOD)), pLOD);
    const face3 = new PlanetFace(rad, res, pNormal, pAxisA, pAxisB, pCornerPoint.clone().add(pAxisA.clone().multiplyScalar(1/pLOD)).add(pAxisB.clone().multiplyScalar(1/pLOD)), pLOD);
    return [face0, face1, face2, face3];
}

export function clearFaceData(face) {
    face.uvs = [];
    face.indices = [];
    face.vertices = [];
}

onmessage = (e) => {
    console.log("message recieved from main");
    let startTime = new Date();
    if(e.origin == '') {
        let faceData = JSON.parse(e.data[0]);
        let newFaces = splitFace(faceData, e.data[1], e.data[2]);
        const parentFaceIndex = e.data[3]
        // console.log(newFaces);
        newFaces = JSON.parse(JSON.stringify(newFaces));
        postMessage([newFaces, parentFaceIndex]);
        let timeInonmessage = new Date() - startTime;
        console.log("Time in worker: " + timeInonmessage);
    }
}

class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    clone() {
        return new Vector3(this.x, this.y, this.z);
    }

    add = function add(v) {
        this.x += v.x;
        this.y += v.y;
        this.z += v.z;
        return this;
    }

    multiplyScalar(n) {
        this.x *= n;
        this.y *= n;
        this.z *= n;
        return this;
    }
}
