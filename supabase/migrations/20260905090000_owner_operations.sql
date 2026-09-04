-- Owner-only operational control tower. External automations write through a
-- trusted service-role client; the application reads and updates through RLS.

create table if not exists public.operation_inquiries (
  id text primary key,
  subject text not null,
  sender text not null,
  received_at timestamptz not null,
  category text not null check (category in ('決済・購入', 'ログイン・アクセス', '不具合', '内容に関する質問', '要望・改善提案', 'その他')),
  urgency text not null check (urgency in ('high', 'medium', 'low')),
  ai_summary text not null default '',
  ai_reply_draft text not null default '',
  status text not null check (status in ('未確認', 'AI整理済み', '要返信', '要確認', '対応済み', '対応不要')),
  owner_memo text not null default '',
  original_body text not null default '',
  source_ref text not null default '',
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_social_posts (
  id text primary key,
  body text not null,
  source_technique_id text,
  source_theory_id text,
  format text not null check (format in ('処世術1選', '○選形式', '理論解説', '問いかけ', 'プロダクト紹介', '季節・時事', '再編集')),
  target_sns text not null default 'X',
  generated_at timestamptz not null,
  scheduled_at timestamptz,
  status text not null check (status in ('draft', '承認待ち', '承認済み', '予約済み', '投稿済み', '却下')),
  ai_reason text not null default '',
  similarity real not null default 0 check (similarity between 0 and 1),
  performance jsonb,
  owner_memo text not null default '',
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_ai_tasks (
  id text primary key,
  name text not null,
  last_run_at timestamptz not null,
  next_run_at timestamptz,
  status text not null check (status in ('success', 'failure')),
  processed_count integer not null default 0 check (processed_count >= 0),
  summary text not null default '',
  error text,
  outputs jsonb not null default '[]'::jsonb,
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_faq_candidates (
  id text primary key,
  question text not null,
  proposed_answer text not null default '',
  occurrence_count integer not null default 1 check (occurrence_count >= 1),
  source_inquiry_ids jsonb not null default '[]'::jsonb,
  category text not null check (category in ('決済・購入', 'ログイン・アクセス', '不具合', '内容に関する質問', '要望・改善提案', 'その他')),
  ai_reason text not null default '',
  status text not null check (status in ('候補', '採用', '保留', '却下')),
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.operation_activity_log (
  id text primary key,
  occurred_at timestamptz not null,
  actor text not null,
  action text not null,
  target text not null default '',
  status text not null check (status in ('success', 'failure')),
  detail text not null default '',
  schema_version integer not null default 1,
  updated_at timestamptz not null default now()
);

create index if not exists operation_inquiries_received_idx on public.operation_inquiries (received_at desc);
create index if not exists operation_inquiries_status_idx on public.operation_inquiries (status, urgency);
create index if not exists operation_social_posts_schedule_idx on public.operation_social_posts (scheduled_at, status);
create index if not exists operation_ai_tasks_last_run_idx on public.operation_ai_tasks (last_run_at desc);
create index if not exists operation_faq_candidates_status_idx on public.operation_faq_candidates (status, occurrence_count desc);
create index if not exists operation_activity_log_occurred_idx on public.operation_activity_log (occurred_at desc);

alter table public.operation_inquiries enable row level security;
alter table public.operation_social_posts enable row level security;
alter table public.operation_ai_tasks enable row level security;
alter table public.operation_faq_candidates enable row level security;
alter table public.operation_activity_log enable row level security;

create policy "owners manage operation inquiries" on public.operation_inquiries
for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owners manage operation social posts" on public.operation_social_posts
for all to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owners read operation ai tasks" on public.operation_ai_tasks
for select to authenticated using (public.is_owner());
create policy "owners read operation faq candidates" on public.operation_faq_candidates
for select to authenticated using (public.is_owner());
create policy "owners update operation faq candidates" on public.operation_faq_candidates
for update to authenticated using (public.is_owner()) with check (public.is_owner());
create policy "owners manage operation activity log" on public.operation_activity_log
for all to authenticated using (public.is_owner()) with check (public.is_owner());

grant select, insert, update, delete on public.operation_inquiries to authenticated;
grant select, insert, update, delete on public.operation_social_posts to authenticated;
grant select on public.operation_ai_tasks to authenticated;
grant select, update on public.operation_faq_candidates to authenticated;
grant select, insert, update, delete on public.operation_activity_log to authenticated;

comment on table public.operation_inquiries is 'Owner-only inquiries prepared by external AI tasks.';
comment on table public.operation_social_posts is 'Owner-reviewed social post candidates. No direct publishing integration.';
comment on table public.operation_ai_tasks is 'Read-only task run summaries written by trusted automations.';
comment on table public.operation_faq_candidates is 'FAQ candidates derived from recurring inquiries.';
comment on table public.operation_activity_log is 'Audit trail for automated and owner operational actions.';
