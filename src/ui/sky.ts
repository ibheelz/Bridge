import { EVENTS, type SkyDetail } from '../room/events';

/**
 * The page behind the canvas follows the outdoor sky (`kai:sky`), so the
 * moments it shows (before the room is built, during the CRT lights-out) match
 * the scene. `is-night` on <html> switches the page chrome to light ink.
 */
export function initSky(root: HTMLElement | null): void {
  if (!root) return;
  window.addEventListener(EVENTS.sky, (event) => {
    const detail = (event as CustomEvent<SkyDetail>).detail;
    if (!detail) return;
    root.style.setProperty('--sky-top', detail.top);
    root.style.setProperty('--sky-horizon', detail.horizon);
    document.documentElement.classList.toggle('is-night', detail.night);
  });
}
