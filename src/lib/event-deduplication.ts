/** Mirrors the server's UTC-day view and rolling 24-hour save deduplication. */
export function eventExpiresAt(eventType: 'view' | 'save', now: number): number {
  return eventType === 'view'
    ? (Math.floor(now / 86_400_000) + 1) * 86_400_000
    : now + 86_400_000;
}

export function createEventDeduplicator(send: (key: string) => Promise<void>, now = Date.now) {
  const expiry = new Map<string, number>();
  const pending = new Map<string, Promise<void>>();
  return async (key: string, type: 'view' | 'save') => {
    if ((expiry.get(key) ?? 0) > now()) return;
    if (pending.has(key)) return pending.get(key);
    const startedAt = now();
    const request = (async () => {
      await send(key);
      expiry.set(key, eventExpiresAt(type, startedAt));
      for (const [id, until] of expiry) if (until <= now()) expiry.delete(id);
    })();
    pending.set(key, request);
    try { await request; }
    finally { if (pending.get(key) === request) pending.delete(key); }
  };
}
