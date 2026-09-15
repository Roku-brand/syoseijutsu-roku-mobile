import { authenticatedUser, verifyAndRecord, refreshAppleTransactions } from '../_shared/apple.ts';
import { json, optionsResponse } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const user = await authenticatedUser(request);
    const body = await request.json();
    if (body.restore === true) await refreshAppleTransactions(user.id, true);
    else {
      // The environment is only a routing hint. The server verifies the
      // transaction against Apple's signed response and can recover when an
      // older StoreKit bridge omits this field.
      if (typeof body.transactionId !== 'string') return json({ error: 'invalid_request' }, 400);
      await verifyAndRecord(body.transactionId, body.environment, user.id);
    }
    return json({ verified: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : '';
    const detail = error as {
      status?: unknown;
      statusCode?: unknown;
      httpStatusCode?: unknown;
      apiError?: unknown;
      cause?: { code?: unknown };
      name?: unknown;
    };
    // @apple/app-store-server-library exposes the HTTP response as
    // `httpStatusCode` (not `status`). Keep all variants so a library update
    // cannot hide the upstream response again.
    const status = [detail?.status, detail?.statusCode, detail?.httpStatusCode]
      .find(value => typeof value === 'number') ?? null;
    const apiErrorCode = typeof detail?.apiError === 'number' ? detail.apiError : null;
    const cause = typeof detail?.cause?.code === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(detail.cause.code)
      ? detail.cause.code : null;
    const errorName = typeof detail?.name === 'string' && /^[A-Za-z0-9_.-]{1,64}$/.test(detail.name)
      ? detail.name : null;
    const errorMessage = error instanceof Error
      ? error.message.replace(/\s+/g, ' ').slice(0, 160)
      : null;
    const publicErrors = ['authentication_required', 'sandbox_account_not_allowed', 'transaction_ownership_conflict'];
    // Log only a bounded error category, never credentials or signed receipts.
    console.error('apple_purchase_failed', {
      code: publicErrors.includes(message) ? message : 'apple_verification_failed',
      reason: /^[a-z_]{1,64}$/.test(message) ? message : 'upstream_error',
      status,
      apiErrorCode,
      cause,
      errorName,
      errorMessage,
    });
    return json({ error: publicErrors.includes(message) ? message : 'apple_verification_failed' },
      message === 'authentication_required' ? 401 : 400);
  }
});
