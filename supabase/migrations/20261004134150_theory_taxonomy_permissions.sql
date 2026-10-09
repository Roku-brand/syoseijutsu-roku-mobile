-- Supabase default privileges explicitly grant anon/authenticated, independently of PUBLIC.
revoke all on function public.sync_taxonomy_paid_theory(),public.check_theory_taxonomy(),public.place_theory_in_subcategory(text,text,integer),public.reorder_subcategory_theories(text,text[]),public.save_theory_subcategory(text,text,text,integer),public.delete_theory_subcategory(text) from public,anon,authenticated;
grant execute on function public.reorder_subcategory_theories(text,text[]),public.save_theory_subcategory(text,text,text,integer),public.delete_theory_subcategory(text) to authenticated;
drop policy taxonomy_owner on public.theory_subcategories;
create policy taxonomy_owner_insert on public.theory_subcategories for insert to authenticated with check((select public.is_owner()));
create policy taxonomy_owner_update on public.theory_subcategories for update to authenticated using((select public.is_owner())) with check((select public.is_owner()));
create policy taxonomy_owner_delete on public.theory_subcategories for delete to authenticated using((select public.is_owner()));
create index theories_subcategory_fk_idx on public.theories(subcategory_id);
