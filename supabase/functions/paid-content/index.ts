import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, optionsResponse } from '../_shared/http.ts';

const allowedTypes = new Set(['technique', 'theory', 'learning']);

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 503);

  const authHeader = request.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await authClient.auth.getUser();
  if (!userData.user) return json({ error: 'authentication_required' }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: allowed } = await admin.rpc('has_complete_edition', {
    target_user_id: userData.user.id,
  });
  if (!allowed) return json({ error: 'complete_edition_required' }, 403);

  const url = new URL(request.url);
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');
  if (type && !allowedTypes.has(type)) return json({ error: 'invalid_content_type' }, 400);

  let query = admin.from('paid_content')
    .select('content_type,content_id,payload,sort_order,updated_at')
    .order('content_type')
    .order('sort_order')
    .order('content_id');
  if (type) query = query.eq('content_type', type);
  else query = query.in('content_type', [...allowedTypes]);
  if (id) query = query.eq('content_id', id);

  const { data, error } = await query;
  if (error) return json({ error: 'content_read_failed' }, 500);
  return json({ items: data ?? [], scope: type ? 'single' : 'complete-edition' });
});
