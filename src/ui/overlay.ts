import { EVENTS, emit, type MuteDetail } from '../room/events';
import { readMuted, writeMuted } from '../room/utils/mutePref';
import { onModeChange } from './modeWatch';

/**
 * Settings and sound buttons in the top-right corner (analysis section 10,
 * "Overlay buttons"). Sound keeps a muted flag in localStorage and sends
 * `kai:mute`, once at startup and on every click. Settings sends
 * `kai:intro-open`, which nothing handles yet (WhiteIntro is off).
 */
export function initOverlay(root: HTMLElement | null): void {
  if (!root) return;
  const sound = root.querySelector<HTMLButtonElement>('.sound');
  const settings = root.querySelector<HTMLButtonElement>('.settings');

  let muted = readMuted();
  const applyMuted = (): void => {
    sound?.setAttribute('aria-pressed', String(muted));
    sound?.classList.toggle('is-muted', muted);
    const detail: MuteDetail = { muted };
    emit(EVENTS.mute, detail);
  };
  sound?.addEventListener('click', () => {
    muted = !muted;
    writeMuted(muted);
    applyMuted();
  });
  applyMuted();

  settings?.addEventListener('click', () => emit(EVENTS.introOpen));

  onModeChange((active) => {
    root.classList.toggle('is-hidden', active);
    for (const button of [sound, settings]) if (button) button.disabled = active;
  });
}
