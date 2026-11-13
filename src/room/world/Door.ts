import * as THREE from 'three';
import { EVENTS } from '../events';

const DURATION_MS = 900;
/** Spec default (analysis section 5). A RoomSource can override it, sign included. */
export const DOOR_OPEN_ANGLE = THREE.MathUtils.degToRad(25);

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * The door swings between closed and `openAngle` when `toggle()` is called or
 * the `kai:door-toggle` window event fires. The whiteboard screen is attached
 * to the door's pivot so it swings with it.
 */
export default class Door {
  open = false;

  private pivot: THREE.Object3D;
  private base: number;
  private openAngle: number;
  /** 0 = closed, 1 = open, before easing. */
  private progress = 0;
  private from = 0;
  private to = 0;
  private elapsed = DURATION_MS;

  /** `model` is the door group; its single child node sits on the hinge. */
  constructor(model: THREE.Group, whiteboard: THREE.Mesh, openAngle = DOOR_OPEN_ANGLE) {
    this.pivot = model.children.length === 1 ? model.children[0] : model;
    this.base = this.pivot.rotation.y;
    this.openAngle = openAngle;
    this.pivot.attach(whiteboard); // keeps the board's world transform

    window.addEventListener(EVENTS.doorToggle, this.toggle);
  }

  /** The meshes that count as "the door" for raycasting (the whiteboard included). */
  get meshes(): THREE.Mesh[] {
    const meshes: THREE.Mesh[] = [];
    this.pivot.traverse((child) => {
      if (child instanceof THREE.Mesh) meshes.push(child);
    });
    return meshes;
  }

  toggle = (): void => {
    this.open = !this.open;
    // Start from wherever the door is, so a toggle mid-swing turns around smoothly.
    this.from = this.progress;
    this.to = this.open ? 1 : 0;
    this.elapsed = 0;
  };

  update(deltaMs: number): void {
    if (this.elapsed >= DURATION_MS) return;
    this.elapsed = Math.min(DURATION_MS, this.elapsed + deltaMs);
    const t = easeInOutCubic(this.elapsed / DURATION_MS);
    this.progress = this.from + (this.to - this.from) * t;
    this.pivot.rotation.y = this.base + this.openAngle * this.progress;
  }

  destroy(): void {
    window.removeEventListener(EVENTS.doorToggle, this.toggle);
  }
}
