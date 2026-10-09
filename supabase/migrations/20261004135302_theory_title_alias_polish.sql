-- Pure English/Japanese aliases: no change to ID, meaning, links, edition or ordering.
do $guard$ begin
 if not exists(select 1 from public.theories where id='kb_730' and title='所属欲求／Need to Belong') then raise exception 'Title changed; re-review';end if;
end $guard$;
update public.theories set title='所属欲求',aliases='["need to belong","belongingness hypothesis","所属の欲求","所属欲求／Need to Belong"]'::jsonb,updated_at=now() where id='kb_730';
