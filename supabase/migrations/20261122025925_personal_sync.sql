begin;

create table private.personal_sync_head (
  user_id uuid primary key references auth.users(id) on delete cascade,
  epoch integer not null default 1,
  revision bigint not null default 0
);
create table private.personal_sync_item (
  user_id uuid references private.personal_sync_head on delete cascade,
  key text not null,
  revision bigint not null,
  value jsonb,
  primary key (user_id, key),
  unique (user_id, revision)
);
create table private.personal_sync_device (
  user_id uuid references private.personal_sync_head on delete cascade,
  device text not null,
  sequence bigint not null,
  primary key (user_id, device)
);
create table private.personal_sync_recovery (
  id bigint generated always as identity primary key,
  user_id uuid not null references private.personal_sync_head on delete cascade,
  key text not null,
  value jsonb not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index personal_sync_recovery_account on private.personal_sync_recovery (user_id, id desc);
create index personal_sync_recovery_expiry on private.personal_sync_recovery (created_at);

alter table private.personal_sync_head enable row level security;
alter table private.personal_sync_item enable row level security;
alter table private.personal_sync_device enable row level security;
alter table private.personal_sync_recovery enable row level security;
revoke all on private.personal_sync_head, private.personal_sync_item, private.personal_sync_device, private.personal_sync_recovery
  from public, anon, authenticated;

-- Only the API below may access the RLS-protected tables. Bind every call to the
-- live account, and lock its account row before the sync head to serialize deletion.
create function private.personal_sync_account(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_user is null or p_user is distinct from auth.uid() then
    raise exception 'Account mismatch' using errcode = '42501';
  end if;
  perform 1 from auth.users where id = p_user for key share;
  if not found then raise exception 'Account unavailable' using errcode = '42501'; end if;
end;
$$;

create function private.personal_sync_notice_accepted(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select coalesce((
    (raw_user_meta_data->>'terms_version' = '3.5' and raw_user_meta_data->>'privacy_version' = '2.2'
      and raw_user_meta_data->>'terms_accepted_at' is not null)
    or (raw_user_meta_data->>'personal_sync_terms_version' = '3.5' and raw_user_meta_data->>'personal_sync_privacy_version' = '2.2'
      and raw_user_meta_data->>'personal_sync_accepted_at' is not null)
  ), false) from auth.users where id = p_user;
$$;

create function public.accept_personal_sync_notice(p_user uuid, p_terms text, p_privacy text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform private.personal_sync_account(p_user);
  if p_terms is distinct from '3.5' or p_privacy is distinct from '2.2' then
    raise exception 'Unknown notice version' using errcode = '22023';
  end if;
  update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) ||
    jsonb_build_object('personal_sync_accepted_at', now(), 'personal_sync_terms_version', p_terms, 'personal_sync_privacy_version', p_privacy)
    where id = p_user and not private.personal_sync_notice_accepted(p_user);
  return true;
end;
$$;

create function private.seed_personal_sync(p_user uuid) returns bigint
language sql set search_path = '' as $$
  with backup as (
    select data->'data' as data from public.personal_backups
    where user_id = p_user and data->>'format' = 'shoseijutsuroku-personal-data'
      and data->>'version' = '1'
  ), fields as (
    select f.key, f.value from backup, lateral jsonb_each(
      case when jsonb_typeof(data) = 'object' then data else '{}'::jsonb end
    ) as f
  ), expanded as (
    select jsonb_build_array(f.key)::text as key, f.value
    from fields f where f.key in ('personalPrinciple','learningUnlimited','interests','learningCurriculumVersion')
      and f.value <> 'null'::jsonb
      and not (f.key = 'personalPrinciple' and f.value = '"志は高く、腰は低く。"'::jsonb)
      and not (f.key = 'learningUnlimited' and f.value = 'false'::jsonb)
      and not (f.key = 'interests' and f.value = '["interpersonal","work","life"]'::jsonb)
    union all
    select jsonb_build_array(f.key, i.value #>> '{}')::text, 'true'::jsonb
    from fields f cross join lateral jsonb_array_elements(
      case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end) i
    where f.key in ('savedIds','savedTheoryIds','savedFeatureIds','reviewCaseIds') and jsonb_typeof(i.value) = 'string'
    union all
    select jsonb_build_array(f.key, i.value #>> '{}')::text, to_jsonb(-i.rank)
    from fields f cross join lateral jsonb_array_elements(
      case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end) with ordinality i(value, rank)
    where f.key in ('historyIds','featureHistoryIds') and jsonb_typeof(i.value) = 'string'
    union all
    select jsonb_build_array(f.key, i.value->>'id')::text, i.value
    from fields f cross join lateral jsonb_array_elements(
      case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end) i
    where f.key in ('personalMemos','personalMemoFolders','libraryFolders') and jsonb_typeof(i.value->'id') = 'string'
    union all
    select jsonb_build_array('personalMemos', legacy.id)::text,
      jsonb_build_object('id', legacy.id, 'text', btrim(i.value #>> '{}'), 'folderId', null, 'createdAt', '1970-01-01T00:00:00.000Z')
    from fields f cross join lateral jsonb_array_elements(
      case when jsonb_typeof(f.value) = 'array' then f.value else '[]'::jsonb end) with ordinality i(value, rank)
    cross join lateral (select 'legacy-memo-' || (i.rank - 1)::text || '-' || left(i.value #>> '{}', 12) as id) legacy
    where f.key = 'personalMemos' and jsonb_typeof(i.value) = 'string' and btrim(i.value #>> '{}') <> ''
    union all
    select jsonb_build_array(f.key, i.key)::text, i.value
    from fields f cross join lateral jsonb_each(
      case when jsonb_typeof(f.value) = 'object' then f.value else '{}'::jsonb end) i
    where f.key in ('notes','practiceRecords','learningRecords','libraryFolderByItem') and i.value <> 'null'::jsonb
  ), distinct_items as (
    select distinct on (key::jsonb) key::jsonb as identity, value from expanded
    where octet_length(key) <= 2000 and (jsonb_array_length(key::jsonb) = 1 or length(key::jsonb->>1) > 0)
  ), inserted as (
    insert into private.personal_sync_item (user_id, key, revision, value)
    select p_user, identity::text, row_number() over (order by identity), value from distinct_items
    returning revision
  )
  select coalesce(max(revision), 0) from inserted;
$$;

create function public.sync_personal_records(
  p_user uuid, p_epoch integer, p_cursor bigint, p_device text, p_sequence bigint, p_changes jsonb
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  h private.personal_sync_head%rowtype;
  existing private.personal_sync_item%rowtype;
  op jsonb;
  identity jsonb;
  item_key text;
  field text;
  next_value jsonb;
  base bigint;
  ack bigint := 0;
  did_insert boolean;
  page jsonb;
  cursor_at bigint;
begin
  perform private.personal_sync_account(p_user);
  if not private.personal_sync_notice_accepted(p_user) then
    raise exception 'Review the sync notice first' using errcode = '42501';
  end if;
  if p_cursor is null or p_cursor < 0 or p_changes is null
    or jsonb_typeof(p_changes) <> 'array' or octet_length(p_changes::text) > 6291456
    or p_device is null or p_device !~ '^[a-zA-Z0-9-]{16,80}$'
    or p_sequence is null or p_sequence < 0 then
    raise exception 'Invalid sync request' using errcode = '22023';
  end if;
  if jsonb_array_length(p_changes) > 32 then raise exception 'Too many changes' using errcode = '22023'; end if;

  insert into private.personal_sync_head (user_id) values (p_user) on conflict do nothing returning true into did_insert;
  select * into strict h from private.personal_sync_head where user_id = p_user for update;
  if did_insert then
    h.revision := private.seed_personal_sync(p_user);
    update private.personal_sync_head set revision = h.revision where user_id = p_user;
  end if;

  if p_epoch is distinct from h.epoch then
    return jsonb_build_object('epoch', h.epoch, 'cursor', 0, 'more', h.revision > 0, 'reset', true, 'ack', 0, 'items', '[]'::jsonb);
  end if;
  if p_cursor > h.revision then raise exception 'Invalid revision' using errcode = '22023'; end if;

  if jsonb_array_length(p_changes) > 0 then
    select sequence into ack from private.personal_sync_device where user_id = p_user and device = p_device;
    ack := coalesce(ack, 0);
    if p_sequence > ack then
      if p_sequence <> ack + 1 then raise exception 'Invalid sequence' using errcode = '22023'; end if;
      for op in select value from jsonb_array_elements(p_changes) loop
        identity := (op->>'key')::jsonb;
        field := identity->>0;
        item_key := identity::text;
        base := (op->>'base')::bigint;
        if identity is null or jsonb_typeof(identity) <> 'array' or octet_length(item_key) > 2000
          or base is null or base < 0 or base > h.revision
          or jsonb_typeof(op->'deleted') is distinct from 'boolean' then
          raise exception 'Invalid item' using errcode = '22023';
        end if;
        if not coalesce(
          (field in ('personalPrinciple','learningUnlimited','interests','learningCurriculumVersion')
              and jsonb_array_length(identity) = 1)
          or (field in ('savedIds','savedTheoryIds','savedFeatureIds','reviewCaseIds','notes','practiceRecords','learningRecords',
              'libraryFolderByItem','personalMemos','personalMemoFolders','libraryFolders','historyIds','featureHistoryIds') and jsonb_array_length(identity) = 2
              and jsonb_typeof(identity->1) = 'string' and length(identity->>1) > 0), false) then
          raise exception 'Unknown item key' using errcode = '22023';
        end if;
        next_value := case when (op->>'deleted')::boolean then null else op->'value' end;
        if not (op->>'deleted')::boolean and (next_value is null or next_value = 'null'::jsonb) then
          raise exception 'Missing item value' using errcode = '22023';
        end if;

        select * into existing from private.personal_sync_item where user_id = p_user and key = item_key;
        if existing.key is not null and existing.value is not distinct from next_value then continue; end if;
        if coalesce(existing.revision, 0) <> base then
          if next_value is not null then
            insert into private.personal_sync_recovery (user_id,key,value,reason) values (p_user,item_key,next_value,'conflict');
          elsif existing.value is not null then
            insert into private.personal_sync_recovery (user_id,key,value,reason) values (p_user,item_key,existing.value,'delete_conflict');
          end if;
          continue;
        end if;
        if existing.value is not null and (next_value is null or field in ('personalMemos','notes','personalPrinciple','libraryFolders','personalMemoFolders')) then
          insert into private.personal_sync_recovery (user_id,key,value,reason)
          values (p_user,item_key,existing.value,case when next_value is null then 'deleted' else 'edited' end);
        end if;
        h.revision := h.revision + 1;
        insert into private.personal_sync_item (user_id,key,revision,value) values (p_user,item_key,h.revision,next_value)
          on conflict (user_id,key) do update set revision = excluded.revision, value = excluded.value;
      end loop;
      update private.personal_sync_head set revision = h.revision where user_id = p_user;
      insert into private.personal_sync_device (user_id,device,sequence) values (p_user,p_device,p_sequence)
        on conflict (user_id,device) do update set sequence = excluded.sequence;
      ack := p_sequence;
      delete from private.personal_sync_recovery where user_id = p_user and (
        created_at < now() - interval '30 days' or id in (
          select id from (
            select id, row_number() over (order by id desc) as rank,
              sum(octet_length(value::text)) over (order by id desc rows unbounded preceding) as bytes
            from private.personal_sync_recovery where user_id = p_user
          ) ranked where rank > 100 or (rank > 1 and bytes > 1048576)
        )
      );
    end if;
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('key', key, 'revision', revision, 'value', value) order by revision), '[]'::jsonb),
    coalesce(max(revision), h.revision)
  into page, cursor_at
  from (
    select *, coalesce(sum(octet_length(value::text)) over (order by revision rows between unbounded preceding and 1 preceding), 0) as prior_bytes
    from (select key, revision, value from private.personal_sync_item
      where user_id = p_user and revision > p_cursor order by revision limit 32) items
  ) bounded where prior_bytes <= 262144;
  return jsonb_build_object('epoch', h.epoch, 'cursor', cursor_at, 'more', cursor_at < h.revision, 'reset', false, 'ack', ack, 'items', page);
end;
$$;

-- A user may exercise the deletion control before accepting the sync notice.
-- Reading the generation does not import or store a personal record.
create function public.personal_record_sync_epoch(p_user uuid) returns integer
language plpgsql security definer set search_path = '' as $$
begin
  perform private.personal_sync_account(p_user);
  return coalesce((select epoch from private.personal_sync_head where user_id = p_user), 1);
end;
$$;

create function public.clear_personal_records(p_user uuid, p_epoch integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare current_epoch integer;
begin
  perform private.personal_sync_account(p_user);
  insert into private.personal_sync_head (user_id) values (p_user) on conflict do nothing;
  select epoch into strict current_epoch from private.personal_sync_head where user_id = p_user for update;
  if p_epoch is null or p_epoch > current_epoch then raise exception 'Invalid epoch' using errcode = '22023'; end if;
  if p_epoch = current_epoch then
    delete from private.personal_sync_item where user_id = p_user;
    delete from private.personal_sync_recovery where user_id = p_user;
    delete from private.personal_sync_device where user_id = p_user;
    delete from public.personal_backups where user_id = p_user;
    current_epoch := current_epoch + 1;
    update private.personal_sync_head set epoch = current_epoch, revision = 0 where user_id = p_user;
  end if;
  return current_epoch;
end;
$$;

create function public.personal_record_recovery(p_user uuid, p_epoch integer, p_before bigint default null, p_id bigint default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  perform private.personal_sync_account(p_user);
  perform 1 from private.personal_sync_head where user_id = p_user and epoch = p_epoch for share;
  if not found then raise exception 'Sync required' using errcode = '22023'; end if;
  return (select coalesce(jsonb_agg(to_jsonb(entries) order by id desc), '[]'::jsonb)
    from (select id, key, case when p_id is not null then value else null end as value,
      case when jsonb_typeof(value) = 'string' then left(value #>> '{}', 100)
        else left(coalesce(value->>'text', value->>'name', key::jsonb->>1, ''), 100) end as preview,
      reason, created_at from private.personal_sync_recovery
      where user_id = p_user and created_at >= now() - interval '30 days'
        and (p_before is null or id < p_before) and (p_id is null or id = p_id)
      order by id desc limit 20) entries);
end;
$$;

-- Even an older app cannot write a manual cloud backup after a sync reset.
create function private.guard_legacy_personal_backup() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform 1 from auth.users where id = new.user_id for update;
  if exists (select 1 from private.personal_sync_head where user_id = new.user_id and epoch > 1) then
    raise exception 'Legacy cloud backup disabled after reset' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger personal_backup_reset_guard before insert or update on public.personal_backups
for each row execute function private.guard_legacy_personal_backup();

revoke all on function private.personal_sync_account(uuid), private.personal_sync_notice_accepted(uuid), private.seed_personal_sync(uuid), private.guard_legacy_personal_backup()
  from public, anon, authenticated;
revoke all on function public.sync_personal_records(uuid,integer,bigint,text,bigint,jsonb), public.clear_personal_records(uuid,integer),
  public.personal_record_recovery(uuid,integer,bigint,bigint), public.accept_personal_sync_notice(uuid,text,text),
  public.personal_record_sync_epoch(uuid) from public, anon, authenticated;
grant execute on function public.sync_personal_records(uuid,integer,bigint,text,bigint,jsonb), public.clear_personal_records(uuid,integer),
  public.personal_record_recovery(uuid,integer,bigint,bigint), public.accept_personal_sync_notice(uuid,text,text),
  public.personal_record_sync_epoch(uuid) to authenticated;

select cron.schedule('roku-personal-recovery-retention', '37 18 * * *',
  $job$delete from private.personal_sync_recovery where created_at < now() - interval '30 days'$job$);
commit;
