/**
 * Names of the `window` CustomEvents the room and the page talk through
 * (analysis section 11). The `kai:` prefix is kept from the spec; rename here.
 */
export const EVENTS = {
  hover: 'kai:hover',
  computerActivate: 'kai:computer-activate',
  macbookActivate: 'kai:macbook-activate',
  tvToggle: 'kai:tv-toggle',
  doorToggle: 'kai:door-toggle',
  zoom: 'kai:zoom',
  crtMode: 'kai:crtmode',
  crtScreenOn: 'kai:crt-screen-on',
  powerdownArrive: 'kai:powerdown-arrive',
  tvMode: 'kai:tvmode',
  suite: 'kai:suite',
  suiteClose: 'kai:suite-close',
  roomRect: 'kai:room-rect',
  textLuma: 'kai:text-luma',
  mute: 'kai:mute',
  introOpen: 'kai:intro-open',
} as const;

/** Detail of `kai:tvmode` and `kai:suite`. */
export interface ActiveDetail {
  active: boolean;
}

export interface HoverDetail {
  id: 'computer';
  hovered: boolean;
}

export type CrtPhase =
  | 'idle'
  | 'powering'
  | 'pushing'
  | 'booting'
  | 'lightsout'
  | 'blackhold'
  | 'black'
  | 'aborting'
  | 'arrivewait'
  | 'arrive'
  | 'arrivepull';

export interface CrtModeDetail {
  phase: CrtPhase;
}

/** Detail of `kai:room-rect`: the room's screen box at the home view, in CSS pixels (section 10). */
export interface RoomRectDetail {
  left: number;
  right: number;
  top: number;
  bottom: number;
  viewportWidth: number;
  viewportHeight: number;
}

/** Detail of `kai:text-luma`: what the canvas looks like under one `[data-luma]` label. */
export interface TextLumaDetail {
  id: string;
  /** The room behind is dark enough that the label needs light ink. */
  light: boolean;
  /** The room is drawn over the label. */
  covered: boolean;
}

export interface MuteDetail {
  muted: boolean;
}

export function emit(name: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
