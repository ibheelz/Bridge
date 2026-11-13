import { CanvasScreen } from './CanvasScreen';

/**
 * The CRT's boot sequence (analysis section 8.1): a text-mode start-up in
 * three phases, drawn on a 1024 x 768 canvas. All copy is placeholder and
 * lives in the constants below. `done` turns true when the last gap has passed.
 */

const TEXT = '#d3d3d3';
const GREEN = '#4ade80';
const BANNER_GREEN = '#00ff00';
const YELLOW = '#ffcc00';
const FONT = '18px "Courier New", Courier, monospace';
const BANNER_FONT = '16px "Courier New", Courier, monospace';
const LINE_HEIGHT = 29;
const BANNER_LINE_HEIGHT = 16;
const LEFT = 48;
const TOP = 40;
const CURSOR_BLINK_MS = 350;
const KEY_BLINK_MS = 500;
/** Pauses after phase 1, 2 and 3. */
const GAPS = [500, 1200, 1000] as const;

/** Five-row block letters for the banner. */
const GLYPHS: Record<string, readonly string[]> = {
  B: ['████ ', '█   █', '████ ', '█   █', '████ '],
  R: ['████ ', '█   █', '████ ', '█  █ ', '█   █'],
  I: ['█████', '  █  ', '  █  ', '  █  ', '█████'],
  D: ['████ ', '█   █', '█   █', '█   █', '████ '],
  G: [' ████', '█    ', '█  ██', '█   █', ' ████'],
  E: ['█████', '█    ', '████ ', '█    ', '█████'],
};
const BANNER_WORD = 'BRIDGE';

function buildBanner(word: string): string[] {
  const rows = [0, 1, 2, 3, 4].map((row) =>
    [...word].map((letter) => GLYPHS[letter]?.[row] ?? '     ').join('  '),
  );
  const inner = rows[0].length + 4;
  const subtitle = 'placeholder system';
  const pad = inner - subtitle.length;
  const centred = ' '.repeat(Math.floor(pad / 2)) + subtitle + ' '.repeat(Math.ceil(pad / 2));
  return [
    `╔${'═'.repeat(inner)}╗`,
    `║${' '.repeat(inner)}║`,
    ...rows.map((row) => `║  ${row}  ║`),
    `║${' '.repeat(inner)}║`,
    `║${centred}║`,
    `╚${'═'.repeat(inner)}╝`,
  ];
}

interface Line {
  text: string;
  /** Drawn in green right after `text`. */
  tail?: string;
}

type Step =
  | { kind: 'line'; text: string; delay: number }
  /** A line whose green tail is replaced in place, one item per `interval`. */
  | { kind: 'sequence'; text: string; items: readonly string[]; interval: number }
  | { kind: 'clear'; banner: boolean }
  | { kind: 'wait'; ms: number };

const line = (text: string, delay = 120): Step => ({ kind: 'line', text, delay });
const sequence = (text: string, items: readonly string[], interval = 135): Step => ({
  kind: 'sequence',
  text,
  items,
  interval,
});

const SCRIPT: readonly Step[] = [
  // Phase 1: power-on self test.
  line('Bridge BIOS v0.1 (placeholder)', 300),
  line('Copyright (C) Placeholder Systems', 120),
  line('', 200),
  line('Main processor : Placeholder CPU at 133 MHz', 180),
  sequence('Memory test    : ', ['4096K', '8192K', '16384K', '24576K', '32768K', '32768K OK'], 150),
  line('', 80),
  line('Primary master   : PLACEHOLDER DISK 1', 160),
  line('Primary slave    : PLACEHOLDER CD-ROM', 120),
  line('Secondary master : None', 60),
  line('Secondary slave  : None', 50),
  line('', 150),
  sequence('Checking ', ['boot.sys', 'config.sys', 'room.dat', 'screens.dat', 'portfolio.dat'], 130),
  line('', 100),
  line('Loading operating system...', 300),
  { kind: 'wait', ms: GAPS[0] },

  // Phase 2: banner, hardware and drivers.
  { kind: 'clear', banner: true },
  line('', 250),
  line('Detecting hardware...', 220),
  sequence('  device : ', ['keyboard', 'mouse', 'display', 'sound', 'network'], 140),
  sequence('  driver : ', ['video.drv', 'audio.drv', 'input.drv', 'disk.drv', 'net.drv'], 120),
  line('Hardware ready.', 200),
  { kind: 'wait', ms: GAPS[1] },

  // Phase 3: banner only, then the hand-over.
  { kind: 'clear', banner: true },
  line('', 250),
  line('Preparing environment...', 260),
  sequence('  mounting : ', ['/home', '/projects', '/media', '/about'], 150),
  sequence('  registry : ', ['system', 'user', 'desktop', 'shell'], 130),
  line('', 120),
  line('Starting portfolio...', 300),
  line('Please wait...', 200),
  { kind: 'wait', ms: GAPS[2] },
];

export default class BiosBoot extends CanvasScreen {
  private lines: Line[] = [];
  private banner: string[] | null = null;
  private bannerRows = buildBanner(BANNER_WORD);

  private index = 0;
  /** Position inside the current `sequence` step. */
  private item = 0;
  /** Time left before the next step runs. */
  private wait = 0;
  private elapsed = 0;
  private cursorOn = true;
  private keyOn = true;
  private finished = false;

  constructor(width = 1024, height = 768) {
    super(width, height);
  }

  /** True once the whole script, including the last pause, has played. */
  get done(): boolean {
    return this.finished;
  }

  protected step(deltaMs: number): void {
    this.elapsed += deltaMs;

    const cursorOn = Math.floor(this.elapsed / CURSOR_BLINK_MS) % 2 === 0;
    const keyOn = Math.floor(this.elapsed / KEY_BLINK_MS) % 2 === 0;
    if (cursorOn !== this.cursorOn || keyOn !== this.keyOn) {
      this.cursorOn = cursorOn;
      this.keyOn = keyOn;
      this.dirty = true;
    }

    if (this.finished) return;
    this.wait -= deltaMs;
    while (this.wait <= 0 && !this.finished) this.advance();
  }

  private advance(): void {
    const step = SCRIPT[this.index];
    if (!step) {
      this.finished = true;
      return;
    }
    this.dirty = true;

    switch (step.kind) {
      case 'line':
        this.lines.push({ text: step.text });
        this.wait += step.delay;
        break;
      case 'sequence':
        if (this.item === 0) this.lines.push({ text: step.text });
        this.lines[this.lines.length - 1].tail = step.items[this.item];
        this.wait += step.interval;
        this.item++;
        if (this.item < step.items.length) return; // same step again next time
        this.item = 0;
        break;
      case 'clear':
        this.lines = [];
        this.banner = step.banner ? this.bannerRows : null;
        break;
      case 'wait':
        this.wait += step.ms;
        break;
    }
    this.index++;
  }

  protected draw(ctx: CanvasRenderingContext2D): void {
    const { width: w, height: h } = this;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);
    ctx.textBaseline = 'top';

    let y = TOP;
    if (this.banner) {
      ctx.font = BANNER_FONT;
      ctx.textAlign = 'center';
      ctx.fillStyle = BANNER_GREEN;
      for (const row of this.banner) {
        ctx.fillText(row, w / 2, y);
        y += BANNER_LINE_HEIGHT;
      }
      y += LINE_HEIGHT / 2;
    }

    ctx.font = FONT;
    ctx.textAlign = 'left';
    let cursorX = LEFT;
    let cursorY = y;
    for (const row of this.lines) {
      ctx.fillStyle = TEXT;
      ctx.fillText(row.text, LEFT, y);
      let end = LEFT + ctx.measureText(row.text).width;
      if (row.tail) {
        ctx.fillStyle = GREEN;
        ctx.fillText(row.tail, end, y);
        end += ctx.measureText(row.tail).width;
      }
      cursorX = end + 4;
      cursorY = y;
      y += LINE_HEIGHT;
    }

    if (this.cursorOn) {
      ctx.fillStyle = TEXT;
      ctx.fillRect(cursorX, cursorY + 1, 9, 16);
    }

    // Footer: "Press 2 to skip boot, DEL to go back", the 2 blinking yellow.
    const footerY = h - 44;
    const before = 'Press ';
    const key = '2';
    ctx.fillStyle = TEXT;
    ctx.fillText(before, LEFT, footerY);
    let x = LEFT + ctx.measureText(before).width;
    if (this.keyOn) {
      ctx.fillStyle = YELLOW;
      ctx.fillText(key, x, footerY);
    }
    x += ctx.measureText(key).width;
    ctx.fillStyle = TEXT;
    ctx.fillText(' to skip boot, DEL to go back', x, footerY);
  }
}
