import * as THREE from 'three';
import type Sizes from './utils/Sizes';

/**
 * Home view (analysis section 4.4, changed for the wider three-wall room):
 * straight on from the open front (theta 0), 18 degrees above level
 * (phi 0.4 pi), close enough that the front ends of the side walls sit just
 * outside the view (about 12% past each edge), so no wall edge shows on load.
 * On wide screens the wall tops and the front strip of floor are cropped.
 */
export const HOME_VIEW = {
  radius: 24.2,
  phi: 0.4 * Math.PI,
  theta: 0,
  target: new THREE.Vector3(0, 3, 0),
} as const;

const NEAR = 0.1;
const FAR = 150;

/**
 * The view always spans 34.8 degrees across, whatever the screen shape: the
 * vertical angle follows from the aspect (20 at 16:9, less on ultrawide,
 * more on narrower screens, at most 70; a portrait phone needs about 68).
 * So every screen crops the room's sides the same way.
 */
const HALF_WIDTH = THREE.MathUtils.degToRad(17.4);
export function fovForAspect(aspect: number): number {
  const fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(HALF_WIDTH) / Math.max(aspect, 0.01)));
  return Math.min(70, fov);
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
