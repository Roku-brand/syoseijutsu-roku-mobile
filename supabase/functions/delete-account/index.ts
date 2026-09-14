import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, optionsResponse } from '../_shared/http.ts';

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') ?? '';
    const { data: identity, error: identityError } = await admin.auth.getUser(token);
    if (identityError || !identity.user?.email) return json({ error: 'authentication_required' }, 401);
    const body = await request.json();
    if (typeof body.password !== 'string' || body.confirmation !== 'DELETE') return json({ error: 'confirmation_required' }, 400);
    const auth = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { auth: { persistSession: false } });
    const { data: verified, error } = await auth.auth.signInWithPassword({ email: identity.user.email, password: body.password });
    if (error || verified.user?.id !== identity.user.id) return json({ error: 'password_verification_failed' }, 403);
    const id = identity.user.id;
    const files = await admin.storage.from('profile-avatars').list(id, { limit: 1000 });
    if (files.error) throw files.error;
    if (files.data.length) {
      const removed = await admin.storage.from('profile-avatars').remove(files.data.map(file => `${id}/${file.name}`));
      if (removed.error) throw removed.error;
    }
    const events = await admin.from('content_events').delete().eq('user_id', id);
    if (events.error) throw events.error;
    // Auth FK cascades erase profiles and both payment ledgers. Replayed Apple
    // transactions still carry the original deleted user's signed account token.
    const deleted = await admin.auth.admin.deleteUser(id);
    if (deleted.error) throw deleted.error;
    return json({ deleted: true });
  } catch { return json({ error: 'account_deletion_failed_retry' }, 500); }
});
