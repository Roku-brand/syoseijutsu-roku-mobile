import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { json, optionsResponse } from '../_shared/http.ts';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return optionsResponse();
  if (request.method !== 'GET' && request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: 'server_not_configured' }, 503);

  const authHeader = request.headers.get('Authorization') ?? '';
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData } = await authClient.auth.getUser();
  if (!userData.user) return json({ access: 'guest', productId: 'complete-edition' });

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data: paid, error } = await admin.rpc('has_complete_edition', {
    target_user_id: userData.user.id,
  });
  if (error) return json({ error: 'access_check_failed' }, 500);

  return json({
    access: paid ? 'paid' : 'free',
    productId: 'complete-edition',
    userId: userData.user.id,
  });
});
