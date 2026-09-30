begin;
set local role anon;
do $$ begin
 if (select count(*) from public.get_popular_rankings())<>20 then raise exception 'public top tens missing'; end if;
 begin perform * from public.popular_rankings; raise exception 'anonymous configuration leaked'; exception when insufficient_privilege then null; end;
 begin perform public.publish_popular_ranking('technique','[]',now()); raise exception 'anonymous write permitted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',gen_random_uuid(),'role','authenticated')::text,true);
set local role authenticated;
do $$ begin
 if (select count(*) from public.popular_rankings)<>0 then raise exception 'non-owner configuration leaked'; end if;
 begin perform public.get_ranking_candidates(); raise exception 'non-owner candidates leaked'; exception when insufficient_privilege then null; end;
 begin perform public.publish_popular_ranking('theory','[]',now()); raise exception 'non-owner write permitted'; exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claims',jsonb_build_object('sub',(select user_id from public.profiles where role='owner' limit 1),'role','authenticated')::text,true);
set local role authenticated;
do $$
declare cfg public.popular_rankings; changed public.popular_rankings; ids jsonb; first_id text;
begin
 if not public.is_owner() then raise exception 'owner test account missing'; end if;
 if (select count(*) from public.get_ranking_candidates())<20 then raise exception 'owner candidates missing'; end if;
 select * into cfg from public.popular_rankings where division='technique';
 select jsonb_agg(value order by ordinality desc) into ids from jsonb_array_elements(cfg.content_ids) with ordinality;
 select * into changed from public.publish_popular_ranking('technique',ids,cfg.updated_at);
 first_id := ids->>0;
 if (select content_id from public.get_popular_rankings() where division='technique' and rank=1)<>first_id then raise exception 'published order ignored'; end if;
 begin perform public.publish_popular_ranking('technique',cfg.content_ids,cfg.updated_at); raise exception 'stale update permitted'; exception when serialization_failure then null; end;
 begin perform public.publish_popular_ranking('technique','[]',changed.updated_at); raise exception 'short list permitted'; exception when invalid_parameter_value then null; end;
 begin perform public.publish_popular_ranking('technique',jsonb_set(ids,'{1}',ids->0),changed.updated_at); raise exception 'duplicates permitted'; exception when invalid_parameter_value then null; end;
 begin perform public.publish_popular_ranking('technique',jsonb_set(ids,'{1}','"missing-content"'),changed.updated_at); raise exception 'unpublished content permitted'; exception when invalid_parameter_value then null; end;
 begin update public.techniques set status='archived' where id=first_id; raise exception 'ranked article archived'; exception when check_violation then null; end;
 if (select count(*) from public.get_popular_rankings())<>20 then raise exception 'ranking count changed'; end if;
end $$;
rollback;
select 'ranking permissions, publishing, stale writes, uniqueness and archive protection: passed' result;
