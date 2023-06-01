// import { OBJLoader } from 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/loaders/OBJLoader.js';
// import { MTLLoader } from 'https://cdn.jsdelivr.net/npm/three@0.147.0/examples/jsm/loaders/MTLLoader.js';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'BufferGeometryUtils';
import { OrbitControls } from 'OrbitControls';
import Earth from './earth.js';


// Loading
const textureLoader = new THREE.TextureLoader();
const normalTexture = textureLoader.load('./imgs/fullNormal.jfif');
const earthTexture = textureLoader.load('./imgs/ULQColor_edit.jpg');
const UVmap = textureLoader.load('./imgs/UVmap.png');
// console.log(earthTexture)


// Canvas
const canvas = document.querySelector('canvas');

// Scene
const scene = new THREE.Scene();

// Materials
const earthMat = new THREE.MeshStandardMaterial({
    normalMap: normalTexture,
    map: earthTexture
});

const basicMat = new THREE.MeshBasicMaterial({
    map: earthTexture
});

const rad = 1, res = 100;
const earth = new Earth(rad, res, new THREE.Vector3(0, 0, 0));
const earthGroup = new THREE.Group();

const geometry = []
for(let i=0; i<6; i++) {
    geometry[i] = new THREE.BufferGeometry();
    geometry[i].setIndex(earth.faces[i].indices);
    geometry[i].setAttribute( 'position', new THREE.Float32BufferAttribute(earth.faces[i].vertices, 3) );

    geometry[i].computeVertexNormals();

    // geometry[i].normalizeNormals()
    geometry[i].setAttribute( 'uv', new THREE.Float32BufferAttribute(earth.faces[i].uvs, 2, res * res * 6));
    // console.log(geometry[i])

    // const wireframe = new THREE.WireframeGeometry( geometry[i] )
    // const line = new THREE.LineSegments( wireframe )
    // line.material.depthTest = false
    // line.material.opacity = 0.25
    // line.material.transparent = true
    // earthGroup.add(line)

}
let singleGeometry = BufferGeometryUtils.mergeGeometries(geometry);
// const singleMesh = new THREE.Mesh(singleGeometry, earthMat);
const singleMesh = new THREE.Mesh(singleGeometry, basicMat);
earthGroup.add(singleMesh);
// console.log(earthGroup)

scene.add(earthGroup);

// Lights
const pointLight = new THREE.PointLight(0xffffff, 5, 10);
pointLight.position.set(-3.2, 2, 7.5);
scene.add(pointLight);

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
camera.position.z = 4;
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas)
controls.enableDamping = true

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    alpha: true
});
renderer.setSize(screenWidth, screenHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const tick = () =>
{


    // Update objects
    // earthGroup.rotation.y = 1
    // earthGroup.rotation.y = Math.PI/2
    // earthGroup.rotation.x = -Math.PI/2
    earthGroup.rotation.y += 0.001;
    
    // Update Orbital Controls
    controls.update()

    // Render
    renderer.render(scene, camera);
    // console.log(earthGroup.rotation.x)

    // Call tick again on the next frame
    window.requestAnimationFrame(tick);
}

tick();