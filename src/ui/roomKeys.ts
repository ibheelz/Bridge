import { EVENTS, emit } from '../room/events';
import { onModeChange } from './modeWatch';

/**
 * Keyboard routes to the laptop and the TV (analysis section 13.4). The left
 * label's proxy already opens the computer. These buttons are visually hidden
 * until they get focus, and are disabled while a mode runs (Esc leaves it).
 */
export function initRoomKeys(root: HTMLElement | null): void {
  if (!root) return;
  const laptop = root.querySelector<HTMLButtonElement>('.room-keys__laptop');
  const tv = root.querySelector<HTMLButtonElement>('.room-keys__tv');
  laptop?.addEventListener('click', () => emit(EVENTS.macbookActivate));
  tv?.addEventListener('click', () => emit(EVENTS.tvToggle));
  onModeChange((active) => {
    for (const button of [laptop, tv]) if (button) button.disabled = active;
  });
}
