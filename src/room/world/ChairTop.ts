import type * as THREE from 'three';

/** Slow idle swivel of the chair seat (analysis section 5): about ±28.6°, 12.6 s period. */
export default class ChairTop {
  private pivot: THREE.Object3D;
  private base: number;

  /** `model` is the chairTop group; its single child node sits on the swivel axis. */
  constructor(model: THREE.Group) {
    this.pivot = model.children[0] ?? model;
    this.base = this.pivot.rotation.y;
  }

  update(elapsedMs: number): void {
    this.pivot.rotation.y = this.base + Math.sin(elapsedMs * 0.0005) * 0.5;
  }
}
