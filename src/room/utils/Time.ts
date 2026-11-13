import EventEmitter from './EventEmitter';

/** Own rAF loop. `delta` and `elapsed` are in milliseconds. Emits 'tick'. */
export default class Time extends EventEmitter {
  start = performance.now();
  current = this.start;
  elapsed = 0;
  delta = 16;

  private frame = 0;
  private running = true;

  constructor() {
    super();
    this.frame = requestAnimationFrame(this.tick);
  }

  private tick = (): void => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.tick);

    const now = performance.now();
    // Clamp so a background tab coming back does not produce one huge step.
    this.delta = Math.min(now - this.current, 60);
    this.current = now;
    this.elapsed = now - this.start;
    this.trigger('tick');
  };

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.clear();
  }
}
