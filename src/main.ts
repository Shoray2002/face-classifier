import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { classifyAndColor, idMaterial, loadIdColors } from "./classify";
import { createMinimap } from "./minimap";

document.querySelector(".dot.clp")?.parentElement?.remove();

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

const app = document.querySelector<HTMLDivElement>("#app")!;
app.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.AmbientLight(0xffffff, 1));
const keyLight = new THREE.DirectionalLight(0xffffff, 1);
keyLight.position.copy(camera.position);
scene.add(keyLight);
function addVertexColors(geometry: THREE.BufferGeometry) {
  const vertexCount = geometry.getAttribute("position").count;
  const colors = new Float32Array(vertexCount * 3);
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}

const clippingPlanes: THREE.Plane[] = [];
const materialOptions: THREE.MeshStandardMaterialParameters = {
  vertexColors: true,
  side: THREE.DoubleSide,
  clippingPlanes: clippingPlanes,
  metalness: 0.05,
  roughness: 0.7,
};

const minimap = createMinimap();

let geometries: THREE.BufferGeometry[] = [];
let meshes: THREE.Mesh[] = [];

function setShape(newGeometries: THREE.BufferGeometry[]) {
  for (const mesh of meshes) {
    scene.remove(mesh);
    (mesh.material as THREE.Material).dispose();
  }
  for (const g of geometries) {
    g.dispose();
  }
  geometries = newGeometries;
  meshes = [];

  let idCounter = 0;
  for (const g of geometries) {
    const triCount = g.getAttribute("position").count / 3;
    g.userData.idStart = idCounter;
    const idColors = new Float32Array(g.getAttribute("position").count * 3);
    for (let t = 0; t < triCount; t++) {
      const id = idCounter + t;
      const r = (id & 0xff) / 255;
      const gv = ((id >> 8) & 0xff) / 255;
      const b = ((id >> 16) & 0xff) / 255;
      const o = t * 9;
      idColors[o + 0] = r; idColors[o + 1] = gv; idColors[o + 2] = b;
      idColors[o + 3] = r; idColors[o + 4] = gv; idColors[o + 5] = b;
      idColors[o + 6] = r; idColors[o + 7] = gv; idColors[o + 8] = b;
    }
    g.userData.idColors = idColors;
    idCounter += triCount;
  }

  for (const g of geometries) {
    const material = new THREE.MeshStandardMaterial(materialOptions);
    const mesh = new THREE.Mesh(g, material);
    scene.add(mesh);
    meshes.push(mesh);
  }

  minimap.setGeometries(geometries[0], geometries[1]);
}

function loadDefault() {
  const shell = new THREE.SphereGeometry(1, 64, 64).toNonIndexed();
  addVertexColors(shell);
  shell.userData.faceLabels = Array(shell.getAttribute("position").count / 3).fill("sphere");

  const prism = new THREE.BoxGeometry(0.55, 0.55, 0.55).toNonIndexed();
  prism.translate(0.18, -0.8, 0.04);
  addVertexColors(prism);
  prism.userData.faceLabels = ["+X", "+X", "-X", "-X", "+Y", "+Y", "-Y", "-Y", "+Z", "+Z", "-Z", "-Z"];

  setShape([shell, prism]);
}

loadDefault();

// ---------- STL upload ----------

const fileInput = document.querySelector<HTMLInputElement>("#stl-upload")!;
fileInput.addEventListener("change", async () => {
  const file = fileInput.files?.[0];
  if (!file) return;
  const buffer = await file.arrayBuffer();
  const geometry = new STLLoader().parse(buffer);

  geometry.computeBoundingSphere();
  const boundingSphere = geometry.boundingSphere!;
  geometry.translate(
    -boundingSphere.center.x,
    -boundingSphere.center.y,
    -boundingSphere.center.z,
  );
  const scale = 0.9 / boundingSphere.radius;
  geometry.scale(scale, scale, scale);
  const finalGeometry = geometry.index ? geometry.toNonIndexed() : geometry;
  addVertexColors(finalGeometry);
  finalGeometry.userData.faceLabels = Array(finalGeometry.getAttribute("position").count / 3).fill("model");
  setShape([finalGeometry]);
});

const resetBtn = document.querySelector<HTMLButtonElement>("#reset-model")!;
resetBtn.addEventListener("click", () => {
  fileInput.value = "";
  loadDefault();
});

let showIdPass = false;
const showIdPassCheckbox = document.querySelector<HTMLInputElement>("#show-id-pass")!;
showIdPassCheckbox.addEventListener("change", () => {
  showIdPass = showIdPassCheckbox.checked;
});

type Axis = "x" | "y" | "z";

const PRESET_ANGLES: Record<Axis, { yaw: number; pitch: number }> = {
  x: { yaw: 90, pitch: 0 },
  y: { yaw: 0, pitch: 90 },
  z: { yaw: 0, pitch: 0 },
};

interface SectionPlane {
  position: number;
  yaw: number;
  pitch: number;
  normal: THREE.Vector3;
  threePlane: THREE.Plane;
}

const planes: SectionPlane[] = [];
const MAX_PLANES = 6;

function addPlane(axis: Axis) {
  if (planes.length >= MAX_PLANES) return;

  const angles = PRESET_ANGLES[axis];
  const threePlane = new THREE.Plane();

  const newPlane: SectionPlane = {
    position: 0,
    yaw: angles.yaw,
    pitch: angles.pitch,
    normal: new THREE.Vector3(),
    threePlane: threePlane,
  };

  planes.push(newPlane);
  clippingPlanes.push(threePlane);
  rebuildPanel();
}

function removePlane(index: number) {
  if (planes.length <= 1) return;
  planes.splice(index, 1);
  clippingPlanes.splice(index, 1);
  rebuildPanel();
}

function isAxisActive(plane: SectionPlane, axis: Axis): boolean {
  const angles = PRESET_ANGLES[axis];
  return plane.yaw === angles.yaw && plane.pitch === angles.pitch;
}

const planesContainer = document.querySelector<HTMLDivElement>("#planes")!;
const addPlaneBtn = document.querySelector<HTMLButtonElement>("#add-plane")!;
const statusEl = document.querySelector<HTMLDivElement>("#status")!;

function rebuildPanel() {
  planesContainer.innerHTML = "";

  for (let i = 0; i < planes.length; i++) {
    const plane = planes[i];

    const row = document.createElement("div");
    row.className = "plane-row";
    row.innerHTML = `
      <span class="plane-num">#${i + 1}</span>
      <div class="axis-buttons">
        <button class="axis-btn ${isAxisActive(plane, "x") ? "active" : ""}" data-axis="x">X</button>
        <button class="axis-btn ${isAxisActive(plane, "y") ? "active" : ""}" data-axis="y">Y</button>
        <button class="axis-btn ${isAxisActive(plane, "z") ? "active" : ""}" data-axis="z">Z</button>
      </div>
      <input type="range" class="pos" min="-1" max="1" step="0.01" value="${plane.position}" />
      <span class="pos-val">${plane.position.toFixed(2)}</span>
      <button class="remove" ${planes.length <= 1 ? "disabled" : ""}>×</button>
      <div class="plane-angles">
        <div class="angle-slider">
          <label>yaw</label>
          <input type="range" class="yaw" min="-180" max="180" step="1" value="${plane.yaw}" />
          <span class="angle-val yaw-val">${Math.round(plane.yaw)}°</span>
        </div>
        <div class="angle-slider">
          <label>pitch</label>
          <input type="range" class="pitch" min="-90" max="90" step="1" value="${plane.pitch}" />
          <span class="angle-val pitch-val">${Math.round(plane.pitch)}°</span>
        </div>
      </div>
    `;

    const axisButtons = row.querySelectorAll<HTMLButtonElement>(".axis-btn");
    const positionSlider = row.querySelector<HTMLInputElement>(".pos")!;
    const positionLabel = row.querySelector<HTMLSpanElement>(".pos-val")!;
    const removeBtn = row.querySelector<HTMLButtonElement>(".remove")!;
    const yawSlider = row.querySelector<HTMLInputElement>(".yaw")!;
    const yawLabel = row.querySelector<HTMLSpanElement>(".yaw-val")!;
    const pitchSlider = row.querySelector<HTMLInputElement>(".pitch")!;
    const pitchLabel = row.querySelector<HTMLSpanElement>(".pitch-val")!;

    function refreshAxisHighlight() {
      axisButtons.forEach((btn) => {
        const axis = btn.dataset.axis as Axis;
        if (isAxisActive(plane, axis)) {
          btn.classList.add("active");
        } else {
          btn.classList.remove("active");
        }
      });
    }
    axisButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const axis = btn.dataset.axis as Axis;
        const angles = PRESET_ANGLES[axis];
        plane.yaw = angles.yaw;
        plane.pitch = angles.pitch;
        yawSlider.value = String(plane.yaw);
        yawLabel.textContent = `${Math.round(plane.yaw)}°`;
        pitchSlider.value = String(plane.pitch);
        pitchLabel.textContent = `${Math.round(plane.pitch)}°`;
        refreshAxisHighlight();
      });
    });

    yawSlider.addEventListener("input", () => {
      plane.yaw = parseFloat(yawSlider.value);
      yawLabel.textContent = `${Math.round(plane.yaw)}°`;
      refreshAxisHighlight();
    });

    pitchSlider.addEventListener("input", () => {
      plane.pitch = parseFloat(pitchSlider.value);
      pitchLabel.textContent = `${Math.round(plane.pitch)}°`;
      refreshAxisHighlight();
    });

    positionSlider.addEventListener("input", () => {
      plane.position = parseFloat(positionSlider.value);
      positionLabel.textContent = plane.position.toFixed(2);
    });

    removeBtn.addEventListener("click", () => {
      removePlane(i);
    });

    planesContainer.appendChild(row);
  }

  addPlaneBtn.disabled = planes.length >= MAX_PLANES;
}

addPlaneBtn.addEventListener("click", () => {
  const axes: Axis[] = ["x", "y", "z"];
  const nextAxis = axes[planes.length % 3];
  addPlane(nextAxis);
});
addPlane("x");


function tick() {
  controls.update();
  keyLight.position.copy(camera.position);
  for (const p of planes) {
    const yawRad = (p.yaw * Math.PI) / 180;
    const pitchRad = (p.pitch * Math.PI) / 180;
    const cosPitch = Math.cos(pitchRad);

    p.normal.set(
      Math.sin(yawRad) * cosPitch,
      Math.sin(pitchRad),
      Math.cos(yawRad) * cosPitch,
    );

    const point = p.normal.clone().multiplyScalar(p.position);
    p.threePlane.setFromNormalAndCoplanarPoint(p.normal, point);
  }

  if (showIdPass) {
    loadIdColors(geometries);
    idMaterial.clippingPlanes = clippingPlanes;
    scene.overrideMaterial = idMaterial;
    statusEl.textContent = "";
  } else {
    const result = classifyAndColor(geometries, camera, scene, renderer, clippingPlanes);
    const total = result.visible + result.hidden;
    statusEl.textContent = `visible: ${result.visible}   hidden: ${result.hidden}   (total ${total})`;
  }

  const w = window.innerWidth;
  const h = window.innerHeight;
  renderer.setViewport(0, 0, w, h);
  renderer.setScissorTest(false);
  renderer.render(scene, camera);
  scene.overrideMaterial = null;

  const miniSize = Math.min(320, Math.floor(Math.min(w, h) * 0.36));
  minimap.update(planes, camera.position);
  minimap.renderInto(renderer, w - miniSize - 16, h - miniSize - 16, miniSize);

  requestAnimationFrame(tick);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

tick();
