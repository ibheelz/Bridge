type Listener = (...args: any[]) => void;

/** Minimal event emitter. `on` returns an unsubscribe function. */
export default class EventEmitter {
  private listeners = new Map<string, Set<Listener>>();

  on(name: string, listener: Listener): () => void {
    let set = this.listeners.get(name);
    if (!set) {
      set = new Set();
      this.listeners.set(name, set);
    }
    set.add(listener);
    return () => this.off(name, listener);
  }

  off(name: string, listener?: Listener): void {
    if (!listener) {
      this.listeners.delete(name);
      return;
    }
    this.listeners.get(name)?.delete(listener);
  }

  trigger(name: string, ...args: unknown[]): void {
    const set = this.listeners.get(name);
    if (!set) return;
    for (const listener of [...set]) listener(...args);
  }

  clear(): void {
    this.listeners.clear();
  }
}
