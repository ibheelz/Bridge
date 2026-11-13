/** The stored sound preference (section 10, sound button). Read by the button and by RoomAudio. */
const MUTED_KEY = 'bridge:muted';

/** Default unmuted; storage can be blocked (private windows, previews). */
export function readMuted(): boolean {
  try {
    return window.localStorage.getItem(MUTED_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeMuted(muted: boolean): void {
  try {
    window.localStorage.setItem(MUTED_KEY, muted ? '1' : '0');
  } catch {
    // Not remembered; the current page still follows the button.
  }
}
