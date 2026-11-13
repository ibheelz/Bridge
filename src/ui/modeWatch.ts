import { EVENTS, type ActiveDetail, type CrtModeDetail } from '../room/events';

/**
 * Calls `listener(active)` whenever the set of running camera modes changes:
 * active while CRT mode is in any phase but `idle`, or TV or laptop mode is on.
 * Used by the labels and the overlay buttons, which hide during every mode.
 */
export function onModeChange(listener: (active: boolean) => void): () => void {
  const modes = { crt: false, tv: false, suite: false };
  const update = (): void => listener(modes.crt || modes.tv || modes.suite);
  const onCrt = (event: Event): void => {
    modes.crt = (event as CustomEvent<CrtModeDetail>).detail?.phase !== 'idle';
    update();
  };
  const onTv = (event: Event): void => {
    modes.tv = Boolean((event as CustomEvent<ActiveDetail>).detail?.active);
    update();
  };
  const onSuite = (event: Event): void => {
    modes.suite = Boolean((event as CustomEvent<ActiveDetail>).detail?.active);
    update();
  };
  window.addEventListener(EVENTS.crtMode, onCrt);
  window.addEventListener(EVENTS.tvMode, onTv);
  window.addEventListener(EVENTS.suite, onSuite);
  return () => {
    window.removeEventListener(EVENTS.crtMode, onCrt);
    window.removeEventListener(EVENTS.tvMode, onTv);
    window.removeEventListener(EVENTS.suite, onSuite);
  };
}
