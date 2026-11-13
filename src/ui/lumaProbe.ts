import type Experience from '../room/Experience';
import { EVENTS, emit, type TextLumaDetail } from '../room/events';

/** Probe one frame in this many, and only when the view has changed (section 10, "Luma probe"). */
const EVERY_N_FRAMES = 20;
const PATCH = 6;
/** Sample points across each label, as a fraction of its width; vertically centred. */
const SAMPLES_X = [0.25, 0.5, 0.75];
/** Luma of the page gradient, used where the canvas is transparent. */
const PAGE_LUMA = 0.95;
const LIGHT_ON = 0.45;
const LIGHT_OFF = 0.55;
const COVER_ON = 0.5;
const COVER_OFF = 0.3;

interface Probe {
  element: HTMLElement;
  id: string;
  light: boolean;
  covered: boolean;
}

/**
 * Reads the WebGL canvas under each `[data-luma]` label and reports whether
 * the label needs light ink and whether the room is drawn over it
 * (`kai:text-luma`). Pixels are read in the renderer's `afterRender` hook,
 * right after the frame is drawn, so `preserveDrawingBuffer` can stay off.
 */
export function initLumaProbe(experience: Experience): () => void {
  const probes: Probe[] = [...document.querySelectorAll<HTMLElement>('[data-luma]')].map((element) => ({
    element,
    id: element.dataset.luma ?? '',
    light: false,
    covered: false,
  }));
  const renderer = experience.renderer;
  const pixels = new Uint8Array(PATCH * PATCH * 4);
  const lastMatrix = new Float32Array(16);
  let lastWidth = 0;
  let lastHeight = 0;
  let frame = 0;
  let pending = true;

  /** True when the camera or the canvas size differs from the last probe. */
  const viewChanged = (): boolean => {
    const matrix = experience.camera.instance.matrixWorld.elements;
    const canvas = renderer.instance.domElement;
    let changed = canvas.width !== lastWidth || canvas.height !== lastHeight;
    for (let i = 0; i < 16; i++) {
      if (lastMatrix[i] !== matrix[i]) {
        changed = true;
        lastMatrix[i] = matrix[i];
      }
    }
    lastWidth = canvas.width;
    lastHeight = canvas.height;
    return changed;
  };

  const probe = (): void => {
    frame = (frame + 1) % EVERY_N_FRAMES;
    if (frame !== 0 || experience.modeActive || !experience.world || renderer.post) return;
    // A change is remembered until a probe runs, so the final resting view is always measured.
    pending = viewChanged() || pending;
    if (!pending) return;
    pending = false;

    const gl = renderer.instance.getContext();
    const canvas = renderer.instance.domElement;
    const box = canvas.getBoundingClientRect();
    const ratio = canvas.width / Math.max(1, box.width);

    for (const item of probes) {
      const rect = item.element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      let luma = 0;
      let alpha = 0;
      let count = 0;
      for (const fx of SAMPLES_X) {
        const cx = (rect.left + rect.width * fx - box.left) * ratio;
        const cy = canvas.height - (rect.top + rect.height / 2 - box.top) * ratio;
        const x = Math.round(Math.min(Math.max(cx - PATCH / 2, 0), canvas.width - PATCH));
        const y = Math.round(Math.min(Math.max(cy - PATCH / 2, 0), canvas.height - PATCH));
        gl.readPixels(x, y, PATCH, PATCH, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        for (let i = 0; i < pixels.length; i += 4) {
          const a = pixels[i + 3] / 255;
          // The canvas is premultiplied, so rgb already carries alpha: this is
          // the spec's `luma * alpha + 0.95 * (1 - alpha)`.
          const premul = (0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2]) / 255;
          luma += a === 0 ? PAGE_LUMA : premul + PAGE_LUMA * (1 - a);
          alpha += a;
          count++;
        }
      }
      if (count === 0) continue;
      luma /= count;
      alpha /= count;

      const light = item.light ? luma <= LIGHT_OFF : luma < LIGHT_ON;
      const covered = item.covered ? alpha >= COVER_OFF : alpha > COVER_ON;
      if (light === item.light && covered === item.covered) continue;
      item.light = light;
      item.covered = covered;
      const detail: TextLumaDetail = { id: item.id, light, covered };
      emit(EVENTS.textLuma, detail);
    }
  };

  renderer.afterRender.push(probe);
  return () => {
    const index = renderer.afterRender.indexOf(probe);
    if (index >= 0) renderer.afterRender.splice(index, 1);
  };
}
