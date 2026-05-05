import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildShell, buildPrism } from "./brep";
import { classifyAndColor } from "./classify";
import { createMinimap } from "./minimap";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14141c);

const camera = new THREE.PerspectiveCamera(
  50,
  window.innerWidth / window.innerHeight,
  0.1,
  100,
);
camera.position.set(2.4, 1.6, 2.4);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.localClippingEnabled = true;
document
  .querySelector<HTMLDivElement>("#app")!
  .appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 1));
const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.copy(camera.position);
scene.add(keyLight);

const shell = buildShell();
const prism = buildPrism();
const geometries = [shell, prism];
const clippingPlanes: THREE.Plane[] = [];
const minimap = createMinimap(shell, prism);

const sharedMaterialOptions: THREE.MeshStandardMaterialParameters = {
  vertexColors: true,
  side: THREE.DoubleSide,
  clippingPlanes,
  metalness: 0.05,
  roughness: 0.7,
};

scene.add(
  new THREE.Mesh(shell, new THREE.MeshStandardMaterial(sharedMaterialOptions)),
);
scene.add(
  new THREE.Mesh(prism, new THREE.MeshStandardMaterial(sharedMaterialOptions)),
);

const planes: { position: number; threePlane: THREE.Plane }[] = [];
const MAX_PLANES = 6;

function addPlane(position: number) {
  if (planes.length >= MAX_PLANES) return;
  const threePlane = new THREE.Plane();
  planes.push({ position, threePlane });
  clippingPlanes.push(threePlane);
  rebuildPanel();
}

const planesContainer = document.querySelector<HTMLDivElement>("#planes")!;
const addPlaneBtn = document.querySelector<HTMLButtonElement>("#add-plane")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;

function rebuildPanel() {
  planesContainer.innerHTML = "";

  for (let i = 0; i < planes.length; i++) {
    const p = planes[i];

    const row = document.createElement("div");
    row.className = "plane-row";
    row.innerHTML = `
      <span class="plane-num">#${i + 1}</span>
      <input type="range" class="pos" min="-1" max="1" step="0.01" value="${p.position}" />
      <span class="pos-val">${p.position.toFixed(2)}</span>
      <button class="remove" ${planes.length <= 1 ? "disabled" : ""}>×</button>
    `;

    const slider = row.querySelector<HTMLInputElement>(".pos")!;
    const valueLabel = row.querySelector<HTMLSpanElement>(".pos-val")!;
    const removeBtn = row.querySelector<HTMLButtonElement>(".remove")!;

    slider.addEventListener("input", () => {
      p.position = parseFloat(slider.value);
      valueLabel.textContent = p.position.toFixed(2);
    });

    removeBtn.addEventListener("click", () => {
      if (planes.length <= 1) return;
      planes.splice(i, 1);
      clippingPlanes.splice(i, 1);
      rebuildPanel();
    });

    planesContainer.appendChild(row);
  }

  addPlaneBtn.disabled = planes.length >= MAX_PLANES;
}

addPlaneBtn.addEventListener("click", () => {
  const offsets = [0, -0.4, 0.4, -0.7, 0.7, -1.0];
  addPlane(offsets[planes.length] ?? 0);
});

addPlane(0);

function tick() {
  controls.update();
  keyLight.position.copy(camera.position);
  const viewDir = new THREE.Vector3();
  camera.getWorldDirection(viewDir);
  for (const p of planes) {
    const point = viewDir.clone().multiplyScalar(p.position);
    p.threePlane.setFromNormalAndCoplanarPoint(viewDir, point);
  }
  const result = classifyAndColor(geometries, camera, clippingPlanes);
  const total = result.front + result.back + result.clipped;
  statusEl.textContent = `front: ${result.front}   back: ${result.back}   clipped: ${result.clipped}   (total ${total})`;
  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setViewport(0, 0, w, h);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);

  const miniSize = Math.min(320, Math.floor(Math.min(w, h) * 0.36));
  minimap.update(viewDir, planes, camera.position);
  minimap.renderInto(renderer, w - miniSize - 16, h - miniSize - 16, miniSize);

  requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

tick();
