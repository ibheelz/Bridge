import { EVENTS, emit, type ActiveDetail } from '../room/events';

/**
 * The laptop panel (analysis section 10, "Suite panel"). It opens when the
 * camera has reached the laptop (`kai:suite {active: true}`) and closes when
 * the camera leaves. Its close button asks the mode to leave with `kai:suite-close`.
 */
export function initSuite(panel: HTMLElement | null): void {
  if (!panel) return;
  const close = panel.querySelector<HTMLButtonElement>('.suite__close');

  window.addEventListener(EVENTS.suite, (event) => {
    const open = Boolean((event as CustomEvent<ActiveDetail>).detail?.active);
    panel.classList.toggle('is-open', open);
    panel.inert = !open;
    panel.setAttribute('aria-hidden', String(!open));
    if (open) close?.focus({ preventScroll: true });
    else if (panel.contains(document.activeElement)) (document.activeElement as HTMLElement).blur();
  });

  close?.addEventListener('click', () => emit(EVENTS.suiteClose));
}
