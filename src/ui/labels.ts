import { EVENTS, emit, type HoverDetail, type RoomRectDetail, type TextLumaDetail } from '../room/events';
import { onModeChange } from './modeWatch';

/** Placeholder roles for the top label; the real ones are the user's to write. */
const ROLES = ['placeholder role one', 'placeholder role two', 'placeholder role three'];
const ROLE_INTERVAL_MS = 3400;
const ROLE_FADE_MS = 450;
const ROLE_SKIP_FADE_MS = 200;
/** Labels appear this long after the room is first measured (section 10, `edge-word-in`). */
const FADE_IN_DELAY_MS = 500;
/** Margins narrower than this pin the side labels to the bottom corners. */
const CORNER_GAP_PX = 120;
const MIN_OFFSET_PX = 60;

/**
 * The edge words around the room (analysis section 10, "Edge words"). They sit
 * behind the transparent canvas; invisible proxy buttons above the canvas take
 * the clicks. Positions follow `kai:room-rect`; all labels hide while a camera
 * mode runs, and
 * `kai:text-luma` flips the ink to light or lets clicks through to the room.
 */
export function initLabels(root: HTMLElement | null): void {
  if (!root) return;
  const left = root.querySelector<HTMLElement>('.edge-word--left:not(button)');
  const right = root.querySelector<HTMLElement>('.edge-word--right');
  const leftProxy = root.querySelector<HTMLButtonElement>('.edge-word--proxy');
  const roleProxy = root.querySelector<HTMLButtonElement>('.edge-word--roleproxy');
  const top = root.querySelector<HTMLElement>('.edge-word--top:not(button)');
  const role = root.querySelector<HTMLElement>('.edge-word__role');
  const proxies = [leftProxy, roleProxy].filter((b): b is HTMLButtonElement => Boolean(b));
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  // --- Placement -----------------------------------------------------------
  /** Proxies copy their label's size, so the hit area matches the text. */
  const fitProxies = (): void => {
    for (const [label, proxy] of [
      [left, leftProxy],
      [top, roleProxy],
    ] as const) {
      if (!label || !proxy) continue;
      proxy.style.width = `${label.offsetWidth}px`;
      proxy.style.height = `${label.offsetHeight}px`;
    }
  };

  const place = (rect: RoomRectDetail): void => {
    const leftGap = rect.left;
    const rightGap = rect.viewportWidth - rect.right;
    const corners = leftGap < CORNER_GAP_PX || rightGap < CORNER_GAP_PX;
    root.classList.toggle('edge-word--corners', corners);
    const leftX = corners ? '' : `${Math.max(leftGap / 2, MIN_OFFSET_PX)}px`;
    const rightX = corners ? '' : `${Math.max(rightGap / 2, MIN_OFFSET_PX)}px`;
    for (const el of [left, leftProxy]) if (el) el.style.left = leftX;
    if (right) right.style.right = rightX;
    fitProxies();
  };

  /** Proxies stay disabled until the labels have faded in. */
  let shown = false;
  window.addEventListener(EVENTS.roomRect, (event) => {
    place((event as CustomEvent<RoomRectDetail>).detail);
    if (shown) return;
    shown = true;
    window.setTimeout(() => {
      root.classList.add('edge-words-in');
      applyModes();
    }, FADE_IN_DELAY_MS);
  });
  document.fonts?.ready.then(fitProxies).catch(() => {});

  // --- Hide during modes, and give way where the room covers a label -------
  let hidden = false;
  /** Proxies whose label the room is drawn over (`kai:text-luma`); clicks then go to the room. */
  const covered = new Set<HTMLButtonElement>();
  const applyModes = (): void => {
    root.classList.toggle('edge-words-hidden', hidden);
    const live = root.classList.contains('edge-words-in');
    for (const proxy of proxies) proxy.disabled = !live || hidden || covered.has(proxy);
  };
  onModeChange((active) => {
    hidden = active;
    applyModes();
  });

  const byId: Record<string, { label: HTMLElement | null; proxy: HTMLButtonElement | null }> = {
    portfolio: { label: left, proxy: leftProxy },
    software: { label: right, proxy: null },
    wordmark: { label: top, proxy: roleProxy },
  };
  window.addEventListener(EVENTS.textLuma, (event) => {
    const detail = (event as CustomEvent<TextLumaDetail>).detail;
    const entry = detail && byId[detail.id];
    if (!entry) return;
    entry.label?.classList.toggle('edge-word--lumaflip', detail.light);
    if (entry.proxy) {
      if (detail.covered) covered.add(entry.proxy);
      else covered.delete(entry.proxy);
      applyModes();
    }
  });

  // --- Left label: hover hint and keyboard route into the computer ----------
  const hot = { room: false, proxy: false };
  const applyHot = (): void => {
    left?.classList.toggle('is-hot', hot.room || hot.proxy);
  };
  window.addEventListener(EVENTS.hover, (event) => {
    const detail = (event as CustomEvent<HoverDetail>).detail;
    if (detail?.id !== 'computer') return;
    hot.room = detail.hovered;
    applyHot();
  });
  if (leftProxy) {
    const on = (): void => {
      hot.proxy = true;
      applyHot();
    };
    const off = (): void => {
      hot.proxy = leftProxy.matches(':hover') || document.activeElement === leftProxy;
      applyHot();
    };
    leftProxy.addEventListener('pointerenter', on);
    leftProxy.addEventListener('focus', on);
    leftProxy.addEventListener('pointerleave', off);
    leftProxy.addEventListener('blur', off);
    leftProxy.addEventListener('click', () => emit(EVENTS.computerActivate));
  }

  // --- Role rotation -------------------------------------------------------
  let roleIndex = 0;
  let timer = 0;
  let swapping = 0;
  const schedule = (): void => {
    window.clearTimeout(timer);
    if (!document.hidden) timer = window.setTimeout(() => nextRole(ROLE_FADE_MS), ROLE_INTERVAL_MS);
  };
  const nextRole = (fadeMs: number): void => {
    if (!role) return;
    window.clearTimeout(swapping);
    const swap = (): void => {
      roleIndex = (roleIndex + 1) % ROLES.length;
      role.textContent = ROLES[roleIndex];
      role.style.opacity = '1';
      fitProxies();
      schedule();
    };
    if (reducedMotion.matches) {
      role.style.transitionDuration = '0ms';
      swap();
      return;
    }
    role.style.transitionDuration = `${fadeMs}ms`;
    role.style.opacity = '0';
    swapping = window.setTimeout(swap, fadeMs);
  };
  if (role) {
    role.textContent = ROLES[0];
    schedule();
    roleProxy?.addEventListener('click', () => nextRole(ROLE_SKIP_FADE_MS));
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) window.clearTimeout(timer);
      else schedule();
    });
  }

}
