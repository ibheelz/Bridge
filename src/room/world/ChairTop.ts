import type * as THREE from 'three';
import { prefersReducedMotion } from '../utils/motion';

/** Slow idle swivel of the chair seat (analysis section 5): about ±28.6°, 12.6 s period. */
export default class ChairTop {
  private pivot: THREE.Object3D;
  private base: number;

  /** `model` is the chairTop group; its single child node sits on the swivel axis. */
  constructor(model: THREE.Group) {
    this.pivot = model.children[0] ?? model;
    this.base = this.pivot.rotation.y;
  }

  /** Holds still at its rest angle with reduced motion. */
  update(elapsedMs: number): void {
    if (prefersReducedMotion()) {
      this.pivot.rotation.y = this.base;
      return;
    }
    this.pivot.rotation.y = this.base + Math.sin(elapsedMs * 0.0005) * 0.5;
  }
}
