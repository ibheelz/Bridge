import type { ComputerId } from '../room/assets';
import { EVENTS, emit, type ComputerDetail } from '../room/events';
import { onModeChange } from './modeWatch';

/**
 * Keyboard routes to the two computers, the laptop and the TV (analysis
 * section 13.4). The buttons are visually hidden until they get focus, and
 * are disabled while a mode runs (Esc leaves it).
 */
export function initRoomKeys(root: HTMLElement | null): void {
  if (!root) return;
  const laptop = root.querySelector<HTMLButtonElement>('.room-keys__laptop');
  const tv = root.querySelector<HTMLButtonElement>('.room-keys__tv');
  const computers = [...root.querySelectorAll<HTMLButtonElement>('.room-keys__computer')];
  for (const button of computers) {
    button.addEventListener('click', () => {
      const detail: ComputerDetail = { id: (button.dataset.computer as ComputerId) ?? 'left' };
      emit(EVENTS.computerActivate, detail);
    });
  }
  laptop?.addEventListener('click', () => emit(EVENTS.macbookActivate));
  tv?.addEventListener('click', () => emit(EVENTS.tvToggle));
  onModeChange((active) => {
    for (const button of [...computers, laptop, tv]) if (button) button.disabled = active;
  });
}
