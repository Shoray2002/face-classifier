import * as THREE from "three";
export function classifyAndColor(
  geometries: THREE.BufferGeometry[],
  camera: THREE.Camera,
  clipPlanes: THREE.Plane[],
  showClipped: boolean,
) {
  let front = 0;
  let back = 0;
  let clipped = 0;
  const faces: Record<string, { front: number; back: number; clipped: number }> = {};

  for (const geometry of geometries) {
    const positions = geometry.getAttribute("position");
    const colors = geometry.getAttribute("color");
    const triangleCount = positions.count / 3;
    const labels = geometry.userData.faceLabels as string[] | undefined;

    for (let t = 0; t < triangleCount; t++) {
      const i0 = t * 3;
      const i1 = t * 3 + 1;
      const i2 = t * 3 + 2;

      const a = new THREE.Vector3().fromBufferAttribute(positions, i0);
      const b = new THREE.Vector3().fromBufferAttribute(positions, i1);
      const c = new THREE.Vector3().fromBufferAttribute(positions, i2);

      const centroid = a.clone().add(b).add(c).divideScalar(3);
      let isClipped = false;
      if (showClipped) {
        for (const plane of clipPlanes) {
          if (plane.distanceToPoint(centroid) < 0) {
            isClipped = true;
            break;
          }
        }
      }

      const label = labels?.[t] ?? "mesh";
      const face = faces[label] ?? (faces[label] = { front: 0, back: 0, clipped: 0 });

      let r: number;
      let g: number;
      let b_: number;

      if (isClipped) {
        r = 0.42;
        g = 0.42;
        b_ = 0.48;
        clipped++;
        face.clipped++;
      } else {
        const edge1 = b.clone().sub(a);
        const edge2 = c.clone().sub(a);
        const normal = edge1.cross(edge2).normalize();
        const viewDir = centroid.clone().sub(camera.position).normalize();
        if (normal.dot(viewDir) < 0) {
          r = 0.30;
          g = 0.85;
          b_ = 0.42;
          front++;
          face.front++;
        } else {
          r = 0.32;
          g = 0.62;
          b_ = 0.95;
          back++;
          face.back++;
        }
      }
      colors.setXYZ(i0, r, g, b_);
      colors.setXYZ(i1, r, g, b_);
      colors.setXYZ(i2, r, g, b_);
    }

    colors.needsUpdate = true;
  }

  return { front, back, clipped, faces };
}
