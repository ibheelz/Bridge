import EventEmitter from './EventEmitter';

/**
 * Tracks the size of the element the canvas lives in (not the window),
 * plus the clamped device pixel ratio. Emits 'resize'.
 */
export default class Sizes extends EventEmitter {
  width = 1;
  height = 1;
  pixelRatio = 1;
  smallestSide = 1;
  largestSide = 1;

  private element: HTMLElement;
  private observer: ResizeObserver;
  private onWindowResize = () => this.measure();

  constructor(element: HTMLElement) {
    super();
    this.element = element;
    this.measure(true);
    this.observer = new ResizeObserver(() => this.measure());
    this.observer.observe(element);
    // Catches devicePixelRatio changes (browser zoom, moving between displays).
    window.addEventListener('resize', this.onWindowResize);
  }

  get aspect(): number {
    return this.width / this.height;
  }

  private measure(silent = false): void {
    const rect = this.element.getBoundingClientRect();
    const width = Math.max(1, Math.round(rect.width));
    const height = Math.max(1, Math.round(rect.height));
    const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 2);
    if (width === this.width && height === this.height && pixelRatio === this.pixelRatio) return;

    this.width = width;
    this.height = height;
    this.pixelRatio = pixelRatio;
    this.smallestSide = Math.min(width, height);
    this.largestSide = Math.max(width, height);
    if (!silent) this.trigger('resize');
  }

  destroy(): void {
    this.observer.disconnect();
    window.removeEventListener('resize', this.onWindowResize);
    this.clear();
  }
}
