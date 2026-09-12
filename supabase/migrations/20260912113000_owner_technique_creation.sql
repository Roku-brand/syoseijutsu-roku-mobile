-- Create a draft card with a server-generated stable ID.  The owner UI never
-- exposes IDs as an input, while the identifier remains safe for relations,
-- revisions and audit history.
create or replace function public.create_technique()
returns public.techniques
language plpgsql
security definer
set search_path = public
as $$
declare
  result_row public.techniques;
  generated_id text;
  next_order integer;
begin
  if not public.is_owner() then
    raise exception 'owner_required' using errcode = '42501';
  end if;

  generated_id := 'technique-' || to_char(now() at time zone 'utc', 'YYYYMMDDHH24MISS') || '-' || substr(gen_random_uuid()::text, 1, 6);
  select coalesce(max(display_order), 0) + 1 into next_order from public.techniques;

  insert into public.techniques (
    id, persona_id, category, title, essence, explanation, memo, importance,
    practices, examples, cautions, primary_theory_ids, theory_ids, status,
    display_order, updated_by
  ) values (
    generated_id, '', 'interpersonal', '', '', '', '', 1,
    '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, '[]'::jsonb, 'draft',
    next_order, auth.uid()
  ) returning * into result_row;

  return result_row;
end;
$$;

revoke all on function public.create_technique() from public;
grant execute on function public.create_technique() to authenticated;
