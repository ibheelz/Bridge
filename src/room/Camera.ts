import * as THREE from 'three';
import type Sizes from './utils/Sizes';

/** Home view (analysis section 4.4). Navigation takes these over in step 2. */
export const HOME_VIEW = {
  radius: 43,
  phi: 0.35 * Math.PI,
  theta: 0.25 * Math.PI,
  target: new THREE.Vector3(0, 2, 0),
} as const;

const NEAR = 0.1;
const FAR = 150;

/** 20 degrees on landscape; widened on portrait so the room still fits. */
export function fovForAspect(aspect: number): number {
  if (aspect >= 1) return 20;
  const widened = 2 * Math.atan((Math.tan(THREE.MathUtils.degToRad(10)) / aspect) * 0.95);
  return Math.min(55, THREE.MathUtils.radToDeg(widened));
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
