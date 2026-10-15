import fs from 'node:fs';
const base=fs.readFileSync('supabase/migrations/20261015121152_theory_knowledge_network.sql','utf8');
const extract=name=>{const start=base.indexOf('CREATE OR REPLACE FUNCTION public.'+name+'(');const end=base.indexOf('$function$',base.indexOf('AS $function$',start)+14)+11;return base.slice(start,end).trim();};
let sql=`-- Keep relation edits private until the existing publish action succeeds.
alter table public.theories add column draft_relations jsonb check(draft_relations is null or jsonb_typeof(draft_relations)='array');
create table public.theory_quote_reviews(
 candidate_id text primary key check(candidate_id ~ '^[0-9]{2}$' and candidate_id::integer between 1 and 50),
 audit jsonb not null check(jsonb_typeof(audit)='object'),
 theory_id text references public.theories(id), updated_at timestamptz not null default now()
);
alter table public.theory_quote_reviews enable row level security;
revoke all on public.theory_quote_reviews from public,anon,authenticated;
grant select,insert,update,delete on public.theory_quote_reviews to authenticated;
grant all on public.theory_quote_reviews to service_role;
create policy theory_quote_review_owner on public.theory_quote_reviews for all to authenticated using((select public.is_owner())) with check((select public.is_owner()));
`;
for(const name of ['publish_theory','save_theory_draft']){
 let d=extract(name);
 if(!d.endsWith('$function$'))throw Error('extract '+name+': '+d.slice(-50));
 d=d.replace("  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id)",`  if payload ? 'expected_updated_at' and exists(select 1 from public.theories where id=target_theory_id and updated_at is distinct from (payload->>'expected_updated_at')::timestamptz) then raise exception '他の編集が保存されました。再読込して差分を確認してください。' using errcode='40001';end if;
  if exists(select 1 from public.theories where id=target_theory_id and canonical_id<>id)`);
 if(name==='save_theory_draft')d=d.replace('  update public.theories set knowledge_type=',"  update public.theories set draft_relations=case when payload ? 'relations' then payload->'relations' else draft_relations end, knowledge_type=");
 else {d=d.replace('  update public.theories set knowledge_type=',"  update public.theories set draft_relations=null, knowledge_type=");d=d.replace("  if payload ? 'relations' then perform public.set_theory_relations(target_theory_id,payload->'relations');end if;",`  if payload ? 'relations' then perform public.set_theory_relations(target_theory_id,payload->'relations');end if;`);}
 sql+='\n'+d+';\n';
}
fs.writeFileSync('supabase/migrations/20261015123353_theory_network_editor_drafts.sql',sql);console.log(sql.length);
