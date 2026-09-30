-- Theory management procedures require an authenticated owner session.
revoke execute on function public.reorder_content(text,text,text[]) from anon;
revoke execute on function public.reorder_theory_drafts(text[]) from anon;
revoke execute on function public.move_theory_display_id(text,integer,text,text) from anon;
revoke execute on function public.create_theory_draft(text) from anon;
revoke execute on function public.publish_theory(text,jsonb) from anon;
revoke execute on function public.archive_theory(text) from anon;
