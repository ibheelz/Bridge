/**
 * `prefers-reduced-motion` in one place (analysis section 13.4). The value is
 * kept current, so a change in the system setting takes effect on the next frame.
 */
const QUERY = '(prefers-reduced-motion: reduce)';
/** Longest camera flight when motion is reduced. */
export const REDUCED_FLIGHT_MS = 300;

const media = typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null;
let reduced = media?.matches ?? false;
media?.addEventListener('change', (event) => {
  reduced = event.matches;
});

export function prefersReducedMotion(): boolean {
  return reduced;
}

/** A camera flight's duration: unchanged normally, at most 300 ms with reduced motion. */
export function flightMs(ms: number): number {
  return reduced ? Math.min(ms, REDUCED_FLIGHT_MS) : ms;
}
