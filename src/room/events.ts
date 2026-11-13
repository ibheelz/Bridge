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
} as const;

export interface HoverDetail {
  id: 'computer';
  hovered: boolean;
}

export function emit(name: string, detail?: unknown): void {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
