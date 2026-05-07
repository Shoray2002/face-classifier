import * as THREE from "three";

export const idMaterial = new THREE.MeshBasicMaterial({
  vertexColors: true,
  side: THREE.DoubleSide,
  toneMapped: false,
});

export function loadIdColors(geometries: THREE.BufferGeometry[]) {
  for (const g of geometries) {
    const colorAttr = g.getAttribute("color");
    (colorAttr.array as Float32Array).set(g.userData.idColors as Float32Array);
    colorAttr.needsUpdate = true;
  }
}

const renderTarget = new THREE.WebGLRenderTarget(1, 1);

let targetW = 0;
let targetH = 0;
let pixels = new Uint8Array(0);

export function classifyAndColor(
  geometries: THREE.BufferGeometry[],
  camera: THREE.Camera,
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  clippingPlanes: THREE.Plane[],
) {
  const w = renderer.domElement.width;
  const h = renderer.domElement.height;
  if (w !== targetW || h !== targetH) {
    renderTarget.setSize(w, h);
    pixels = new Uint8Array(w * h * 4);
    targetW = w;
    targetH = h;
  }

  for (const g of geometries) {
    const colorAttr = g.getAttribute("color");
    (colorAttr.array as Float32Array).set(g.userData.idColors as Float32Array);
    colorAttr.needsUpdate = true;
  }

  idMaterial.clippingPlanes = clippingPlanes;
  scene.overrideMaterial = idMaterial;
  const prevBg = scene.background;
  scene.background = null;
  renderer.setClearColor(0x000000, 0);
  renderer.setRenderTarget(renderTarget);
  renderer.clear();
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  scene.overrideMaterial = null;
  scene.background = prevBg;

  renderer.readRenderTargetPixels(renderTarget, 0, 0, w, h, pixels);
  const visibleIds = new Set<number>();
  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] === 0) continue; // background pixel
    const id = pixels[i] | (pixels[i + 1] << 8) | (pixels[i + 2] << 16);
    visibleIds.add(id);
  }

  let visible = 0;
  let hidden = 0;
  for (const g of geometries) {
    const idStart = g.userData.idStart as number;
    const triCount = g.getAttribute("position").count / 3;
    const colors = g.getAttribute("color").array as Float32Array;
    for (let t = 0; t < triCount; t++) {
      const seen = visibleIds.has(idStart + t);
      if (seen) visible++;
      else hidden++;
      const r = seen ? 0.30 : 0.32;
      const g = seen ? 0.85 : 0.62;
      const b = seen ? 0.42 : 0.95;
      const o = t * 9;
      colors[o + 0] = r; colors[o + 1] = g; colors[o + 2] = b;
      colors[o + 3] = r; colors[o + 4] = g; colors[o + 5] = b;
      colors[o + 6] = r; colors[o + 7] = g; colors[o + 8] = b;
    }
    g.getAttribute("color").needsUpdate = true;
  }

  return { visible, hidden };
}
