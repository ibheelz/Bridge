import * as THREE from 'three';
import type Sizes from './utils/Sizes';

/**
 * Home view (analysis section 4.4, changed for the wider three-wall room):
 * straight on from the open front (theta 0) instead of from the corner, and
 * a little further back so the 14-unit width fits.
 */
export const HOME_VIEW = {
  radius: 46,
  phi: 0.35 * Math.PI,
  theta: 0,
  target: new THREE.Vector3(0, 2, 0),
} as const;

const NEAR = 0.1;
const FAR = 150;

/**
 * 20 degrees vertically on wide screens. On narrower ones (below about 1.06:1)
 * it widens so the view always spans at least 21.2 degrees across, which is
 * what the 14-unit room needs at the home distance. At most 55.
 */
const MIN_HALF_WIDTH = THREE.MathUtils.degToRad(10.6);
export function fovForAspect(aspect: number): number {
  const widened = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(MIN_HALF_WIDTH) / Math.max(aspect, 0.01)));
  return Math.min(55, Math.max(20, widened));
}

export type CameraMode = 'default';

/**
 * `instance` is the camera that renders. Each frame it copies position and
 * orientation from the active mode camera. Cinematic modes (later steps) write
 * `instance` directly while `locked` is true.
 */
export default class Camera {
  instance: THREE.PerspectiveCamera;
  modes: Record<CameraMode, { instance: THREE.PerspectiveCamera }>;
  mode: CameraMode = 'default';
  /** When true, update() leaves `instance` alone. */
  locked = false;

  private sizes: Sizes;

  constructor(sizes: Sizes, scene: THREE.Scene) {
    this.sizes = sizes;

    const fov = fovForAspect(sizes.aspect);
    this.instance = new THREE.PerspectiveCamera(fov, sizes.aspect, NEAR, FAR);
    this.instance.rotation.reorder('YXZ');
    scene.add(this.instance);

    const home = new THREE.PerspectiveCamera(fov, sizes.aspect, NEAR, FAR);
    home.rotation.reorder('YXZ');
    home.position
      .setFromSphericalCoords(HOME_VIEW.radius, HOME_VIEW.phi, HOME_VIEW.theta)
      .add(HOME_VIEW.target);
    home.lookAt(HOME_VIEW.target);
    this.modes = { default: { instance: home } };

    this.update();
  }

  resize(): void {
    const aspect = this.sizes.aspect;
    const fov = fovForAspect(aspect);
    const cameras = [this.instance, ...Object.values(this.modes).map((m) => m.instance)];
    for (const camera of cameras) {
      camera.aspect = aspect;
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
  }

  update(): void {
    if (this.locked) return;
    const source = this.modes[this.mode].instance;
    this.instance.position.copy(source.position);
    this.instance.quaternion.copy(source.quaternion);
    this.instance.updateMatrixWorld();
  }
}
