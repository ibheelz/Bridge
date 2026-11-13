import type { ComputerId } from './assets';

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
  mute: 'kai:mute',
  sky: 'kai:sky',
} as const;

/** Detail of `kai:tvmode` and `kai:suite`. */
export interface ActiveDetail {
  active: boolean;
}

/** Detail of `kai:computer-activate`. Without one, the left computer starts. */
export interface ComputerDetail {
  id: ComputerId;
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

/** Detail of `kai:sky`: the outside sky's colours (sRGB hex) for the page behind the canvas. */
export interface SkyDetail {
  top: string;
  horizon: string;
  /** The sun is well below the horizon: page chrome should switch to light ink. */
  night: boolean;
}

export interface MuteDetail {
  muted: boolean;
}

export function emit(name: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
