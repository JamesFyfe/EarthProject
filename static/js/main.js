// import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/loaders/OBJLoader.js';
// import { MTLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';
// import * as BufferGeometryUtils from 'BufferGeometryUtils';
import { OrbitControls } from 'OrbitControls';
import { Earth, jsonToFace, clearFaceData } from './earth.js';

const worker = new Worker('./js/earth.js', {type:'module'});
let workerBusy = false;
// Loading
const textureLoader = new THREE.TextureLoader();
// const normalTexture = textureLoader.load('./imgs/normalMap16kFlat.jpg');
const normalTexture = textureLoader.load('./imgs/output.jpg');

const earthTexture = textureLoader.load('./imgs/ULQColor_edit.jpg');
// const earthTexture = textureLoader.load('./imgs/color21600.png');

// const UVmap = textureLoader.load('./imgs/UVmap.png');

const canvas = document.querySelector('canvas');

const scene = new THREE.Scene();

// Materials
const earthMat = new THREE.MeshStandardMaterial({
    map: earthTexture,
    normalMap: normalTexture,
    normalScale: new THREE.Vector2(1, 1),
    roughness: 0.4,
    // metalness: 0.1,
});

const basicMat = new THREE.MeshBasicMaterial({
    map: earthTexture
});

const rad = 1, res = 500;
const earth = new Earth(rad, res, new THREE.Vector3(0, 0, 0));
const earthGroup = new THREE.Group();

const geometries = []
let meshes = []
for(let i=0; i<6; i++) {
    geometries[i] = new THREE.BufferGeometry();
    geometries[i].setIndex(earth.faces[i].indices);
    geometries[i].setAttribute( 'position', new THREE.Float32BufferAttribute(earth.faces[i].vertices, 3) );
    geometries[i].setAttribute( 'uv', new THREE.Float32BufferAttribute(earth.faces[i].uvs, 2, res * res * 6));
    geometries[i].computeVertexNormals();

    meshes[i] = new THREE.Mesh(geometries[i], earthMat);
    earthGroup.add(meshes[i]);

    // const wireframe = new THREE.WireframeGeometry( geometries[i] );
    // const line = new THREE.LineSegments( wireframe );
    // line.material.depthTest = false;
    // line.material.opacity = 0.25;
    // line.material.transparent = true;
    // earthGroup.add(line);
}

// let singleGeometry = BufferGeometryUtils.mergeGeometries(geometry);
// singleGeometry.computeVertexNormals();
// singleGeometry.normalizeNormals();
// let earthJSON = singleGeometry.toJSON();
// console.log(earthJSON);

// const singleMesh = new THREE.Mesh(singleGeometry, earthMat);
// earthGroup.add(singleMesh);

scene.add(earthGroup);

// Lights
// const pointLight = new THREE.PointLight(0xffffff, 5, 15);
// pointLight.position.set(-3.2, 2, 8);
// scene.add(pointLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 1);
dirLight.position.set(-.7, -.1, 0.6);
// dirLight.castShadow = true;
scene.add(dirLight);

const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // soft white light
scene.add( ambientLight );

let screenWidth = window.innerWidth;
let screenHeight = window.innerHeight;

window.addEventListener('resize', () =>
{
    // Update sizes
    screenWidth = window.innerWidth;
    screenHeight = window.innerHeight;

    // Update camera
    camera.aspect = screenWidth / screenHeight;
    camera.updateProjectionMatrix();

    // Update renderer
    renderer.setSize(screenWidth, screenHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
})

// Camera
const camera = new THREE.PerspectiveCamera(75, screenWidth / screenHeight, 0.1, 100);
camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 2;
camera.near = 0.01;
camera.updateProjectionMatrix();
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.maxDistance = 4;
controls.minDistance = 1.05;
controls.zoomSpeed = 0.05;

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
});
renderer.setSize(screenWidth, screenHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

function increaseLOD(i) {
    console.log("increasing LOD of mesh " + i);
    // clear face data to make json smaller as we dont need that data anymore
    clearFaceData(earth.faces[i]);
    let face = JSON.stringify(earth.faces[i]);

    // const newFaces = []
    // for(let i=0; i<4; i++) {
    //     newFaces[i] = new PlanetFace();
    // }

    worker.postMessage([face, rad, res, i]);
    workerBusy = true;
    console.log("Message posted to worker");
}

worker.onmessage = (e) => {
    console.log("message recieved from worker");
    workerBusy = false;
    let startTime = new Date();
    // console.log(e);
    const parentIndex = e.data[1];
    const newFaces = [];
    for(let k=0; k<4; k++) {
        newFaces[k] = jsonToFace(e.data[0][k]);
    }
    let timeLoadingFaces = new Date() - startTime;
    console.log("Time loading faces: " + timeLoadingFaces);
    startTime = new Date();
    const newGeometries = []
    const newMeshes = []
    for(let j=0; j<4; j++) {
        newGeometries[j] = new THREE.BufferGeometry();
        newGeometries[j].setIndex(newFaces[j].indices);
        newGeometries[j].setAttribute( 'position', new THREE.Float32BufferAttribute(newFaces[j].vertices, 3) );
        newGeometries[j].setAttribute( 'uv', new THREE.Float32BufferAttribute(newFaces[j].uvs, 2, res * res * 6));
        newGeometries[j].computeVertexNormals();

        newMeshes[j] = new THREE.Mesh(newGeometries[j], earthMat);
        earthGroup.add(newMeshes[j]);
    }
    let timeLoadingMeshes = new Date() - startTime;

    console.log("Time creating meshes: " + timeLoadingMeshes);
    earth.faces = earth.faces.concat(newFaces);
    earth.faces.splice(parentIndex);
    earthGroup.remove(meshes[parentIndex])
    meshes.splice(parentIndex)
    meshes = meshes.concat(newMeshes);
}

function getCameraDist() {
    return camera.position.distanceTo(earth.position);
}

function checkIncreaseLOD() {
    if(getCameraDist() < 1.3 && !workerBusy) {
        let closest = Infinity;
        let closeFace = -1;
        for(let i=0; i<earth.faces.length; i++) {
            const dist = camera.position.distanceTo(earth.faces[i].centerPos);
            if(dist < closest) {
                closest = dist;
                closeFace = i;
            }
        }
        if(closeFace != -1 && earth.faces[closeFace].lodLevel == 1) {
            increaseLOD(closeFace)
        }
    }
}

const tick = () =>
{
    // Update objects
    // earthGroup.rotation.y += 0.001;
    
    // Update Orbital Controls
    controls.update();
    // Render
    renderer.render(scene, camera);
    checkIncreaseLOD();
    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}
tick();
