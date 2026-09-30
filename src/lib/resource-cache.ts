type Storage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<unknown>;
};

export function isFreshTimestamp(timestamp: number, maxAgeMs: number, now = Date.now()): boolean {
  return Number.isFinite(timestamp) && timestamp <= now && now - timestamp < maxAgeMs;
}

/** Shares requests, survives reloads, and makes owner refreshes bypass the TTL. */
export function createResourceCache<T>(options: {
  key: string; maxAgeMs: number; storage: Storage;
  validate: (value: unknown) => value is T;
  fetch: () => Promise<T>; now?: () => number;
}) {
  let snapshot: { fetchedAt: number; value: T } | null = null;
  let pending: Promise<T> | null = null;
  let storageRead = false;
  let generation = 0;
  const now = options.now ?? Date.now;
  async function read() {
    if (storageRead) return;
    storageRead = true;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      const stored = await Promise.race([
        options.storage.getItem(options.key),
        new Promise<null>((resolve) => { timeout = setTimeout(() => resolve(null), 2_000); }),
      ]);
      if (!stored) return;
      const value = JSON.parse(stored);
      if (typeof value.fetchedAt === 'number' && options.validate(value.value)) snapshot = value;
    } catch { /* Storage is optional; the network remains usable. */ }
    finally { if (timeout) clearTimeout(timeout); }
  }
  function get(force = false): Promise<T> {
    // A publish that happens during a read must obtain a response after that
    // read, rather than joining an older request and missing the edit.
    if (pending) return force ? pending.catch(() => undefined).then(() => get(true)) : pending;
    const request = (async () => {
      const startedGeneration = generation;
      if (!force) await read();
      if (!force && snapshot && isFreshTimestamp(snapshot.fetchedAt, options.maxAgeMs, now())) return snapshot.value;
      const value = await options.fetch();
      if (startedGeneration !== generation) return value;
      snapshot = { fetchedAt: now(), value };
      storageRead = true;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try { await Promise.race([
        options.storage.setItem(options.key, JSON.stringify(snapshot)),
        new Promise<void>((resolve) => { timeout = setTimeout(resolve, 2_000); }),
      ]); }
      catch { /* A successful response does not depend on persistence. */ }
      finally { if (timeout) clearTimeout(timeout); }
      return value;
    })();
    pending = request;
    void request.finally(() => { if (pending === request) pending = null; }).catch(() => undefined);
    return request;
  }
  return { get, invalidate: () => { generation++; snapshot = null; storageRead = true; } };
}
