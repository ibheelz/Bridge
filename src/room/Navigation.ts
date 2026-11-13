import * as THREE from 'three';
import normalizeWheel from 'normalize-wheel';
import type Camera from './Camera';
import { HOME_VIEW } from './Camera';
import type Sizes from './utils/Sizes';
import type Time from './utils/Time';
import { EVENTS } from './events';

/** Analysis section 4.4. */
const SMOOTHING = 0.005; // per millisecond
const LIMITS = {
  // Zooming out stops a little past the home view (radius 28.7), so the room never sits small in empty space.
  radius: { min: 10, max: 32 },
  // Three walls now: orbit stays in front, and not so low that a side wall hides the room.
  phi: { min: 0.01, max: 0.42 * Math.PI },
  theta: { min: -0.22 * Math.PI, max: 0.22 * Math.PI },
  target: {
    x: { min: -6, max: 6 },
    y: { min: 1, max: 6 },
    z: { min: -4, max: 4 },
  },
} as const;
const ORBIT_SENSITIVITY = 1;
const PAN_PER_PIXEL = 0.01;
const ZOOM_PER_PIXEL = 0.01;
const PINCH_FACTOR = 3;
const TAP_MAX_MS = 250;
const TAP_MAX_TRAVEL = 12;
const DOUBLE_TAP_GAP_MS = 350;
const ZOOMED_IN_BELOW = HOME_VIEW.radius - 3;
const ZOOMED_OUT_FROM = HOME_VIEW.radius - 0.4;

export const ZOOM_EVENT = EVENTS.zoom;

export interface NavigationState {
  spherical: THREE.Spherical;
  target: THREE.Vector3;
}

interface Pair<T> {
  value: T;
  smoothed: T;
}

const clamp = THREE.MathUtils.clamp;

/**
 * Orbit, pan and zoom. Input writes the `value` side; every frame the
 * `smoothed` side eases toward it and drives `camera.modes.default.instance`.
 */
export default class Navigation {
  spherical: Pair<THREE.Spherical>;
  target: Pair<THREE.Vector3>;
  /** Cinematic modes set this; input is ignored while it is true. */
  suspended = false;
  zoomedIn = false;

  private camera: Camera;
  private sizes: Sizes;
  private time: Time;
  private element: HTMLElement;

  private pointers = new Map<number, { x: number; y: number }>();
  /** True when a mouse drag pans instead of orbiting. */
  private mousePan = false;
  private tap = { start: 0, x: 0, y: 0, travel: 0, valid: false, last: 0 };

  private up = new THREE.Vector3();
  private left = new THREE.Vector3();
  private offset = new THREE.Vector3();

  constructor(camera: Camera, sizes: Sizes, time: Time, element: HTMLElement) {
    this.camera = camera;
    this.sizes = sizes;
    this.time = time;
    this.element = element;

    const home = () => new THREE.Spherical(HOME_VIEW.radius, HOME_VIEW.phi, HOME_VIEW.theta);
    this.spherical = { value: home(), smoothed: home() };
    this.target = { value: HOME_VIEW.target.clone(), smoothed: HOME_VIEW.target.clone() };

    element.addEventListener('pointerdown', this.onPointerDown);
    element.addEventListener('pointermove', this.onPointerMove);
    element.addEventListener('pointerup', this.onPointerUp);
    element.addEventListener('pointercancel', this.onPointerCancel);
    element.addEventListener('lostpointercapture', this.onPointerCancel);
    element.addEventListener('mousedown', this.onMouseDown);
    element.addEventListener('dblclick', this.onDoubleClick);
    element.addEventListener('wheel', this.onWheel, { passive: false });
    element.addEventListener('touchmove', this.onTouchMove, { passive: false });
    window.addEventListener('contextmenu', this.onContextMenu);

    this.apply();
  }

  // --- public API ---------------------------------------------------------

  /** Positive `pixels` moves the camera away. */
  zoom(pixels: number): void {
    const s = this.spherical.value;
    s.radius = clamp(s.radius + pixels * ZOOM_PER_PIXEL, LIMITS.radius.min, LIMITS.radius.max);
  }

  reset(): void {
    this.spherical.value.set(HOME_VIEW.radius, HOME_VIEW.phi, HOME_VIEW.theta);
    this.target.value.copy(HOME_VIEW.target);
  }

  captureState(): NavigationState {
    return { spherical: this.spherical.value.clone(), target: this.target.value.clone() };
  }

  /** `immediate` skips the ease, so a cinematic mode can hand back exactly. */
  restoreState(state: NavigationState, immediate = true): void {
    this.spherical.value.copy(state.spherical);
    this.target.value.copy(state.target);
    if (immediate) {
      this.spherical.smoothed.copy(state.spherical);
      this.target.smoothed.copy(state.target);
      this.apply();
    }
  }

  update(): void {
    const t = Math.min(1, SMOOTHING * this.time.delta);
    const sv = this.spherical.value;
    const ss = this.spherical.smoothed;
    ss.radius += (sv.radius - ss.radius) * t;
    ss.phi += (sv.phi - ss.phi) * t;
    ss.theta += (sv.theta - ss.theta) * t;
    this.target.smoothed.lerp(this.target.value, t);
    this.apply();

    if (!this.zoomedIn && ss.radius < ZOOMED_IN_BELOW) this.setZoomedIn(true);
    else if (this.zoomedIn && ss.radius >= ZOOMED_OUT_FROM) this.setZoomedIn(false);
  }

  destroy(): void {
    const el = this.element;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointermove', this.onPointerMove);
    el.removeEventListener('pointerup', this.onPointerUp);
    el.removeEventListener('pointercancel', this.onPointerCancel);
    el.removeEventListener('lostpointercapture', this.onPointerCancel);
    el.removeEventListener('mousedown', this.onMouseDown);
    el.removeEventListener('dblclick', this.onDoubleClick);
    el.removeEventListener('wheel', this.onWheel);
    el.removeEventListener('touchmove', this.onTouchMove);
    window.removeEventListener('contextmenu', this.onContextMenu);
    this.pointers.clear();
  }

  // --- internals ----------------------------------------------------------

  private apply(): void {
    const camera = this.camera.modes.default.instance;
    this.offset.setFromSpherical(this.spherical.smoothed);
    camera.position.copy(this.target.smoothed).add(this.offset);
    camera.lookAt(this.target.smoothed);
  }

  private setZoomedIn(zoomedIn: boolean): void {
    this.zoomedIn = zoomedIn;
    window.dispatchEvent(new CustomEvent(ZOOM_EVENT, { detail: { zoomedIn } }));
  }

  private orbit(dx: number, dy: number): void {
    const side = Math.max(1, this.sizes.smallestSide);
    const s = this.spherical.value;
    s.theta = clamp(s.theta - (dx / side) * ORBIT_SENSITIVITY, LIMITS.theta.min, LIMITS.theta.max);
    s.phi = clamp(s.phi - (dy / side) * ORBIT_SENSITIVITY, LIMITS.phi.min, LIMITS.phi.max);
  }

  /** Moves the target along the camera's left/up so the room follows the pointer. */
  private pan(dx: number, dy: number): void {
    const q = this.camera.modes.default.instance.quaternion;
    this.left.set(-1, 0, 0).applyQuaternion(q);
    this.up.set(0, 1, 0).applyQuaternion(q);
    const t = this.target.value;
    t.addScaledVector(this.left, dx * PAN_PER_PIXEL).addScaledVector(this.up, dy * PAN_PER_PIXEL);
    t.x = clamp(t.x, LIMITS.target.x.min, LIMITS.target.x.max);
    t.y = clamp(t.y, LIMITS.target.y.min, LIMITS.target.y.max);
    t.z = clamp(t.z, LIMITS.target.z.min, LIMITS.target.z.max);
  }

  /** Midpoint and spread of the first two active pointers. */
  private pinchInfo(): { x: number; y: number; dist: number } {
    const [a, b] = [...this.pointers.values()];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, dist: Math.hypot(a.x - b.x, a.y - b.y) };
  }

  private onPointerDown = (e: PointerEvent): void => {
    if (this.suspended) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      this.element.setPointerCapture(e.pointerId);
    } catch {
      // Pointer already gone; the drag just will not follow outside the element.
    }

    if (e.pointerType === 'mouse') {
      this.mousePan = e.button !== 0 || e.altKey || e.ctrlKey || e.shiftKey;
      return;
    }
    this.mousePan = false;
    if (this.pointers.size === 1) {
      this.tap.start = performance.now();
      this.tap.x = e.clientX;
      this.tap.y = e.clientY;
      this.tap.travel = 0;
      this.tap.valid = true;
    } else {
      this.tap.valid = false;
      this.tap.last = 0;
    }
  };

  private onPointerMove = (e: PointerEvent): void => {
    const pointer = this.pointers.get(e.pointerId);
    if (!pointer) return;
    if (this.suspended) {
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      return;
    }

    if (this.pointers.size >= 2) {
      const before = this.pinchInfo();
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      const after = this.pinchInfo();
      this.pan(after.x - before.x, after.y - before.y);
      this.zoom((before.dist - after.dist) * PINCH_FACTOR);
      return;
    }

    const dx = e.clientX - pointer.x;
    const dy = e.clientY - pointer.y;
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    if (this.tap.valid) {
      this.tap.travel = Math.max(
        this.tap.travel,
        Math.hypot(e.clientX - this.tap.x, e.clientY - this.tap.y),
      );
    }
    if (this.mousePan) this.pan(dx, dy);
    else this.orbit(dx, dy);
  };

  private onPointerUp = (e: PointerEvent): void => {
    if (!this.pointers.delete(e.pointerId)) return;
    if (e.pointerType === 'mouse' || this.suspended || !this.tap.valid) return;
    this.tap.valid = false;

    const now = performance.now();
    const isTap = now - this.tap.start < TAP_MAX_MS && this.tap.travel < TAP_MAX_TRAVEL;
    if (!isTap) {
      this.tap.last = 0;
    } else if (this.tap.last && now - this.tap.last < DOUBLE_TAP_GAP_MS) {
      this.tap.last = 0;
      this.reset();
    } else {
      this.tap.last = now;
    }
  };

  private onPointerCancel = (e: PointerEvent): void => {
    this.pointers.delete(e.pointerId);
    this.tap.valid = false;
  };

  /** Stops middle-button autoscroll. */
  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 1) e.preventDefault();
  };

  private onDoubleClick = (): void => {
    if (!this.suspended) this.reset();
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.suspended) return;
    this.zoom(normalizeWheel(e).pixelY);
  };

  private onTouchMove = (e: TouchEvent): void => {
    if (e.cancelable) e.preventDefault();
  };

  private onContextMenu = (e: Event): void => {
    e.preventDefault();
  };
}
