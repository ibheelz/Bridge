import { CanvasScreen } from './CanvasScreen';

const BLOBS = [
  { color: '255, 122, 89', speedX: 0.00021, speedY: 0.00017, phase: 0.0 },
  { color: '88, 130, 255', speedX: 0.00016, speedY: 0.00023, phase: 2.1 },
  { color: '72, 200, 160', speedX: 0.00012, speedY: 0.00014, phase: 4.2 },
] as const;

/**
 * Stand-in for the TV video (analysis section 6.3) while no video file exists:
 * three soft colour fields drifting over a dark screen, with a label saying
 * what to do. Redraws at the 30 fps cap.
 */
export default class TestPattern extends CanvasScreen {
  private elapsed = 0;

  constructor(width = 1024, height = 664) {
    super(width, height);
  }

  protected step(deltaMs: number): void {
    this.elapsed += deltaMs;
    this.dirty = true;
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h, elapsed: t } = this;

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';
    for (const blob of BLOBS) {
      const x = w * (0.5 + 0.38 * Math.sin(t * blob.speedX + blob.phase));
      const y = h * (0.5 + 0.34 * Math.cos(t * blob.speedY + blob.phase * 1.7));
      const r = h * 0.75;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, `rgba(${blob.color}, 0.55)`);
      glow.addColorStop(1, `rgba(${blob.color}, 0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.globalCompositeOperation = 'source-over';

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
    ctx.font = '600 64px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('PLACEHOLDER VIDEO', w / 2, h / 2 - 24);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = '26px system-ui, -apple-system, "Segoe UI", sans-serif';
    ctx.fillText('add an .mp4 to public/assets/screens/', w / 2, h / 2 + 44);

    // A thin bar sweeping along the bottom, so it is plainly alive.
    const sweep = (t * 0.00012) % 1;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.fillRect(0, h - 10, w, 4);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.fillRect(sweep * w, h - 10, w * 0.12, 4);
    if (sweep > 0.88) ctx.fillRect(0, h - 10, (sweep - 0.88) * w, 4);
  }
}
