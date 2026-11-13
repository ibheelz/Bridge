import * as THREE from 'three';

/** Something a screen mesh can show. `Screens` owns the material and ticks this every frame. */
export interface ScreenContent {
  readonly texture: THREE.Texture;
  update(deltaMs: number): void;
  destroy(): void;
}

/** Screen meshes have glTF-style UVs (v = 0 at the top), so nothing is flipped on upload. */
export function prepareScreenTexture<T extends THREE.Texture>(texture: T): T {
  texture.flipY = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

/**
 * A screen drawn with Canvas 2D (analysis section 6).
 *
 * Subclasses advance their state in `step()` and set `dirty` when the picture
 * changed. The canvas is redrawn, and the texture re-uploaded, only when dirty
 * and at most once per `minInterval` (33 ms, a 30 fps cap).
 */
export abstract class CanvasScreen implements ScreenContent {
  readonly canvas: HTMLCanvasElement;
  readonly texture: THREE.CanvasTexture;
  readonly width: number;
  readonly height: number;

  protected ctx: CanvasRenderingContext2D;
  protected dirty = true;

  private minInterval: number;
  private sinceDraw = Infinity;

  constructor(width: number, height: number, minInterval = 33) {
    this.width = width;
    this.height = height;
    this.minInterval = minInterval;

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas is not available');
    this.ctx = ctx;

    this.texture = prepareScreenTexture(new THREE.CanvasTexture(this.canvas));
  }

  update(deltaMs: number): void {
    this.sinceDraw += deltaMs;
    this.step(deltaMs);
    if (!this.dirty || this.sinceDraw < this.minInterval) return;

    this.dirty = false;
    this.sinceDraw = 0;
    this.draw(this.ctx);
    this.texture.needsUpdate = true;
  }

  /** Advance animation state; set `this.dirty = true` when a redraw is needed. */
  protected step(_deltaMs: number): void {}

  protected abstract draw(ctx: CanvasRenderingContext2D): void;

  destroy(): void {
    this.texture.dispose();
  }
}

/** Path for a rectangle with rounded corners (`ctx.roundRect` is missing in older Safari). */
export function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
