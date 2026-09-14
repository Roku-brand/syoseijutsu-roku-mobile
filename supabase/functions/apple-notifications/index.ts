import { verifyNotification, verifyAndRecord } from '../_shared/apple.ts';
import { json } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const body = await request.json();
    if (typeof body.signedPayload !== 'string' || body.signedPayload.length > 100000) return json({ error: 'invalid_payload' }, 400);
    const result = await verifyNotification(body.signedPayload);
    if (result.transactionId) await verifyAndRecord(result.transactionId, result.value);
    return json({ received: true });
  } catch (error) {
    if (error instanceof Error && error.message === 'account_deleted') return json({ received: true });
    // Keep payloads and credentials out of logs while retaining enough detail
    // to diagnose certificate/environment failures in production.
    const detail = error as Error & { status?: number; cause?: { code?: string } };
    console.error('apple_notification_failed', {
      name: detail?.name ?? 'unknown',
      message: detail?.message ?? '',
      status: typeof detail?.status === 'number' ? detail.status : null,
      causeCode: detail?.cause?.code ?? null,
    });
    // Apple retries transient failures; successful replays are idempotent.
    return json({ error: 'notification_not_processed' }, 503);
  }
});
