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

export function emit(name: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
