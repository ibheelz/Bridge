import { CanvasScreen, roundedRect } from './CanvasScreen';

const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';
const SANS = 'system-ui, -apple-system, "Segoe UI", sans-serif';
const MENU_HEIGHT = 28;
const TITLE_HEIGHT = 30;
const BLINK_MS = 530;

/** Terminal and editor palettes from analysis section 6.2. */
const TERM = {
  bg: '#1a1b1e',
  chrome: '#2c2c2e',
  title: '#9a9a9e',
  text: '#d6d6d8',
  dim: '#6e6e73',
  accent: '#d97757',
  green: '#30d158',
  cyan: '#64d2ff',
  prompt: '#e8e8ea',
};
const CODE = {
  bg: '#1e1e1e',
  side: '#252528',
  tabs: '#2d2d30',
  status: '#007acc',
  kw: '#569cd6',
  str: '#ce9178',
  comment: '#6a9955',
  fn: '#dcdcaa',
  type: '#4ec9b0',
  var: '#9cdcfe',
  plain: '#d4d4d4',
  dim: '#6e6e73',
};

type Token = readonly [text: string, color: string];

/** Placeholder code shown in the editor window. */
const CODE_LINES: readonly (readonly Token[])[] = [
  [['// placeholder code, replace with anything', CODE.comment]],
  [['import', CODE.kw], [' { ', CODE.plain], ['Room', CODE.type], [' } ', CODE.plain], ['from', CODE.kw], [" './room'", CODE.str], [';', CODE.plain]],
  [],
  [['export', CODE.kw], [' ', CODE.plain], ['function', CODE.kw], [' ', CODE.plain], ['start', CODE.fn], ['(', CODE.plain], ['target', CODE.var], [': ', CODE.plain], ['HTMLElement', CODE.type], [') {', CODE.plain]],
  [['  const', CODE.kw], [' room', CODE.var], [' = ', CODE.plain], ['new', CODE.kw], [' ', CODE.plain], ['Room', CODE.type], ['(', CODE.plain], ['target', CODE.var], [');', CODE.plain]],
  [['  room', CODE.var], ['.', CODE.plain], ['load', CODE.fn], ['(', CODE.plain], ["'placeholder'", CODE.str], [');', CODE.plain]],
  [],
  [['  room', CODE.var], ['.', CODE.plain], ['on', CODE.fn], ['(', CODE.plain], ["'ready'", CODE.str], [', () => {', CODE.plain]],
  [['    room', CODE.var], ['.', CODE.plain], ['screens', CODE.var], ['.', CODE.plain], ['wake', CODE.fn], ['();', CODE.plain]],
  [['    room', CODE.var], ['.', CODE.plain], ['roomba', CODE.var], ['.', CODE.plain], ['start', CODE.fn], ['();', CODE.plain]],
  [['  });', CODE.plain]],
  [],
  [['  return', CODE.kw], [' room', CODE.var], [';', CODE.plain]],
  [['}', CODE.plain]],
];
const CODE_FILES = ['room.ts', 'screens.ts', 'roomba.ts', 'steam.glsl', 'index.astro'];

/** Placeholder terminal session; lines appear one at a time, then it starts over. */
const TERM_LINES: readonly Token[] = [
  ['$ npm run build', TERM.prompt],
  ['building placeholder site…', TERM.dim],
  ['✓ 1 page built in 1.2s', TERM.green],
  ['$ git status', TERM.prompt],
  ['On branch main', TERM.text],
  ['nothing to commit, working tree clean', TERM.dim],
  ['$ echo "placeholder terminal"', TERM.prompt],
  ['placeholder terminal', TERM.cyan],
];

interface Win {
  kind: 'editor' | 'terminal';
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
}

const easeInOut = (t: number): number => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const between = (min: number, max: number): number => min + Math.random() * (max - min);

/**
 * Fake desktop for the laptop (analysis section 6.2), drawn with Canvas 2D:
 * wallpaper, menu bar with a live clock, an editor window and a terminal
 * window. A cursor rests for 1.2-6 s, then either clicks the window behind to
 * bring it forward (40%) or moves somewhere inside the front one. It only
 * redraws when something changed: the cursor moved, the terminal caret
 * blinked, a terminal line appeared, or the clock minute rolled over.
 */
export default class MacScreen extends CanvasScreen {
  /** Back to front: the last one is focused. */
  private windows: Win[] = [
    { kind: 'editor', title: 'room.ts — placeholder', x: 470, y: 78, w: 500, h: 500 },
    { kind: 'terminal', title: 'zsh — placeholder', x: 56, y: 112, w: 500, h: 420 },
  ];

  private cursor = { x: 300, y: 380 };
  private from = { x: 300, y: 380 };
  private to = { x: 300, y: 380 };
  private moveMs = 0;
  private moveTotal = 0;
  private dwell = between(1200, 3000);
  private focusOnArrive: Win | null = null;

  private blink = 0;
  private caretOn = true;
  private termShown = 1;
  private termWait = between(900, 2500);
  private clock = '';

  constructor(width = 1024, height = 673) {
    super(width, height);
    this.clock = this.readClock();
  }

  private readClock(): string {
    return new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }

  protected step(deltaMs: number): void {
    // Terminal caret.
    this.blink += deltaMs;
    if (this.blink >= BLINK_MS) {
      this.blink %= BLINK_MS;
      this.caretOn = !this.caretOn;
      this.dirty = true;

      this.clock = this.readClock();
    }

    // Terminal output.
    this.termWait -= deltaMs;
    if (this.termWait <= 0) {
      const finished = this.termShown >= TERM_LINES.length;
      this.termShown = finished ? 1 : this.termShown + 1;
      this.termWait = this.termShown >= TERM_LINES.length ? between(3500, 6000) : between(900, 2500);
      this.dirty = true;
    }

    // Cursor.
    if (this.moveTotal > 0) {
      this.moveMs = Math.min(this.moveMs + deltaMs, this.moveTotal);
      const t = easeInOut(this.moveMs / this.moveTotal);
      this.cursor.x = this.from.x + (this.to.x - this.from.x) * t;
      this.cursor.y = this.from.y + (this.to.y - this.from.y) * t;
      this.dirty = true;

      if (this.moveMs >= this.moveTotal) {
        this.moveTotal = 0;
        this.dwell = between(1200, 6000);
        if (this.focusOnArrive) {
          const win = this.focusOnArrive;
          this.focusOnArrive = null;
          this.windows = [...this.windows.filter((other) => other !== win), win];
        }
      }
      return;
    }

    this.dwell -= deltaMs;
    if (this.dwell <= 0) this.pickMove();
  }

  private pickMove(): void {
    const front = this.windows[this.windows.length - 1];
    const back = this.windows[0];

    let x: number;
    let y: number;
    if (Math.random() < 0.4 && back !== front) {
      // Click a part of the back window that the front one does not cover.
      const spot = this.visibleSpot(back, front);
      x = spot.x;
      y = spot.y;
      this.focusOnArrive = back;
    } else {
      x = between(front.x + 40, front.x + front.w - 40);
      y = between(front.y + TITLE_HEIGHT + 30, front.y + front.h - 30);
    }

    this.from = { ...this.cursor };
    this.to = { x, y };
    this.moveMs = 0;
    this.moveTotal = Math.max(350, Math.hypot(x - this.cursor.x, y - this.cursor.y) * 2.2);
  }

  /** A point on `back` outside `front`: its left strip or its right strip, whichever sticks out. */
  private visibleSpot(back: Win, front: Win): { x: number; y: number } {
    const y = between(back.y + 8, back.y + back.h - 30);
    if (back.x < front.x) return { x: between(back.x + 20, Math.min(front.x, back.x + back.w) - 20), y };
    return { x: between(Math.max(front.x + front.w, back.x) + 20, back.x + back.w - 20), y };
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this;

    // Wallpaper.
    const sky = ctx.createLinearGradient(0, 0, w, h);
    sky.addColorStop(0, '#27405f');
    sky.addColorStop(0.55, '#8a5a78');
    sky.addColorStop(1, '#e9a56b');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);
    const sun = ctx.createRadialGradient(w * 0.72, h * 0.8, 0, w * 0.72, h * 0.8, h * 0.7);
    sun.addColorStop(0, 'rgba(255, 226, 170, 0.55)');
    sun.addColorStop(1, 'rgba(255, 226, 170, 0)');
    ctx.fillStyle = sun;
    ctx.fillRect(0, 0, w, h);

    // Menu bar.
    ctx.fillStyle = 'rgba(245, 245, 247, 0.72)';
    ctx.fillRect(0, 0, w, MENU_HEIGHT);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1d1d1f';
    ctx.font = `700 14px ${SANS}`;
    ctx.fillText('Placeholder', 18, MENU_HEIGHT / 2 + 1);
    ctx.font = `14px ${SANS}`;
    let menuX = 18 + 104;
    for (const item of ['File', 'Edit', 'View', 'Window', 'Help']) {
      ctx.fillText(item, menuX, MENU_HEIGHT / 2 + 1);
      menuX += ctx.measureText(item).width + 22;
    }
    ctx.textAlign = 'right';
    ctx.fillText(this.clock, w - 18, MENU_HEIGHT / 2 + 1);
    ctx.textAlign = 'left';

    const front = this.windows[this.windows.length - 1];
    for (const win of this.windows) this.drawWindow(ctx, win, win === front);

    this.drawCursor(ctx, this.cursor.x, this.cursor.y);
  }

  private drawWindow(ctx: CanvasRenderingContext2D, win: Win, focused: boolean): void {
    const { x, y, w, h } = win;
    const chrome = win.kind === 'terminal' ? TERM.chrome : CODE.tabs;
    const body = win.kind === 'terminal' ? TERM.bg : CODE.bg;

    ctx.save();
    ctx.shadowColor = `rgba(0, 0, 0, ${focused ? 0.45 : 0.25})`;
    ctx.shadowBlur = focused ? 40 : 22;
    ctx.shadowOffsetY = focused ? 16 : 8;
    roundedRect(ctx, x, y, w, h, 12);
    ctx.fillStyle = body;
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundedRect(ctx, x, y, w, h, 12);
    ctx.clip();

    ctx.fillStyle = chrome;
    ctx.fillRect(x, y, w, TITLE_HEIGHT);
    const lights = focused ? ['#ff5f57', '#febc2e', '#28c840'] : ['#5a5a5e', '#5a5a5e', '#5a5a5e'];
    lights.forEach((color, i) => {
      ctx.beginPath();
      ctx.arc(x + 18 + i * 20, y + TITLE_HEIGHT / 2, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    });
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `13px ${SANS}`;
    ctx.fillStyle = focused ? '#d0d0d4' : TERM.title;
    ctx.fillText(win.title, x + w / 2, y + TITLE_HEIGHT / 2 + 1);
    ctx.textAlign = 'left';

    if (win.kind === 'terminal') this.drawTerminal(ctx, win, focused);
    else this.drawEditor(ctx, win);

    ctx.restore();
  }

  private drawTerminal(ctx: CanvasRenderingContext2D, win: Win, focused: boolean): void {
    const left = win.x + 18;
    let y = win.y + TITLE_HEIGHT + 26;
    ctx.font = `14px ${MONO}`;

    ctx.fillStyle = TERM.accent;
    ctx.fillText('placeholder shell', left, y);
    y += 30;

    for (let i = 0; i < this.termShown; i++) {
      const [text, color] = TERM_LINES[i];
      ctx.fillStyle = color;
      ctx.fillText(text, left, y);
      y += 22;
    }

    // Prompt with a caret; the caret only blinks in the focused window.
    ctx.fillStyle = TERM.prompt;
    ctx.fillText('$', left, y);
    if (this.caretOn || !focused) {
      ctx.fillStyle = focused ? TERM.text : TERM.dim;
      ctx.fillRect(left + 18, y - 9, 9, 18);
    }
  }

  private drawEditor(ctx: CanvasRenderingContext2D, win: Win): void {
    const top = win.y + TITLE_HEIGHT;
    const sideWidth = 130;
    const statusHeight = 22;

    // File list.
    ctx.fillStyle = CODE.side;
    ctx.fillRect(win.x, top, sideWidth, win.h - TITLE_HEIGHT);
    ctx.font = `12px ${SANS}`;
    CODE_FILES.forEach((file, i) => {
      const rowY = top + 24 + i * 24;
      if (i === 0) {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.fillRect(win.x, rowY - 12, sideWidth, 24);
      }
      ctx.fillStyle = i === 0 ? CODE.plain : CODE.dim;
      ctx.fillText(file, win.x + 16, rowY);
    });

    // Code.
    ctx.font = `13px ${MONO}`;
    const codeLeft = win.x + sideWidth + 44;
    CODE_LINES.forEach((line, i) => {
      const lineY = top + 26 + i * 21;
      ctx.fillStyle = CODE.dim;
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), codeLeft - 16, lineY);
      ctx.textAlign = 'left';
      let x = codeLeft;
      for (const [text, color] of line) {
        ctx.fillStyle = color;
        ctx.fillText(text, x, lineY);
        x += ctx.measureText(text).width;
      }
    });

    // Status bar.
    ctx.fillStyle = CODE.status;
    ctx.fillRect(win.x, win.y + win.h - statusHeight, win.w, statusHeight);
    ctx.fillStyle = '#ffffff';
    ctx.font = `11px ${SANS}`;
    ctx.fillText('main    TypeScript    placeholder', win.x + 12, win.y + win.h - statusHeight / 2 + 1);
  }

  private drawCursor(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(1.3, 1.3);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 17);
    ctx.lineTo(4.4, 13.2);
    ctx.lineTo(7.4, 19.6);
    ctx.lineTo(10, 18.4);
    ctx.lineTo(7.1, 12.2);
    ctx.lineTo(12.4, 12.2);
    ctx.closePath();
    ctx.fillStyle = '#111111';
    ctx.fill();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
  }
}
