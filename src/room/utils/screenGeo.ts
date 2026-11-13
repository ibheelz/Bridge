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

/**
 * The vertical field of view, in degrees, that makes `width` world units fill
 * the view horizontally from `distance` away (analysis section 7). Clamped to 16-72.
 */
export function fovToFrame(width: number, distance: number, aspect: number): number {
  const fov = 2 * Math.atan(width / (2 * Math.max(aspect, 0.01)) / distance);
  return THREE.MathUtils.clamp(THREE.MathUtils.radToDeg(fov), 16, 72);
}

/**
 * A mode's fixed field of view is meant for landscape. On portrait it is
 * widened so the view stays as wide as it would be on a square screen (72 at most).
 */
export function widenForPortrait(fov: number, aspect: number): number {
  if (aspect >= 1) return fov;
  const half = Math.atan(Math.tan(THREE.MathUtils.degToRad(fov / 2)) / Math.max(aspect, 0.01));
  return Math.min(72, THREE.MathUtils.radToDeg(half * 2));
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
