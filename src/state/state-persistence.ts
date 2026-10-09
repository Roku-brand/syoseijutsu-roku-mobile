type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
  removeItem: (key: string) => Promise<unknown>;
};
type Options<State, Action> = {
  storage: Storage;
  key: string;
  initialState: () => State;
  restore: (value: unknown) => State;
  reduce: (state: State, action: Action) => State;
  onError: (operation: 'read' | 'write' | 'clear', error: unknown) => void;
  persistRestoredState?: boolean;
};

export type PersistenceSnapshot<State> = { state: State; hydrated: boolean };

/** Storage owns ordering; React only subscribes to the resulting snapshots. */
export function createStatePersistence<State, Action>(options: Options<State, Action>) {
  let snapshot: PersistenceSnapshot<State> = { state: options.initialState(), hydrated: false };
  const listeners = new Set<(value: PersistenceSnapshot<State>) => void>();
  let started = false;
  let settled = false;
  let writable = false;
  let pending: Action[] = [];
  let queue: Promise<unknown> = Promise.resolve();
  let fallback: ReturnType<typeof setTimeout> | undefined;

  const emit = (state: State, hydrated = snapshot.hydrated) => {
    snapshot = { state, hydrated };
    listeners.forEach((listener) => listener(snapshot));
  };
  const enqueue = (operation: 'write' | 'clear', run: () => Promise<unknown>) => {
    const result = queue.then(run);
    // Keep later writes running even if an earlier write failed.
    queue = result.catch((error) => options.onError(operation, error));
    return result;
  };
  const persist = () => {
    const serialized = JSON.stringify(snapshot.state);
    void enqueue('write', () => options.storage.setItem(options.key, serialized)).catch(() => undefined);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: (value: PersistenceSnapshot<State>) => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    start(timeoutMs = 900) {
      if (started) return;
      started = true;
      // A timeout releases the UI, but must never enable writes before reading.
      fallback = setTimeout(() => emit(snapshot.state, true), timeoutMs);
      void Promise.resolve().then(() => options.storage.getItem(options.key)).then((stored) => {
        if (settled) return; // An explicit clear supersedes an outstanding read.
        const restored = stored === null ? options.initialState() : options.restore(JSON.parse(stored));
        const state = pending.reduce(options.reduce, restored);
        const hasEdits = pending.length > 0;
        pending = [];
        settled = true;
        writable = true;
        emit(state, true);
        if (hasEdits || (options.persistRestoredState && stored !== null && JSON.stringify(state) !== stored)) persist();
      }).catch((error) => {
        if (settled) return;
        settled = true;
        pending = [];
        // Preserve unreadable data instead of overwriting it with defaults.
        options.onError('read', error);
      }).finally(() => {
        clearTimeout(fallback);
        if (!snapshot.hydrated) emit(snapshot.state, true);
      });
    },
    dispatch(action: Action) {
      const state = options.reduce(snapshot.state, action);
      if (!settled) pending.push(action);
      if (state === snapshot.state) return;
      emit(state);
      if (writable) persist();
    },
    async clear() {
      settled = true;
      pending = [];
      writable = true;
      clearTimeout(fallback);
      emit(options.initialState(), true);
      await enqueue('clear', () => options.storage.removeItem(options.key));
    },
    /** Useful for orderly shutdowns and deterministic storage tests. */
    flush: () => queue,
  };
}
