# Owner content management setup

1. Apply `supabase/migrations/20260827100000_owner_content_management.sql` in the Supabase SQL editor or with the Supabase CLI.
2. Register `tsubasa00928@gmail.com` through the existing Supabase Auth flow. Do not put the email address in client-side authorization logic.
3. Copy the authenticated user's UUID from Supabase Auth and run this in the SQL editor:

```sql
update public.profiles set role = 'owner' where user_id = '<OWNER_USER_UUID>';
insert into public.user_roles (user_id, role)
values ('<OWNER_USER_UUID>', 'owner')
on conflict (user_id) do update set role = 'owner', updated_at = now();
```

4. On a trusted machine only, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`, then run `pnpm content:import-owner`. The service-role key must never be put in Expo environment variables or committed to Git.
5. Confirm the count printed before and after import. The script upserts by the existing ID, preserves ordering and leaves rows not present in the local bundle untouched.

The app reads `public.techniques` as the public source of truth when available and keeps the bundled JSON only as a bootstrap/offline fallback. Drafts and revisions are protected by RLS. Publishing is performed by `publish_technique`, which checks owner status, detects stale `updated_at`, stores a revision snapshot, and updates the published row atomically.
