import * as THREE from 'three';
import type Sizes from './utils/Sizes';

/**
 * Home view (analysis section 4.4, changed for the wider three-wall room):
 * straight on from the open front (theta 0), 18 degrees above level
 * (phi 0.4 pi), close enough that the room's outer edges touch the sides of
 * the view. On screens wider than about 3:2 the tops of the 8-unit walls run
 * off the top edge; the floor stays in view.
 */
export const HOME_VIEW = {
  radius: 29.2,
  phi: 0.4 * Math.PI,
  theta: 0,
  target: new THREE.Vector3(0, 3, 0),
} as const;

const NEAR = 0.1;
const FAR = 150;

/**
 * 20 degrees vertically on wide screens. On narrower ones (below about 1.6:1)
 * it widens so the view always spans at least 34.8 degrees across, which is
 * exactly the 14-unit room's width from the home distance (edge to edge).
 * At most 70 (a portrait phone needs about 68).
 */
const MIN_HALF_WIDTH = THREE.MathUtils.degToRad(17.4);
export function fovForAspect(aspect: number): number {
  const widened = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(MIN_HALF_WIDTH) / Math.max(aspect, 0.01)));
  return Math.min(70, Math.max(20, widened));
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
