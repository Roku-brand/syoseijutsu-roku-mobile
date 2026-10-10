import { supabase } from '@/lib/supabase';

const MIN_CHECK_INTERVAL_MS = 60_000;
let checkedAt = 0;
let lastRevision: string | null = null;
let pending: Promise<string | null> | null = null;

/** Read one small row, never scan or download the catalogue to detect edits. */
export async function readContentRevision(force = false): Promise<string | null> {
  if (!supabase) return null;
  if (pending) {
    if (!force) return pending;
    await pending;
  }
  if (!force && checkedAt && Date.now() - checkedAt < MIN_CHECK_INTERVAL_MS) return lastRevision;
  checkedAt = Date.now();
  const request = (async () => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    try {
      const { data, error } = await supabase!.from('content_revision').select('revision').eq('id', true).abortSignal(controller.signal).single();
      if (error || data?.revision == null) return null;
      lastRevision = String(data.revision);
      return lastRevision;
    } catch { return null; }
    finally { clearTimeout(timeout); }
  })();
  pending = request;
  try { return await request; }
  finally { if (pending === request) pending = null; }
}
