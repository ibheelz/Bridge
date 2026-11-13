import type * as THREE from 'three';
import { prefersReducedMotion } from '../utils/motion';

/**
 * Slow idle swivel of the chair seat (analysis section 5): about ±28.6°, 12.6 s period.
 * Every child node of the group is a seat on its own swivel axis; with two
 * (the placeholder's mirrored desks) the second turns the opposite way.
 */
export default class ChairTop {
  private seats: { pivot: THREE.Object3D; base: number; sign: number }[];

  constructor(model: THREE.Group) {
    const pivots = model.children.length > 0 ? model.children : [model];
    this.seats = pivots.map((pivot, i) => ({ pivot, base: pivot.rotation.y, sign: i % 2 === 0 ? 1 : -1 }));
  }

  /** Holds still at its rest angle with reduced motion. */
  update(elapsedMs: number): void {
    const swing = prefersReducedMotion() ? 0 : Math.sin(elapsedMs * 0.0005) * 0.5;
    for (const seat of this.seats) seat.pivot.rotation.y = seat.base + seat.sign * swing;
  }
}
