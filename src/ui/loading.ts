import type Resources from '../room/utils/Resources';
import type { ResourceGroup } from '../room/utils/Resources';

const FADE_MS = 600; // matches the opacity transition on .loading

/**
 * Drives the `.loading` bar from the `base` resource group and fades it out
 * when the group ends. The page only renders the element when there are real
 * assets to download, so `element` may be null.
 */
export function initLoading(element: HTMLElement | null, resources: Resources): void {
  if (!element) return;
  const fill = element.querySelector<HTMLElement>('.loading__fill');
  const percent = element.querySelector<HTMLElement>('.loading__percent');

  resources.on('progress', (group: ResourceGroup) => {
    if (group.name !== 'base') return;
    const ratio = group.toLoad > 0 ? group.loaded / group.toLoad : 1;
    if (fill) fill.style.transform = `scaleX(${ratio})`;
    if (percent) percent.textContent = `${Math.round(ratio * 100)}%`;
    element.setAttribute('aria-valuenow', String(Math.round(ratio * 100)));
  });

  resources.on('groupEnd', (group: ResourceGroup) => {
    if (group.name !== 'base') return;
    element.classList.add('is-done');
    window.setTimeout(() => element.remove(), FADE_MS + 50);
  });
}
