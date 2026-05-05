import * as THREE from "three";
export function buildShell() {
  const g = new THREE.SphereGeometry(1, 32, 16).toNonIndexed();
  addVertexColors(g);
  return g;
}

export function buildPrism() {
  const g = new THREE.BoxGeometry(0.55, 0.55, 0.55).toNonIndexed();
  g.translate(0.18, -0.08, 0.04);
  addVertexColors(g);
  return g;
}

function addVertexColors(g: THREE.BufferGeometry) {
  const vertexCount = g.getAttribute("position").count;
  const colors = new Float32Array(vertexCount * 3);
  g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
}
