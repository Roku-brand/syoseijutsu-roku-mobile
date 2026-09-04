-- Private checkpoint storage for machine-run operational imports.
-- No client role receives access; only the service role used by the ingestion
-- function can read or update these rows.

create table if not exists public.operation_automation_state (
  id text primary key,
  last_successful_check_at timestamptz,
  processed_message_ids jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.operation_automation_state enable row level security;

comment on table public.operation_automation_state is
'Private checkpoints and deduplication state for trusted operational automations.';
