import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SERVER_NAME = 'shoseijutsuroku-operations';
const SERVER_VERSION = '1.0.0';
const INGEST_KEY_SHA256 = '83905e07d47a4c3fa5ddf77aef64b631c18090be8ee979e69de212d577ff42e0';
const AUTOMATION_ID = 'gpt-work-inquiry-triage';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'content-type, mcp-protocol-version, mcp-session-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id',
};

const categories = ['決済・購入', 'ログイン・アクセス', '不具合', '内容に関する質問', '要望・改善提案', 'その他'];
const urgencies = ['high', 'medium', 'low'];
const inquiryStatuses = ['AI整理済み', '要返信', '要確認', '対応不要'];

type JsonObject = Record<string, unknown>;

function jsonRpc(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function requiredString(value: unknown, name: string, maxLength: number) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${name} is required`);
  return value.trim().slice(0, maxLength);
}

function optionalString(value: unknown, maxLength: number) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isoDate(value: unknown, name: string) {
  const text = requiredString(value, name, 64);
  if (Number.isNaN(Date.parse(text))) throw new Error(`${name} must be an ISO 8601 date`);
  return new Date(text).toISOString();
}

function enumValue(value: unknown, values: string[], name: string) {
  const text = requiredString(value, name, 64);
  if (!values.includes(text)) throw new Error(`${name} is invalid`);
  return text;
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function authorize(args: JsonObject) {
  const key = typeof args.ingestKey === 'string' ? args.ingestKey : '';
  const actualHash = await sha256(key);
  if (actualHash.length !== INGEST_KEY_SHA256.length) return false;
  let difference = 0;
  for (let index = 0; index < actualHash.length; index += 1) {
    difference |= actualHash.charCodeAt(index) ^ INGEST_KEY_SHA256.charCodeAt(index);
  }
  return difference === 0;
}

function toolResult(data: JsonObject, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(data) }],
    structuredContent: data,
    isError,
  };
}

function tools() {
  const ingestKey = { type: 'string', description: '処世術禄専用の取込キー' };
  return [
    {
      name: 'get_inquiry_sync_state',
      title: '問い合わせ同期状態を取得',
      description: '問い合わせ確認を始める前に必ず呼び出し、前回の成功日時と処理済みGmail messageIdを取得します。',
      inputSchema: {
        type: 'object',
        properties: { ingestKey },
        required: ['ingestKey'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: 'record_inquiry_run',
      title: '問い合わせ確認結果を記録',
      description: 'Gmail確認が完了した場合に一度だけ呼び出し、問い合わせ、要約、返信案、対応評価、FAQ候補、実行結果をオーナーダッシュボードへ反映します。メール送信は行いません。',
      inputSchema: {
        type: 'object',
        properties: {
          ingestKey,
          runStartedAt: { type: 'string', description: '実行開始日時（ISO 8601）' },
          runCompletedAt: { type: 'string', description: '実行完了日時（ISO 8601）' },
          nextRunAt: { type: ['string', 'null'], description: '次回予定日時（ISO 8601、不明ならnull）' },
          checkedCount: { type: 'integer', minimum: 0 },
          excludedCount: { type: 'integer', minimum: 0 },
          processedMessageIds: { type: 'array', items: { type: 'string' }, maxItems: 500 },
          summary: { type: 'string', maxLength: 1000 },
          inquiries: {
            type: 'array',
            maxItems: 100,
            items: {
              type: 'object',
              properties: {
                gmailMessageId: { type: 'string' },
                subject: { type: 'string' },
                sender: { type: 'string' },
                receivedAt: { type: 'string' },
                category: { type: 'string', enum: categories },
                urgency: { type: 'string', enum: urgencies },
                aiSummary: { type: 'string' },
                aiReplyDraft: { type: 'string' },
                status: { type: 'string', enum: inquiryStatuses },
                originalBody: { type: 'string' },
              },
              required: ['gmailMessageId', 'subject', 'sender', 'receivedAt', 'category', 'urgency', 'aiSummary', 'aiReplyDraft', 'status', 'originalBody'],
              additionalProperties: false,
            },
          },
          faqCandidates: {
            type: 'array',
            maxItems: 30,
            items: {
              type: 'object',
              properties: {
                key: { type: 'string', description: '同じ質問で安定する短い識別子' },
                question: { type: 'string' },
                proposedAnswer: { type: 'string' },
                occurrenceCount: { type: 'integer', minimum: 2 },
                sourceMessageIds: { type: 'array', items: { type: 'string' } },
                category: { type: 'string', enum: categories },
                aiReason: { type: 'string' },
              },
              required: ['key', 'question', 'proposedAnswer', 'occurrenceCount', 'sourceMessageIds', 'category', 'aiReason'],
              additionalProperties: false,
            },
          },
        },
        required: ['ingestKey', 'runStartedAt', 'runCompletedAt', 'nextRunAt', 'checkedCount', 'excludedCount', 'processedMessageIds', 'summary', 'inquiries', 'faqCandidates'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    {
      name: 'record_inquiry_failure',
      title: '問い合わせ確認エラーを記録',
      description: 'Gmail確認または整理に失敗した場合に呼び出し、成功時刻を進めずエラーだけをダッシュボードへ記録します。',
      inputSchema: {
        type: 'object',
        properties: {
          ingestKey,
          occurredAt: { type: 'string', description: '失敗日時（ISO 8601）' },
          error: { type: 'string', maxLength: 2000 },
          nextRunAt: { type: ['string', 'null'] },
        },
        required: ['ingestKey', 'occurredAt', 'error', 'nextRunAt'],
        additionalProperties: false,
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
  ];
}

function adminClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) throw new Error('server_not_configured');
  return createClient(url, key, { auth: { persistSession: false } });
}

async function getState(args: JsonObject) {
  if (!(await authorize(args))) return toolResult({ error: 'unauthorized' }, true);
  const admin = adminClient();
  const { data, error } = await admin.from('operation_automation_state')
    .select('last_successful_check_at,processed_message_ids,updated_at')
    .eq('id', AUTOMATION_ID)
    .maybeSingle();
  if (error) return toolResult({ error: 'state_read_failed' }, true);
  return toolResult({
    automationId: AUTOMATION_ID,
    lastSuccessfulCheckAt: data?.last_successful_check_at ?? '2026-09-04T00:00:00+09:00',
    processedMessageIds: Array.isArray(data?.processed_message_ids) ? data.processed_message_ids : [],
    updatedAt: data?.updated_at ?? null,
  });
}

async function recordRun(args: JsonObject) {
  if (!(await authorize(args))) return toolResult({ error: 'unauthorized' }, true);
  const startedAt = isoDate(args.runStartedAt, 'runStartedAt');
  const completedAt = isoDate(args.runCompletedAt, 'runCompletedAt');
  const nextRunAt = args.nextRunAt === null ? null : isoDate(args.nextRunAt, 'nextRunAt');
  const checkedCount = Math.max(0, Math.floor(Number(args.checkedCount) || 0));
  const excludedCount = Math.max(0, Math.floor(Number(args.excludedCount) || 0));
  const summary = optionalString(args.summary, 1000);
  const processedIds = Array.isArray(args.processedMessageIds)
    ? args.processedMessageIds.slice(0, 500).map((value) => requiredString(value, 'processedMessageId', 512))
    : [];
  const inquiryInputs = Array.isArray(args.inquiries) ? args.inquiries.filter(isObject).slice(0, 100) : [];
  const faqInputs = Array.isArray(args.faqCandidates) ? args.faqCandidates.filter(isObject).slice(0, 30) : [];
  const admin = adminClient();

  const inquiryRows = await Promise.all(inquiryInputs.map(async (item) => {
    const messageId = requiredString(item.gmailMessageId, 'gmailMessageId', 512);
    return {
      id: `gmail-${(await sha256(messageId)).slice(0, 32)}`,
      subject: requiredString(item.subject, 'subject', 500),
      sender: requiredString(item.sender, 'sender', 500),
      received_at: isoDate(item.receivedAt, 'receivedAt'),
      category: enumValue(item.category, categories, 'category'),
      urgency: enumValue(item.urgency, urgencies, 'urgency'),
      ai_summary: requiredString(item.aiSummary, 'aiSummary', 3000),
      ai_reply_draft: optionalString(item.aiReplyDraft, 10000),
      status: enumValue(item.status, inquiryStatuses, 'status'),
      owner_memo: '',
      original_body: requiredString(item.originalBody, 'originalBody', 50000),
      source_ref: `gmail:${messageId}`,
      schema_version: 1,
      updated_at: completedAt,
    };
  }));

  if (inquiryRows.length) {
    const { error } = await admin.from('operation_inquiries').upsert(inquiryRows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) return toolResult({ error: 'inquiry_write_failed' }, true);
  }

  const faqRows = await Promise.all(faqInputs.map(async (item) => ({
    id: `faq-${(await sha256(requiredString(item.key, 'faq.key', 200))).slice(0, 32)}`,
    question: requiredString(item.question, 'faq.question', 1000),
    proposed_answer: optionalString(item.proposedAnswer, 10000),
    occurrence_count: Math.max(2, Math.floor(Number(item.occurrenceCount) || 2)),
    source_inquiry_ids: await Promise.all((Array.isArray(item.sourceMessageIds) ? item.sourceMessageIds : []).map(async (messageId) => `gmail-${(await sha256(requiredString(messageId, 'sourceMessageId', 512))).slice(0, 32)}`)),
    category: enumValue(item.category, categories, 'faq.category'),
    ai_reason: requiredString(item.aiReason, 'faq.aiReason', 3000),
    status: '候補',
    schema_version: 1,
    updated_at: completedAt,
  })));
  if (faqRows.length) {
    const { error } = await admin.from('operation_faq_candidates').upsert(faqRows, { onConflict: 'id', ignoreDuplicates: true });
    if (error) return toolResult({ error: 'faq_write_failed' }, true);
  }

  const { error: taskError } = await admin.from('operation_ai_tasks').upsert({
    id: AUTOMATION_ID,
    name: '問い合わせ確認・分類・返信案生成',
    last_run_at: completedAt,
    next_run_at: nextRunAt,
    status: 'success',
    processed_count: inquiryRows.length,
    summary: summary || `新規問い合わせ${inquiryRows.length}件を整理しました。`,
    error: null,
    outputs: ['operation_inquiries', ...(faqRows.length ? ['operation_faq_candidates'] : [])],
    schema_version: 1,
    updated_at: completedAt,
  });
  if (taskError) return toolResult({ error: 'task_write_failed' }, true);

  const logId = `inquiry-run-${(await sha256(completedAt)).slice(0, 24)}`;
  const { error: logError } = await admin.from('operation_activity_log').upsert({
    id: logId,
    occurred_at: completedAt,
    actor: 'GPT Work',
    action: '問い合わせ確認',
    target: `${inquiryRows.length}件`,
    status: 'success',
    detail: summary || `確認${checkedCount}件、対象外${excludedCount}件、新規問い合わせ${inquiryRows.length}件`,
    schema_version: 1,
    updated_at: completedAt,
  });
  if (logError) return toolResult({ error: 'log_write_failed' }, true);

  const { data: previous } = await admin.from('operation_automation_state')
    .select('processed_message_ids')
    .eq('id', AUTOMATION_ID)
    .maybeSingle();
  const previousIds = Array.isArray(previous?.processed_message_ids) ? previous.processed_message_ids.filter((value: unknown) => typeof value === 'string') : [];
  const mergedIds = Array.from(new Set([...previousIds, ...processedIds])).slice(-5000);
  const { error: stateError } = await admin.from('operation_automation_state').upsert({
    id: AUTOMATION_ID,
    last_successful_check_at: completedAt,
    processed_message_ids: mergedIds,
    updated_at: completedAt,
  });
  if (stateError) return toolResult({ error: 'state_write_failed' }, true);

  return toolResult({
    ok: true,
    automationId: AUTOMATION_ID,
    checkedCount,
    excludedCount,
    recordedInquiries: inquiryRows.length,
    recordedFaqCandidates: faqRows.length,
    lastSuccessfulCheckAt: completedAt,
    runStartedAt: startedAt,
  });
}

async function recordFailure(args: JsonObject) {
  if (!(await authorize(args))) return toolResult({ error: 'unauthorized' }, true);
  const occurredAt = isoDate(args.occurredAt, 'occurredAt');
  const nextRunAt = args.nextRunAt === null ? null : isoDate(args.nextRunAt, 'nextRunAt');
  const errorMessage = requiredString(args.error, 'error', 2000);
  const admin = adminClient();
  const { error: taskError } = await admin.from('operation_ai_tasks').upsert({
    id: AUTOMATION_ID,
    name: '問い合わせ確認・分類・返信案生成',
    last_run_at: occurredAt,
    next_run_at: nextRunAt,
    status: 'failure',
    processed_count: 0,
    summary: '問い合わせ確認に失敗しました。',
    error: errorMessage,
    outputs: [],
    schema_version: 1,
    updated_at: occurredAt,
  });
  if (taskError) return toolResult({ error: 'task_write_failed' }, true);
  const logId = `inquiry-failure-${(await sha256(occurredAt)).slice(0, 24)}`;
  const { error: logError } = await admin.from('operation_activity_log').upsert({
    id: logId,
    occurred_at: occurredAt,
    actor: 'GPT Work',
    action: '問い合わせ確認',
    target: 'Gmail',
    status: 'failure',
    detail: errorMessage,
    schema_version: 1,
    updated_at: occurredAt,
  });
  if (logError) return toolResult({ error: 'log_write_failed' }, true);
  return toolResult({ ok: true, checkpointAdvanced: false, occurredAt });
}

async function callTool(params: JsonObject) {
  const name = typeof params.name === 'string' ? params.name : '';
  const args = isObject(params.arguments) ? params.arguments : {};
  try {
    if (name === 'get_inquiry_sync_state') return await getState(args);
    if (name === 'record_inquiry_run') return await recordRun(args);
    if (name === 'record_inquiry_failure') return await recordFailure(args);
    return toolResult({ error: 'unknown_tool' }, true);
  } catch (error) {
    return toolResult({ error: error instanceof Error ? error.message : 'invalid_request' }, true);
  }
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return jsonRpc({ error: 'method_not_allowed' }, 405);
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > 1_000_000) return jsonRpc({ error: 'payload_too_large' }, 413);

  let message: JsonObject;
  try {
    const parsed = await request.json();
    if (!isObject(parsed)) throw new Error('invalid_json_rpc');
    message = parsed;
  } catch {
    return jsonRpc({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } }, 400);
  }

  const id = message.id ?? null;
  const method = typeof message.method === 'string' ? message.method : '';
  if (method === 'notifications/initialized' || method === 'notifications/cancelled') {
    return new Response(null, { status: 202, headers: corsHeaders });
  }
  if (method === 'initialize') {
    const requested = isObject(message.params) && typeof message.params.protocolVersion === 'string'
      ? message.params.protocolVersion
      : '2025-06-18';
    return jsonRpc({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: requested,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
      },
    });
  }
  if (method === 'ping') return jsonRpc({ jsonrpc: '2.0', id, result: {} });
  if (method === 'tools/list') return jsonRpc({ jsonrpc: '2.0', id, result: { tools: tools() } });
  if (method === 'tools/call') {
    const params = isObject(message.params) ? message.params : {};
    return jsonRpc({ jsonrpc: '2.0', id, result: await callTool(params) });
  }
  return jsonRpc({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } }, 404);
});
