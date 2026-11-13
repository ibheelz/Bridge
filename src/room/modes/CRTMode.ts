import * as THREE from 'three';
import type Camera from '../Camera';
import { HOME_VIEW, fovForAspect } from '../Camera';
import { COMPUTER_SCREENS, type ComputerId, type ScreenName } from '../assets';
import { EVENTS, emit, type ComputerDetail, type CrtModeDetail, type CrtPhase } from '../events';
import type Navigation from '../Navigation';
import { fovToFrame, getScreenGeo } from '../utils/screenGeo';
import type Sizes from '../utils/Sizes';
import type Time from '../utils/Time';
import type Interactions from '../world/Interactions';
import BiosBoot from '../world/screens/BiosBoot';
import type World from '../world/World';
import { flightMs } from '../utils/motion';

/** Analysis section 8.1. Durations in milliseconds. */
const POWERING_MS = 320;
const PUSHING_MS = 2600;
const LIGHTS_ROOM_MS = 140;
const LIGHTS_CRT_MS = 110;
const BLACKHOLD_MS = 500;
const ABORTING_MS = 900;
const ARRIVE_WAIT_MS = 120;
const ARRIVE_MS = 900;
const ARRIVE_PULL_MS = 2600;
const SCREEN_ON_AFTER_MS = 5000;
/** A click only skips or leaves once the mode is this old, so the click that started it does not count. */
const CLICK_GUARD_MS = 600;

/** Camera poses, relative to the CRT screen. */
const PUSH = { distance: 3.6, right: 0.9, up: 1.45, frame: 2.45 } as const;
const CLOSE = { distance: 0.95, frame: 0.9 } as const;
const DRIFT = { x: { speed: 0.0007, amount: 0.012 }, y: { speed: 0.0005, amount: 0.0072 } } as const;

/** Boot canvas height in pixels; the width follows the monitor's aspect. */
const BOOT_HEIGHT = 768;

/** The CRT glass while the page arrives from the portfolio. */
const ARRIVAL_SCREEN = '#0a0f0c';
const POWERDOWN_HASH = '#powerdown';
/** Which computer the visitor left through, so the arrival comes back to the same one. */
const LAST_COMPUTER_KEY = 'bridge:computer';

function lastComputer(): ComputerId {
  try {
    return window.sessionStorage.getItem(LAST_COMPUTER_KEY) === 'right' ? 'right' : 'left';
  } catch {
    return 'left';
  }
}

function rememberComputer(id: ComputerId): void {
  try {
    window.sessionStorage.setItem(LAST_COMPUTER_KEY, id);
  } catch {
    // Not remembered: the arrival then uses the left computer.
  }
}

export interface CRTModeOptions {
  camera: Camera;
  navigation: Navigation;
  sizes: Sizes;
  time: Time;
  world: World;
  interactions: Interactions;
  element: HTMLElement;
  /** Which computer this instance runs; one CRTMode per computer. */
  computer: ComputerId;
  /** Where the computer leads. */
  destination: string;
  /** False while another mode has the camera. */
  canStart?: () => boolean;
}

const easeInOutCubic = (t: number): number => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Clicking the computer (analysis section 8.1): the CRT boots, the camera
 * pushes in, the room goes dark and the page changes to the portfolio.
 * Coming back with `#powerdown` plays the arrival: close on the dark screen,
 * then a pull back to the view the room normally opens with.
 *
 * While a phase other than `idle` runs, this class owns `camera.instance`
 * (`camera.locked`), navigation is suspended and interactions are off.
 * Every phase change is broadcast as `kai:crtmode {phase}`.
 */
export default class CRTMode {
  phase: CrtPhase = 'idle';

  private camera: Camera;
  private navigation: Navigation;
  private sizes: Sizes;
  private time: Time;
  private world: World;
  private interactions: Interactions;
  private element: HTMLElement;
  private destination: string;
  private canStart: () => boolean;
  readonly computer: ComputerId;
  private screenName: ScreenName;
  private screen: THREE.Mesh;
  /** Width over height of the monitor, so the boot canvas is not stretched (ultrawide left, 16:9 right). */
  private screenAspect: number;

  /** Time spent in the current phase, and since the mode left `idle`. */
  private phaseTime = 0;
  private modeTime = 0;
  private boot: BiosBoot | null = null;
  private overlay: HTMLElement | null;
  private prefetch: HTMLLinkElement | null = null;
  private screenOnTimer = 0;
  private leaveFrame = 0;

  private screenCenter: THREE.Vector3;
  private screenSide: number;
  private pushPosition: THREE.Vector3;
  private closePosition: THREE.Vector3;
  private right: THREE.Vector3;

  /** Pose the current move starts from. */
  private fromPosition = new THREE.Vector3();
  private fromTarget = new THREE.Vector3();
  private fromFov = 20;
  private position = new THREE.Vector3();
  private target = new THREE.Vector3();
  private raycaster = new THREE.Raycaster();
  private ndc = new THREE.Vector2();

  constructor(options: CRTModeOptions) {
    this.camera = options.camera;
    this.navigation = options.navigation;
    this.sizes = options.sizes;
    this.time = options.time;
    this.world = options.world;
    this.interactions = options.interactions;
    this.element = options.element;
    this.destination = options.destination;
    this.canStart = options.canStart ?? (() => true);
    this.overlay = document.querySelector<HTMLElement>('.blackout');
    this.computer = options.computer;
    this.screenName = COMPUTER_SCREENS[options.computer];
    const screen = this.world.computers[options.computer];
    if (!screen) throw new Error(`CRTMode: this room has no ${options.computer} computer`);
    this.screen = screen;

    const geo = getScreenGeo(screen, HOME_VIEW.target);
    const diagonal = geo.size.length();
    // The screen faces along x or z; its width is the larger horizontal extent.
    this.screenAspect = THREE.MathUtils.clamp(Math.max(geo.size.x, geo.size.z) / Math.max(geo.size.y, 0.01), 1, 3);
    this.screenCenter = geo.center;
    this.screenSide = Math.max(geo.size.x, geo.size.y, geo.size.z);
    // The right-hand desk mirrors the left one, so its sideways offset is mirrored too.
    this.right = geo.right.clone().multiplyScalar(options.computer === 'right' ? -1 : 1);
    this.pushPosition = geo.center
      .clone()
      .addScaledVector(geo.normal, diagonal * PUSH.distance)
      .addScaledVector(this.right, PUSH.right);
    this.pushPosition.y += PUSH.up;
    this.closePosition = geo.center.clone().addScaledVector(geo.normal, diagonal * CLOSE.distance);

    window.addEventListener(EVENTS.computerActivate, this.onActivate);
    window.addEventListener(EVENTS.powerdownArrive, this.onArrive);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('pageshow', this.onPageShow);
    this.element.addEventListener('click', this.onClick);

    if (window.location.hash === POWERDOWN_HASH && lastComputer() === this.computer) this.arrive();
  }

  get active(): boolean {
    return this.phase !== 'idle';
  }

  // --- Entering and leaving ------------------------------------------------

  /** Start the boot. Ignored unless the room is idle. */
  start(): void {
    if (this.phase !== 'idle' || !this.canStart()) return;
    this.takeOver();
    this.modeTime = 0;
    this.captureFrom();
    this.target.copy(this.fromTarget);

    try {
      this.boot = new BiosBoot(Math.round(BOOT_HEIGHT * this.screenAspect), BOOT_HEIGHT);
      this.world.liveScreens.set(this.screenName, this.boot);
    } catch (error) {
      // No 2D canvas: the camera move and the page change still happen.
      console.warn('[room] the CRT boot screen could not be built:', error);
      this.boot = null;
    }

    if (!this.prefetch) {
      this.prefetch = document.createElement('link');
      this.prefetch.rel = 'prefetch';
      this.prefetch.href = this.destination;
      document.head.appendChild(this.prefetch);
    }
    this.setPhase('powering');
  }

  /** Jump to the black screen and change page. */
  skip(): void {
    if (!this.interruptible) return;
    this.world.setDim(0, 0, this.screen);
    this.setPhase('black');
  }

  /** Fly back to the room and carry on as if nothing happened. */
  abort(): void {
    if (!this.interruptible) return;
    this.captureFrom();
    this.screenOff();
    this.setPhase('aborting');
  }

  /** Play the arrival from the portfolio. Also recovers a page restored while black. */
  arrive(): void {
    if (this.phase !== 'idle' && this.phase !== 'black') return;
    if (this.phase === 'idle' && !this.canStart()) return;
    cancelAnimationFrame(this.leaveFrame);
    window.clearTimeout(this.screenOnTimer);
    this.takeOver();
    this.world.setDim(1, 1, this.screen);
    this.screenOff(ARRIVAL_SCREEN);
    this.overlay?.classList.add('is-on');
    this.setPose(this.closePosition, this.screenCenter, this.closeFov());
    this.setPhase('arrivewait');
  }

  private get interruptible(): boolean {
    return this.phase === 'powering' || this.phase === 'pushing' || this.phase === 'booting';
  }

  private takeOver(): void {
    this.navigation.suspended = true;
    this.interactions.enabled = false;
    this.interactions.release();
    this.camera.locked = true;
  }

  private handBack(): void {
    this.camera.locked = false;
    this.camera.resize(); // puts the home field of view back
    this.camera.update();
    this.navigation.suspended = false;
    this.interactions.enabled = true;
    this.setPhase('idle');
  }

  private screenOff(color?: string): void {
    this.boot = null; // disposed by Screens
    this.world.liveScreens.clear(this.screenName, color);
  }

  private setPhase(phase: CrtPhase): void {
    this.phase = phase;
    this.phaseTime = 0;
    const detail: CrtModeDetail = { phase };
    emit(EVENTS.crtMode, detail);
    if (phase === 'black') this.leave();
  }

  /** Cover the page in black, let that paint, then go. */
  private leave(): void {
    rememberComputer(this.computer);
    this.overlay?.classList.add('is-on');
    this.leaveFrame = requestAnimationFrame(() => {
      this.leaveFrame = requestAnimationFrame(() => {
        window.location.href = this.destination;
      });
    });
  }

  // --- Camera --------------------------------------------------------------

  private captureFrom(): void {
    const camera = this.camera.instance;
    this.fromPosition.copy(camera.position);
    this.fromFov = camera.fov;
    if (this.phase === 'idle') {
      this.fromTarget.copy(this.navigation.target.smoothed);
    } else {
      // Mid-move: carry on from the point the camera is looking at now.
      this.fromTarget.copy(this.target);
    }
  }

  /** Recomputed every frame, so a resize or a rotated phone keeps the framing. */
  private pushFov(): number {
    const distance = this.pushPosition.distanceTo(this.screenCenter);
    return fovToFrame(this.screenSide * PUSH.frame, distance, this.sizes.aspect);
  }

  private closeFov(): number {
    const distance = this.closePosition.distanceTo(this.screenCenter);
    return fovToFrame(this.screenSide * CLOSE.frame, distance, this.sizes.aspect);
  }

  private setPose(position: THREE.Vector3, target: THREE.Vector3, fov: number): void {
    const camera = this.camera.instance;
    this.target.copy(target);
    camera.position.copy(position);
    camera.lookAt(target);
    if (camera.fov !== fov) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }

  private tween(
    t: number,
    toPosition: THREE.Vector3,
    toTarget: THREE.Vector3,
    fromFov: number,
    toFov: number,
  ): void {
    this.position.lerpVectors(this.fromPosition, toPosition, t);
    this.target.lerpVectors(this.fromTarget, toTarget, t);
    this.setPose(this.position, this.target, THREE.MathUtils.lerp(fromFov, toFov, t));
  }

  /** The pushed-in pose with the small idle drift of the `booting` phase. */
  private holdPushed(): void {
    const t = this.time.elapsed;
    this.position
      .copy(this.pushPosition)
      .addScaledVector(this.right, Math.sin(t * DRIFT.x.speed) * DRIFT.x.amount);
    this.position.y += Math.cos(t * DRIFT.y.speed) * DRIFT.y.amount;
    this.setPose(this.position, this.screenCenter, this.pushFov());
  }

  /** Where navigation has the camera right now: the pose to return to. */
  private get homeCamera(): THREE.PerspectiveCamera {
    return this.camera.modes[this.camera.mode].instance;
  }

  // --- Frame ---------------------------------------------------------------

  /** Called every frame after `camera.update()` and before the render. */
  update(): void {
    if (this.phase === 'idle') return;
    const delta = this.time.delta;
    this.phaseTime += delta;
    this.modeTime += delta;
    const homeFov = fovForAspect(this.sizes.aspect);

    switch (this.phase) {
      case 'powering':
        this.setPose(this.fromPosition, this.fromTarget, homeFov);
        if (this.phaseTime >= POWERING_MS) this.setPhase('pushing');
        break;

      case 'pushing': {
        const t = easeInOutCubic(Math.min(1, this.phaseTime / flightMs(PUSHING_MS)));
        this.tween(t, this.pushPosition, this.screenCenter, homeFov, this.pushFov());
        if (this.phaseTime >= flightMs(PUSHING_MS)) this.setPhase('booting');
        break;
      }

      case 'booting':
        this.holdPushed();
        if (!this.boot || this.boot.done) this.setPhase('lightsout');
        break;

      case 'lightsout': {
        this.holdPushed();
        const room = 1 - Math.min(1, this.phaseTime / LIGHTS_ROOM_MS);
        const crt = 1 - THREE.MathUtils.clamp((this.phaseTime - LIGHTS_ROOM_MS) / LIGHTS_CRT_MS, 0, 1);
        this.world.setDim(room, crt, this.screen);
        if (this.phaseTime >= LIGHTS_ROOM_MS + LIGHTS_CRT_MS) this.setPhase('blackhold');
        break;
      }

      case 'blackhold':
        this.holdPushed();
        if (this.phaseTime >= BLACKHOLD_MS) this.setPhase('black');
        break;

      case 'black':
        break;

      case 'aborting': {
        const t = easeInOutCubic(Math.min(1, this.phaseTime / flightMs(ABORTING_MS)));
        this.tween(t, this.homeCamera.position, this.navigation.target.smoothed, this.fromFov, homeFov);
        if (this.phaseTime >= flightMs(ABORTING_MS)) this.handBack();
        break;
      }

      case 'arrivewait':
        this.setPose(this.closePosition, this.screenCenter, this.closeFov());
        if (this.phaseTime >= ARRIVE_WAIT_MS) {
          // The overlay fades with its CSS transition once the classes are gone.
          document.documentElement.classList.remove('is-powerdown');
          this.overlay?.classList.remove('is-on');
          if (window.location.hash === POWERDOWN_HASH) {
            history.replaceState(null, '', window.location.pathname + window.location.search);
          }
          this.setPhase('arrive');
        }
        break;

      case 'arrive':
        this.setPose(this.closePosition, this.screenCenter, this.closeFov());
        if (this.phaseTime >= ARRIVE_MS) {
          this.fromPosition.copy(this.closePosition);
          this.fromTarget.copy(this.screenCenter);
          this.setPhase('arrivepull');
        }
        break;

      case 'arrivepull': {
        const t = easeInOutCubic(Math.min(1, this.phaseTime / flightMs(ARRIVE_PULL_MS)));
        this.tween(t, this.homeCamera.position, this.navigation.target.smoothed, this.closeFov(), homeFov);
        if (this.phaseTime >= flightMs(ARRIVE_PULL_MS)) {
          this.handBack();
          this.screenOnTimer = window.setTimeout(() => {
            if (this.phase !== 'idle') return;
            this.world.liveScreens.clear(this.screenName);
            emit(EVENTS.crtScreenOn);
          }, SCREEN_ON_AFTER_MS);
        }
        break;
      }
    }
  }

  // --- Input ---------------------------------------------------------------

  /** No detail (the left label, the keyboard) means the left computer. */
  private onActivate = (event: Event): void => {
    const id = (event as CustomEvent<ComputerDetail | undefined>).detail?.id ?? 'left';
    if (id === this.computer) this.start();
  };

  private onArrive = (): void => {
    if (lastComputer() === this.computer) this.arrive();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (!this.interruptible || e.repeat) return;
    if (e.key === '2') {
      e.preventDefault();
      this.skip();
    } else if (e.key === 'Escape' || e.key === 'Delete') {
      e.preventDefault();
      this.abort();
    }
  };

  /** During the boot a click on the CRT skips it; a click anywhere else goes back. */
  private onClick = (e: MouseEvent): void => {
    if (!this.interruptible || this.modeTime < CLICK_GUARD_MS) return;
    const rect = this.element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.ndc.set(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.ndc, this.camera.instance);
    if (this.raycaster.intersectObject(this.screen, false).length > 0) this.skip();
    else this.abort();
  };

  /** Browser "back" from the portfolio can restore this page frozen on black. */
  private onPageShow = (e: PageTransitionEvent): void => {
    if (e.persisted && this.phase === 'black') this.arrive();
  };

  destroy(): void {
    window.removeEventListener(EVENTS.computerActivate, this.onActivate);
    window.removeEventListener(EVENTS.powerdownArrive, this.onArrive);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('pageshow', this.onPageShow);
    this.element.removeEventListener('click', this.onClick);
    cancelAnimationFrame(this.leaveFrame);
    window.clearTimeout(this.screenOnTimer);
    this.prefetch?.remove();
  }
}
