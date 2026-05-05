import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
let renderer, scene, camera, cube,controls;
init();
animate();

function init() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  camera = new THREE.PerspectiveCamera(
    45,
    window.innerWidth / window.innerHeight,
    1,
    10000
  );
  camera.position.set(100, 150, 110);

  cube = new THREE.Mesh(
    new THREE.BoxGeometry(50, 50, 50),
    new THREE.MeshBasicMaterial({ color: 0xff0000 })
  );
  scene.add(cube);

  renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("canvas"),
    antialias: true,
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;

  controls = new OrbitControls(camera, renderer.domElement);
  // controls.addEventListener("change", render);
  controls.screenSpacePanning = true;
  // controls.maxPolarAngle = Math.PI / 2;
  controls.minDistance = 50;
  controls.maxDistance = 400;
  controls.autoRotate = true;
  controls.autoRotationSpeed = 5;
  controls.enableDamping = true;
  controls.dampingFactor = 0.25;

  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  render();
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  controls.update();
  requestAnimationFrame(animate);
  render();
}
