import * as THREE from 'three';

export interface ScreenGeo {
  /** Centre of the screen's bounding box, world space. */
  center: THREE.Vector3;
  /** Unit normal pointing out of the screen, toward the room. */
  normal: THREE.Vector3;
  /** `normal x up`. */
  right: THREE.Vector3;
  /** Bounding box size, world space. */
  size: THREE.Vector3;
  box: THREE.Box3;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Where a screen is and which way it faces (analysis section 7). Camera moves
 * and hit boxes are expressed relative to this, so re-exported models keep working.
 * `roomCenter` decides which side of the quad counts as the front.
 */
export function getScreenGeo(mesh: THREE.Mesh, roomCenter: THREE.Vector3): ScreenGeo {
  mesh.updateWorldMatrix(true, false);
  const box = new THREE.Box3().setFromObject(mesh);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());

  const normal = new THREE.Vector3(0, 0, 1);
  const normals = mesh.geometry.attributes.normal;
  if (normals) {
    normal
      .fromBufferAttribute(normals, 0)
      .applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld))
      .normalize();
  }
  if (normal.dot(roomCenter.clone().sub(center)) < 0) normal.negate();

  const right = new THREE.Vector3().crossVectors(normal, UP).normalize();
  return { center, normal, right, size, box };
}
