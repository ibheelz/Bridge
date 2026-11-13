import * as THREE from 'three';
import type Camera from '../Camera';
import { fovForAspect } from '../Camera';
import type Navigation from '../Navigation';
import { widenForPortrait } from '../utils/screenGeo';
import type Sizes from '../utils/Sizes';
import type Time from '../utils/Time';
import type Interactions from '../world/Interactions';

export type FlyPhase = 'idle' | 'entering' | 'active' | 'leaving';

export interface FlyModeOptions {
  camera: Camera;
  navigation: Navigation;
  sizes: Sizes;
  time: Time;
  interactions: Interactions;
  element: HTMLElement;
  /** False while another mode has the camera. */
  canStart: () => boolean;
}

export interface FlyConfig {
  /** Where the camera ends up, and what it looks at. */
  position: THREE.Vector3;
  target: THREE.Vector3;
  /** Field of view on a landscape screen, in degrees; widened on portrait. */
  fov: number;
  enterMs: number;
  exitMs: number;
  /** Small sway while the camera holds: sideways along `right`, and up/down. */
  drift?: {
    right: THREE.Vector3;
    x: { speed: number; amount: number };
    y: { speed: number; amount: number };
  };
}

/** A click only leaves once the mode is this old, so the click that started it does not count. */
const CLICK_GUARD_MS = 600;

const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Shared part of the laptop and TV modes (analysis section 8): fly the camera
 * to a fixed pose, hold it, and fly back to wherever navigation has the view.
 * `Esc` or a click on the room leaves.
 *
 * While the phase is not `idle` this class owns `camera.instance`
 * (`camera.locked`), navigation is suspended and interactions are off.
 */
export default abstract class FlyMode {
  phase: FlyPhase = 'idle';

  protected camera: Camera;
  protected navigation: Navigation;
  protected sizes: Sizes;
  protected time: Time;
  protected config: FlyConfig;
  /** 0 to 1 through the current `entering` or `leaving` move, not eased. */
  protected progress = 0;

  private interactions: Interactions;
  private element: HTMLElement;
  private canStart: () => boolean;
  private phaseTime = 0;
  private modeTime = 0;

  private fromPosition = new THREE.Vector3();
  private fromTarget = new THREE.Vector3();
  private fromFov = 20;
  private position = new THREE.Vector3();
  private target = new THREE.Vector3();

  constructor(options: FlyModeOptions, config: FlyConfig) {
    this.camera = options.camera;
    this.navigation = options.navigation;
    this.sizes = options.sizes;
    this.time = options.time;
    this.interactions = options.interactions;
    this.element = options.element;
    this.canStart = options.canStart;
    this.config = config;

    window.addEventListener('keydown', this.onKeyDown);
    this.element.addEventListener('click', this.onClick);
  }

  get active(): boolean {
    return this.phase !== 'idle';
  }

  /** Fly in. Ignored unless the room is idle. */
  enter(): void {
    if (this.phase !== 'idle' || !this.canStart()) return;
    this.navigation.suspended = true;
    this.interactions.enabled = false;
    this.interactions.release();
    this.camera.locked = true;

    this.modeTime = 0;
    this.fromPosition.copy(this.camera.instance.position);
    this.fromTarget.copy(this.navigation.target.smoothed);
    this.fromFov = this.camera.instance.fov;
    this.target.copy(this.fromTarget);
    this.setPhase('entering');
    this.onEnter();
  }

  /** Fly back out; works mid-flight too. */
  exit(): void {
    if (this.phase !== 'entering' && this.phase !== 'active') return;
    this.fromPosition.copy(this.camera.instance.position);
    this.fromTarget.copy(this.target);
    this.fromFov = this.camera.instance.fov;
    this.setPhase('leaving');
    this.onExit();
  }

  // Hooks for the subclasses.
  protected onEnter(): void {}
  /** The camera has reached the pose. */
  protected onArrive(): void {}
  protected onExit(): void {}
  /** The camera is back and navigation has it again. */
  protected onLeft(): void {}
  /** Every frame the mode is not idle, after the camera was placed. */
  protected onFrame(): void {}

  private setPhase(phase: FlyPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
    this.progress = 0;
  }

  private setPose(position: THREE.Vector3, target: THREE.Vector3, fov: number): void {
    const camera = this.camera.instance;
    camera.position.copy(position);
    camera.lookAt(target);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }

  private tween(toPosition: THREE.Vector3, toTarget: THREE.Vector3, toFov: number): void {
    const t = easeInOutCubic(this.progress);
    this.position.lerpVectors(this.fromPosition, toPosition, t);
    this.target.lerpVectors(this.fromTarget, toTarget, t);
    this.setPose(this.position, this.target, THREE.MathUtils.lerp(this.fromFov, toFov, t));
  }

  /** Called every frame after `camera.update()` and before the render. */
  update(): void {
    if (this.phase === 'idle') return;
    const { config } = this;
    this.phaseTime += this.time.delta;
    this.modeTime += this.time.delta;
    // Recomputed every frame, so a resize or a rotated phone keeps the framing.
    const modeFov = widenForPortrait(config.fov, this.sizes.aspect);

    switch (this.phase) {
      case 'entering':
        this.progress = Math.min(1, this.phaseTime / config.enterMs);
        this.tween(config.position, config.target, modeFov);
        if (this.progress >= 1) {
          this.setPhase('active');
          this.progress = 1;
          this.onArrive();
        }
        break;

      case 'active': {
        this.progress = 1;
        this.position.copy(config.position);
        const drift = config.drift;
        if (drift) {
          const t = this.time.elapsed;
          this.position.addScaledVector(drift.right, Math.sin(t * drift.x.speed) * drift.x.amount);
          this.position.y += Math.cos(t * drift.y.speed) * drift.y.amount;
        }
        this.target.copy(config.target);
        this.setPose(this.position, this.target, modeFov);
        break;
      }

      case 'leaving': {
        this.progress = Math.min(1, this.phaseTime / config.exitMs);
        const home = this.camera.modes[this.camera.mode].instance;
        this.tween(home.position, this.navigation.target.smoothed, fovForAspect(this.sizes.aspect));
        if (this.progress >= 1) {
          this.onFrame();
          this.camera.locked = false;
          this.camera.resize(); // puts the home field of view back
          this.camera.update();
          this.navigation.suspended = false;
          this.interactions.enabled = true;
          this.setPhase('idle');
          this.onLeft();
          return;
        }
        break;
      }
    }
    this.onFrame();
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape' || e.repeat) return;
    if (this.phase !== 'entering' && this.phase !== 'active') return;
    e.preventDefault();
    this.exit();
  };

  /** Touch has no Esc: a click on the room leaves. */
  private onClick = (): void => {
    if (this.modeTime >= CLICK_GUARD_MS) this.exit();
  };

  destroy(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    this.element.removeEventListener('click', this.onClick);
  }
}
