import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceRoleKey) throw new Error('SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を環境変数に設定してください。');

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const operationsDir = path.join(root, 'operations');
const supabase = createClient(url, serviceRoleKey, { auth: { persistSession: false } });

async function readItems(fileName) {
  const parsed = JSON.parse(await fs.readFile(path.join(operationsDir, fileName), 'utf8'));
  if (parsed.schemaVersion !== 1 || !Array.isArray(parsed.items)) throw new Error(`${fileName}: schemaVersion 1 の items 配列が必要です。`);
  const ids = parsed.items.map((item) => item.id);
  if (ids.some((id) => typeof id !== 'string' || !id)) throw new Error(`${fileName}: すべての項目に id が必要です。`);
  if (new Set(ids).size !== ids.length) throw new Error(`${fileName}: id が重複しています。`);
  return parsed.items;
}

const definitions = [
  ['operation_inquiries', 'inquiries.json', ['category', 'urgency', 'status', 'owner_memo'], (row) => ({ id: row.id, subject: row.subject, sender: row.sender, received_at: row.receivedAt, category: row.category, urgency: row.urgency, ai_summary: row.aiSummary, ai_reply_draft: row.aiReplyDraft, status: row.status, owner_memo: row.ownerMemo, original_body: row.originalBody, source_ref: row.sourceRef, schema_version: 1, updated_at: row.updatedAt })],
  ['operation_social_posts', 'social-posts.json', ['body', 'scheduled_at', 'status', 'owner_memo'], (row) => ({ id: row.id, body: row.body, source_technique_id: row.sourceTechniqueId, source_theory_id: row.sourceTheoryId, format: row.format, target_sns: row.targetSns, generated_at: row.generatedAt, scheduled_at: row.scheduledAt, status: row.status, ai_reason: row.aiReason, similarity: row.similarity, performance: row.performance, owner_memo: row.ownerMemo, schema_version: 1, updated_at: row.updatedAt })],
  ['operation_ai_tasks', 'ai-tasks.json', [], (row) => ({ id: row.id, name: row.name, last_run_at: row.lastRunAt, next_run_at: row.nextRunAt, status: row.status, processed_count: row.processedCount, summary: row.summary, error: row.error, outputs: row.outputs, schema_version: 1, updated_at: row.updatedAt })],
  ['operation_faq_candidates', 'faq-candidates.json', ['proposed_answer', 'status'], (row) => ({ id: row.id, question: row.question, proposed_answer: row.proposedAnswer, occurrence_count: row.occurrenceCount, source_inquiry_ids: row.sourceInquiryIds, category: row.category, ai_reason: row.aiReason, status: row.status, schema_version: 1, updated_at: row.updatedAt })],
  ['operation_activity_log', 'activity-log.json', [], (row) => ({ id: row.id, occurred_at: row.occurredAt, actor: row.actor, action: row.action, target: row.target, status: row.status, detail: row.detail, schema_version: 1, updated_at: row.updatedAt })],
];

for (const [table, fileName, preservedFields, mapRow] of definitions) {
  const items = await readItems(fileName);
  if (!items.length) {
    console.log(`${fileName}: 0件のため同期を省略しました。`);
    continue;
  }
  const incoming = items.map(mapRow);
  if (preservedFields.length) {
    const selectColumns = ['id', ...preservedFields].join(',');
    const { data: existing, error: readError } = await supabase.from(table).select(selectColumns).in('id', incoming.map((row) => row.id));
    if (readError) throw readError;
    const existingById = new Map((existing ?? []).map((row) => [row.id, row]));
    for (const row of incoming) {
      const current = existingById.get(row.id);
      if (!current) continue;
      for (const field of preservedFields) row[field] = current[field];
    }
  }
  const { error } = await supabase.from(table).upsert(incoming, { onConflict: 'id' });
  if (error) throw error;
  console.log(`${fileName}: ${items.length}件を ${table} へ同期しました。`);
}
