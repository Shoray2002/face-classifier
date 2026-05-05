import * as THREE from "three";

export function createMinimap() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0e18);

  const camera = new THREE.OrthographicCamera(-1.7, 1.7, 1.7, -1.7, 0.1, 30);
  camera.position.set(3.2, 2.6, 3.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const sun = new THREE.DirectionalLight(0xffffff, 0.85);
  sun.position.set(3, 4, 5);
  scene.add(sun);

  scene.add(new THREE.AxesHelper(1.5));

  const outerMaterial = new THREE.MeshLambertMaterial({
    color: 0x4d8bd1,
    transparent: true,
    opacity: 0.22,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const innerMaterial = new THREE.MeshLambertMaterial({ color: 0xff944a });

  const slabGeometry = new THREE.PlaneGeometry(2.6, 2.6);
  const slabMaterial = new THREE.MeshBasicMaterial({
    color: 0x66ccff,
    transparent: true,
    opacity: 0.32,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  const shapeGroup = new THREE.Group();
  scene.add(shapeGroup);

  const slabGroup = new THREE.Group();
  scene.add(slabGroup);

  const camDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.09, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xffd166 }),
  );
  scene.add(camDot);

  return {
    setGeometries(outer: THREE.BufferGeometry, inner?: THREE.BufferGeometry) {
      while (shapeGroup.children.length) {
        shapeGroup.remove(shapeGroup.children[0]);
      }
      shapeGroup.add(new THREE.Mesh(outer, outerMaterial));
      if (inner) {
        shapeGroup.add(new THREE.Mesh(inner, innerMaterial));
      }
    },

    update(
      planes: { position: number; normal: THREE.Vector3 }[],
      camPos: THREE.Vector3,
    ) {
      while (slabGroup.children.length < planes.length) {
        slabGroup.add(new THREE.Mesh(slabGeometry, slabMaterial));
      }
      while (slabGroup.children.length > planes.length) {
        slabGroup.remove(slabGroup.children[slabGroup.children.length - 1]);
      }

      const z = new THREE.Vector3(0, 0, 1);
      for (let i = 0; i < planes.length; i++) {
        const p = planes[i];
        const quad = slabGroup.children[i];
        quad.position.copy(p.normal).multiplyScalar(p.position);
        quad.quaternion.setFromUnitVectors(z, p.normal);
      }
      camDot.position.copy(camPos).normalize().multiplyScalar(2);
    },

    renderInto(
      renderer: THREE.WebGLRenderer,
      x: number,
      y: number,
      size: number,
    ) {
      renderer.setScissorTest(true);
      renderer.setViewport(x, y, size, size);
      renderer.setScissor(x, y, size, size);
      renderer.render(scene, camera);
      renderer.setScissorTest(false);
    },
  };
}
