import EventEmitter from './EventEmitter';
import Loader, { type LoadedFile } from './Loader';
import type { Source, SourceGroup } from '../assets';

export interface ResourceGroup {
  name: string;
  toLoad: number;
  loaded: number;
  /** Names of the sources that failed to load. */
  failed: string[];
}

/**
 * Loads groups of sources one after another and keeps the results in `items`
 * under each source's name (analysis section 4.5).
 *
 * Events:
 * - `progress (group, source)` after every file, failed or not; read
 *   `group.loaded / group.toLoad` for the loading bar.
 * - `groupEnd (group)` when a group has settled. A group with no items ends
 *   straight away.
 * - `end` when every group has.
 *
 * Nothing fires before `load()` is called, and nothing fires synchronously
 * inside it, so listeners can be attached right after construction.
 */
export default class Resources extends EventEmitter {
  items: Record<string, LoadedFile> = {};
  /** The group being loaded, or the last one once everything is done. */
  current: ResourceGroup | null = null;

  private queue: SourceGroup[];
  private loader: Loader;
  private started = false;

  constructor(groups: readonly SourceGroup[], dracoPath: string) {
    super();
    this.queue = [...groups];
    this.loader = new Loader(dracoPath);

    this.loader.on('fileEnd', (source: Source, data: LoadedFile) => {
      this.items[source.name] = data;
      this.fileSettled(source);
    });
    this.loader.on('fileError', (source: Source, error: unknown) => {
      console.warn(`[room] could not load ${source.path}`, error);
      this.current?.failed.push(source.name);
      this.fileSettled(source);
    });
  }

  load(): void {
    if (this.started) return;
    this.started = true;
    queueMicrotask(() => this.loadNextGroup());
  }

  private loadNextGroup(): void {
    const next = this.queue.shift();
    if (!next) {
      this.trigger('end');
      return;
    }

    this.current = { name: next.name, toLoad: next.items.length, loaded: 0, failed: [] };
    if (next.items.length === 0) this.groupSettled();
    else this.loader.load(next.items);
  }

  private fileSettled(source: Source): void {
    const group = this.current;
    if (!group) return;
    group.loaded++;
    this.trigger('progress', group, source);
    if (group.loaded === group.toLoad) this.groupSettled();
  }

  private groupSettled(): void {
    this.trigger('groupEnd', this.current);
    this.loadNextGroup();
  }

  /** Whoever took a resource out of `items` owns it; this only stops the loading. */
  destroy(): void {
    this.loader.destroy();
    this.queue = [];
    this.clear();
  }
}
