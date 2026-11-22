import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const a = '11111111-1111-4111-8111-111111111111';
const b = '22222222-2222-4222-8222-222222222222';
const c = '33333333-3333-4333-8333-333333333333';
const phone ='phone-1281475628147612';
const laptop = 'laptop-1281475628147612';
const note = JSON.stringify(['personalMemos', 'lesson']);
const memo = text => ({ id: 'lesson', text, createdAt: '2026-11-21T00:00:00.000Z', folderId: null });
const edit = (text, base) => ({ key: note, base, deleted: text === null, value: text === null ? null : memo(text) });

test('personal sync migration supports private migration, idempotent offline edits, revision conflicts, recovery and account deletion', async t => {
  const db = new PGlite();
  t.after(() => db.close());
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role;
    create schema auth;
    create schema private;
    create schema cron;
    create table auth.users (id uuid primary key, raw_user_meta_data jsonb default '{}'::jsonb);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    create function cron.schedule(text, text, text) returns bigint language sql as $$ select 1::bigint $$;
    grant usage on schema auth, private to authenticated;
    insert into auth.users (id) values ('${c}');
    insert into auth.users (id, raw_user_meta_data) values
      ('${a}', '{}'), ('${b}', '{"terms_version":"3.5","privacy_version":"2.2","terms_accepted_at":"2026-11-22"}');
  `);
  const baseline = await readFile(new URL('../../supabase/migrations/20261029095332_optimize_catalog_and_personal_backups.sql', import.meta.url), 'utf8');
  await db.exec(baseline.slice(baseline.indexOf('create table public.personal_backups'), baseline.indexOf('comment on view public.public_techniques')));
  const backup = { format: 'shoseijutsuroku-personal-data', version: 1, data: {
    savedIds: ['old'], personalMemos: [memo('旧バックアップの本文'), '旧形式の文字列メモ'],
    historyIds: ['recent', 'earlier'], notes: { old: '前のメモ' },
  } };
  await db.query('insert into public.personal_backups (user_id,data) values ($1,$2)', [a, backup]);
  await db.query('insert into public.personal_backups (user_id,data) values ($1,$2)', [c, backup]);
  await db.exec(await readFile(new URL('../../supabase/migrations/20261122025925_personal_sync.sql', import.meta.url), 'utf8'));

  const identify = async (id, role = 'authenticated') => {
    await db.exec('reset role');
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    await db.exec('set role ' + role);
  };
  const call = async (name, ...args) => {
    const { rows } = await db.query('select public.' + name + '(' + args.map((_, index) => '$' + (index + 1)).join(',') + ') as result', args);
    return rows[0].result;
  };
  const sync = (user, epoch, cursor, device, seq = 0, changes = []) =>
    call('sync_personal_records', user, epoch, cursor, device, seq, JSON.stringify(changes));

  await identify(c);
  await assert.rejects(sync(c, null, 0, phone), /notice/);
  assert.equal(await call('personal_record_sync_epoch', c), 1);
  assert.equal(await call('clear_personal_records', c, 1), 2);
  assert.equal((await db.query('select data from public.personal_backups')).rows.length, 0);
  await assert.rejects(sync(c, null, 0, phone), /notice/);

  await identify(a);
  await assert.rejects(sync(a, null, 0, phone), /notice/);
  assert.equal(await call('accept_personal_sync_notice', a, '3.5', '2.2'), true);
  assert.deepEqual(await sync(a, null, 0, phone), { epoch: 1, cursor: 0, more: true, reset: true, ack: 0, items: [] });
  const initial = await sync(a, 1, 0, phone);
  assert.equal(initial.items.length, 6);
  assert.ok(initial.items.some(item => item.value?.text === '旧形式の文字列メモ'));
  const oldNote = initial.items.find(item => JSON.parse(item.key)[1] === 'lesson');
  assert.equal(oldNote.value.text, '旧バックアップの本文');
  assert.equal((await db.query('select data from public.personal_backups')).rows.length, 1);
  assert.deepEqual(initial.items.filter(item => JSON.parse(item.key)[0] === 'historyIds').map(item => item.value).sort(), [-1, -2]);

  const first = await sync(a, 1, initial.cursor, phone, 1, [edit('端末側の編集', oldNote.revision)]);
  assert.equal(first.ack, 1);
  assert.equal(first.items[0].value.text, '端末側の編集');
  assert.deepEqual(await sync(a, 1, initial.cursor, phone, 1, [edit('端末側の編集', oldNote.revision)]), first);

  const competing = await sync(a, 1, initial.cursor, laptop, 1, [edit('別端末でオフライン編集した本文', oldNote.revision)]);
  assert.equal(competing.items[0].value.text, '端末側の編集');
  const recovery = await call('personal_record_recovery', a, 1, null, null);
  assert.equal(recovery.length, 2);
  const conflict = recovery.find(row => row.reason === 'conflict');
  assert.ok(conflict.preview.includes('別端末'));
  const details = await call('personal_record_recovery', a, 1, null, conflict.id);
  assert.equal(details[0].value.text, '別端末でオフライン編集した本文');

  const deletion = await sync(a, 1, first.cursor, phone, 2, [edit(null, first.items[0].revision)]);
  assert.equal(deletion.items[0].value, null);
  const stale = await sync(a, 1, first.cursor, laptop, 2, [edit('古い端末から再送', first.items[0].revision)]);
  assert.equal(stale.items[0].value, null);
  const revived = await sync(a, 1, deletion.cursor, phone, 3, [edit(details[0].value.text, deletion.items[0].revision)]);
  assert.equal(revived.items[0].value.text, '別端末でオフライン編集した本文');

  await identify(b);
  await assert.rejects(sync(a, 1, 0, laptop, 1, [edit('隠し書き込み', 0)]), /Account mismatch/);
  await assert.rejects(call('personal_record_recovery', a, 1, null, null), /Account mismatch/);
  await assert.rejects(call('clear_personal_records', a, 1), /Account mismatch/);
  await assert.rejects(db.query('select * from private.personal_sync_item'), /permission denied/);
  assert.equal((await sync(b, 1, 0, laptop)).items.length, 0);
  await identify('', 'anon');
  await assert.rejects(sync(a, 1, 0, laptop), /permission denied/);

  await identify(a);
  assert.equal(await call('clear_personal_records', a, 1), 2);
  assert.equal(await call('clear_personal_records', a, 1), 2);
  assert.equal((await sync(a, 1, revived.cursor, laptop, 3, [edit('削除前に送れなかった変更', 0)])).reset, true);
  assert.deepEqual((await sync(a, 2, 0, phone)).items, []);
  assert.deepEqual(await call('personal_record_recovery', a, 2, null, null), []);
  await assert.rejects(db.query('insert into public.personal_backups (user_id,data) values ($1,$2)', [a, backup]), /disabled after reset/);
  await sync(a, 2, 0, phone, 1, [edit('削除後に新規作成', 0)]);
  await db.exec('reset role');
  const syncSignature = 'public.sync_personal_records(uuid,integer,bigint,text,bigint,jsonb)';
  await db.exec('revoke execute on function ' + syncSignature + ' from authenticated');
  await identify(a);
  await assert.rejects(sync(a, 2, 0, phone), /permission denied/);
  await db.exec('reset role');
  await db.exec('grant execute on function ' + syncSignature + ' to authenticated');
  await identify(a);
  assert.equal((await sync(a, 2, 0, phone)).items[0].value.text, '削除後に新規作成');
  await db.exec('reset role');
  await db.query('delete from auth.users where id=$1', [a]);
  assert.equal((await db.query('select * from private.personal_sync_item where user_id=$1', [a])).rows.length, 0);
  await identify(a);
  await assert.rejects(sync(a, 2, 0, laptop), /Account unavailable/);
});
