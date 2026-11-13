import { CanvasScreen } from './CanvasScreen';

const BOARD = '#f4f2ec';
const INK = '#26272b';
const BLUE = '#1d4ed8';
const RED = '#c2271f';
const FONT = "'Marker Felt','Segoe Print','Comic Sans MS',cursive";

/** Placeholder copy: replace with the real board contents. */
const TITLE = 'To do (placeholder)';
const TODOS: readonly { text: string; done: boolean }[] = [
  { text: 'Placeholder task one', done: true },
  { text: 'Placeholder task two', done: true },
  { text: 'Placeholder task three', done: false },
  { text: 'Placeholder task four', done: false },
  { text: 'Placeholder task five', done: false },
];
const NOTE_BLUE = ['your note', 'goes here'];
const NOTE_RED = 'replace this text!';

/**
 * Static hand-written board (analysis section 6.4), drawn once.
 * The jitter comes from a seeded generator, so the board is identical on every load.
 */
export default class Whiteboard extends CanvasScreen {
  private seed = 7;

  constructor(width = 1024, height = 1583) {
    super(width, height);
  }

  /** Linear congruential generator, 0-1. */
  private random(): number {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  /** A value in -amount..amount. */
  private jitter(amount: number): number {
    return (this.random() * 2 - 1) * amount;
  }

  /** A marker stroke through the points, wobbling a little between them. */
  private stroke(ctx: CanvasRenderingContext2D, points: readonly (readonly [number, number])[]): void {
    ctx.beginPath();
    ctx.moveTo(points[0][0] + this.jitter(2), points[0][1] + this.jitter(2));
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const pieces = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0) / 45));
      for (let p = 1; p <= pieces; p++) {
        const t = p / pieces;
        ctx.lineTo(x0 + (x1 - x0) * t + this.jitter(2.2), y0 + (y1 - y0) * t + this.jitter(2.2));
      }
    }
    ctx.stroke();
  }

  private text(
    ctx: CanvasRenderingContext2D,
    value: string,
    x: number,
    y: number,
    size: number,
    tilt = 0.015,
  ): number {
    ctx.save();
    ctx.translate(x + this.jitter(4), y + this.jitter(4));
    ctx.rotate(this.jitter(tilt));
    ctx.font = `${size}px ${FONT}`;
    ctx.fillText(value, 0, 0);
    const width = ctx.measureText(value).width;
    ctx.restore();
    return width;
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this;
    this.seed = 7;

    ctx.fillStyle = BOARD;
    ctx.fillRect(0, 0, w, h);

    // Faint wiped-marker smudges.
    for (let i = 0; i < 6; i++) {
      const x = this.random() * w;
      const y = this.random() * h;
      const r = 160 + this.random() * 220;
      const smudge = ctx.createRadialGradient(x, y, 0, x, y, r);
      smudge.addColorStop(0, 'rgba(120, 120, 130, 0.05)');
      smudge.addColorStop(1, 'rgba(120, 120, 130, 0)');
      ctx.fillStyle = smudge;
      ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.textBaseline = 'alphabetic';

    // Title, underlined twice.
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    const titleWidth = this.text(ctx, TITLE, 84, 190, 88);
    ctx.lineWidth = 7;
    this.stroke(ctx, [[80, 222], [96 + titleWidth, 214]]);
    ctx.lineWidth = 4;
    this.stroke(ctx, [[110, 242], [60 + titleWidth, 236]]);

    // Todo rows.
    let y = 390;
    for (const todo of TODOS) {
      const box = 56;
      const bx = 96 + this.jitter(5);
      const by = y - box + 6;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 5;
      this.stroke(ctx, [[bx, by], [bx + box, by], [bx + box, by + box], [bx, by + box], [bx, by - 3]]);

      ctx.fillStyle = todo.done ? '#6d6e75' : INK;
      const textWidth = this.text(ctx, todo.text, 190, y, 62);

      if (todo.done) {
        ctx.strokeStyle = RED;
        ctx.lineWidth = 8;
        this.stroke(ctx, [[bx + 8, by + 26], [bx + 24, by + 46], [bx + 66, by - 14]]);
        ctx.strokeStyle = '#6d6e75';
        ctx.lineWidth = 4;
        this.stroke(ctx, [[180, y - 20], [200 + textWidth, y - 24]]);
      }
      y += 118;
    }

    // Blue note with an arrow pointing back up at the list.
    ctx.fillStyle = BLUE;
    ctx.strokeStyle = BLUE;
    ctx.save();
    ctx.translate(560, 1040);
    ctx.rotate(-0.07);
    NOTE_BLUE.forEach((line, i) => this.text(ctx, line, 0, i * 70, 58));
    ctx.restore();
    ctx.lineWidth = 5;
    this.stroke(ctx, [[530, 1040], [440, 1010], [390, 950]]);
    this.stroke(ctx, [[372, 990], [390, 950], [432, 958]]);

    // Red note in a rough ring.
    ctx.fillStyle = RED;
    ctx.strokeStyle = RED;
    const noteWidth = this.text(ctx, NOTE_RED, 120, 1215, 56, 0.03);
    ctx.lineWidth = 5;
    const cx = 120 + noteWidth / 2;
    const ring: [number, number][] = [];
    for (let i = 0; i <= 26; i++) {
      const a = (i / 24) * Math.PI * 2 - 0.4;
      ring.push([cx + Math.cos(a) * (noteWidth / 2 + 44), 1196 + Math.sin(a) * 62]);
    }
    this.stroke(ctx, ring);

    // Doodle: a small arch bridge over water.
    ctx.strokeStyle = INK;
    ctx.lineWidth = 6;
    const left = 230;
    const right = 800;
    const deck = 1400;
    this.stroke(ctx, [[left - 70, deck], [right + 70, deck]]);
    const arch: [number, number][] = [];
    const hangers: [number, number][][] = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const x = left + (right - left) * t;
      const top = deck - 150 * 4 * t * (1 - t);
      arch.push([x, top]);
      if (i > 0 && i < 12 && i % 2 === 0) hangers.push([[x, top], [x, deck]]);
    }
    this.stroke(ctx, arch);
    ctx.lineWidth = 4;
    for (const hanger of hangers) this.stroke(ctx, hanger);
    this.stroke(ctx, [[left, deck], [left - 10, deck + 70]]);
    this.stroke(ctx, [[right, deck], [right + 10, deck + 70]]);
    ctx.strokeStyle = BLUE;
    for (let row = 0; row < 2; row++) {
      const wave: [number, number][] = [];
      const y0 = deck + 80 + row * 34;
      for (let i = 0; i <= 14; i++) wave.push([left + 30 + row * 40 + i * 34, y0 + (i % 2 === 0 ? 0 : -14)]);
      this.stroke(ctx, wave);
    }
  }
}
