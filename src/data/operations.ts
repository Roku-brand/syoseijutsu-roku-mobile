import activityLogSource from '../../operations/activity-log.json';
import aiTasksSource from '../../operations/ai-tasks.json';
import faqCandidatesSource from '../../operations/faq-candidates.json';
import inquiriesSource from '../../operations/inquiries.json';
import socialPostsSource from '../../operations/social-posts.json';
import { supabase } from '@/lib/supabase';

export const INQUIRY_CATEGORIES = ['決済・購入', 'ログイン・アクセス', '不具合', '内容に関する質問', '要望・改善提案', 'その他'] as const;
export const INQUIRY_URGENCIES = ['high', 'medium', 'low'] as const;
export const INQUIRY_STATUSES = ['未確認', 'AI整理済み', '要返信', '要確認', '対応済み', '対応不要'] as const;
export const SOCIAL_FORMATS = ['処世術1選', '○選形式', '理論解説', '問いかけ', 'プロダクト紹介', '季節・時事', '再編集'] as const;
export const SOCIAL_STATUSES = ['draft', '承認待ち', '承認済み', '予約済み', '投稿済み', '却下'] as const;
export const FAQ_STATUSES = ['候補', '採用', '保留', '却下'] as const;

export type InquiryCategory = typeof INQUIRY_CATEGORIES[number];
export type InquiryUrgency = typeof INQUIRY_URGENCIES[number];
export type InquiryStatus = typeof INQUIRY_STATUSES[number];
export type SocialFormat = typeof SOCIAL_FORMATS[number];
export type SocialStatus = typeof SOCIAL_STATUSES[number];
export type FaqStatus = typeof FAQ_STATUSES[number];
export type TaskStatus = 'success' | 'failure';

export type Inquiry = {
  id: string;
  subject: string;
  sender: string;
  receivedAt: string;
  category: InquiryCategory;
  urgency: InquiryUrgency;
  aiSummary: string;
  aiReplyDraft: string;
  status: InquiryStatus;
  ownerMemo: string;
  originalBody: string;
  sourceRef: string;
  updatedAt: string;
};

export type SocialPerformance = { impressions: number; likes: number; reposts: number; bookmarks: number };

export type SocialPost = {
  id: string;
  body: string;
  sourceTechniqueId: string | null;
  sourceTheoryId: string | null;
  format: SocialFormat;
  targetSns: string;
  generatedAt: string;
  scheduledAt: string | null;
  status: SocialStatus;
  aiReason: string;
  similarity: number;
  performance: SocialPerformance | null;
  ownerMemo: string;
  updatedAt: string;
};

export type AiTask = {
  id: string;
  name: string;
  lastRunAt: string;
  nextRunAt: string | null;
  status: TaskStatus;
  processedCount: number;
  summary: string;
  error: string | null;
  outputs: string[];
  updatedAt: string;
};

export type FaqCandidate = {
  id: string;
  question: string;
  proposedAnswer: string;
  occurrenceCount: number;
  sourceInquiryIds: string[];
  category: InquiryCategory;
  aiReason: string;
  status: FaqStatus;
  updatedAt: string;
};

export type ActivityLog = {
  id: string;
  occurredAt: string;
  actor: string;
  action: string;
  target: string;
  status: TaskStatus;
  detail: string;
  updatedAt: string;
};

export type OperationsData = {
  inquiries: Inquiry[];
  socialPosts: SocialPost[];
  aiTasks: AiTask[];
  faqCandidates: FaqCandidate[];
  activityLog: ActivityLog[];
  source: 'database' | 'bundled';
  warning: string | null;
};

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function stringValue(record: JsonRecord, key: string, fallback = '') {
  return typeof record[key] === 'string' ? record[key] as string : fallback;
}

function nullableString(record: JsonRecord, key: string) {
  return record[key] === null ? null : stringValue(record, key) || null;
}

function numberValue(record: JsonRecord, key: string, fallback = 0) {
  return typeof record[key] === 'number' && Number.isFinite(record[key]) ? record[key] as number : fallback;
}

function stringArray(record: JsonRecord, key: string) {
  return Array.isArray(record[key]) ? (record[key] as unknown[]).filter((value): value is string => typeof value === 'string') : [];
}

function hasValue<T extends readonly string[]>(values: T, value: string): value is T[number] {
  return values.includes(value as T[number]);
}

function sourceItems(source: unknown): JsonRecord[] {
  if (!isRecord(source) || source.schemaVersion !== 1 || !Array.isArray(source.items)) return [];
  return source.items.filter(isRecord);
}

function normalizeInquiry(row: JsonRecord): Inquiry | null {
  const id = stringValue(row, 'id');
  const status = stringValue(row, 'status');
  const category = stringValue(row, 'category');
  const urgency = stringValue(row, 'urgency');
  if (!id || !hasValue(INQUIRY_STATUSES, status) || !hasValue(INQUIRY_CATEGORIES, category) || !hasValue(INQUIRY_URGENCIES, urgency)) return null;
  return {
    id,
    subject: stringValue(row, 'subject', '件名なし'),
    sender: stringValue(row, 'sender', '送信者不明'),
    receivedAt: stringValue(row, 'receivedAt') || stringValue(row, 'received_at'),
    category,
    urgency,
    aiSummary: stringValue(row, 'aiSummary') || stringValue(row, 'ai_summary'),
    aiReplyDraft: stringValue(row, 'aiReplyDraft') || stringValue(row, 'ai_reply_draft'),
    status,
    ownerMemo: stringValue(row, 'ownerMemo') || stringValue(row, 'owner_memo'),
    originalBody: stringValue(row, 'originalBody') || stringValue(row, 'original_body'),
    sourceRef: stringValue(row, 'sourceRef') || stringValue(row, 'source_ref'),
    updatedAt: stringValue(row, 'updatedAt') || stringValue(row, 'updated_at'),
  };
}

function normalizeSocialPost(row: JsonRecord): SocialPost | null {
  const id = stringValue(row, 'id');
  const status = stringValue(row, 'status');
  const format = stringValue(row, 'format');
  if (!id || !hasValue(SOCIAL_STATUSES, status) || !hasValue(SOCIAL_FORMATS, format)) return null;
  const performanceValue = row.performance;
  const performance = isRecord(performanceValue) ? {
    impressions: numberValue(performanceValue, 'impressions'),
    likes: numberValue(performanceValue, 'likes'),
    reposts: numberValue(performanceValue, 'reposts'),
    bookmarks: numberValue(performanceValue, 'bookmarks'),
  } : null;
  return {
    id,
    body: stringValue(row, 'body'),
    sourceTechniqueId: nullableString(row, 'sourceTechniqueId') ?? nullableString(row, 'source_technique_id'),
    sourceTheoryId: nullableString(row, 'sourceTheoryId') ?? nullableString(row, 'source_theory_id'),
    format,
    targetSns: stringValue(row, 'targetSns') || stringValue(row, 'target_sns', 'X'),
    generatedAt: stringValue(row, 'generatedAt') || stringValue(row, 'generated_at'),
    scheduledAt: nullableString(row, 'scheduledAt') ?? nullableString(row, 'scheduled_at'),
    status,
    aiReason: stringValue(row, 'aiReason') || stringValue(row, 'ai_reason'),
    similarity: numberValue(row, 'similarity'),
    performance,
    ownerMemo: stringValue(row, 'ownerMemo') || stringValue(row, 'owner_memo'),
    updatedAt: stringValue(row, 'updatedAt') || stringValue(row, 'updated_at'),
  };
}

function normalizeAiTask(row: JsonRecord): AiTask | null {
  const id = stringValue(row, 'id');
  const status = stringValue(row, 'status');
  if (!id || (status !== 'success' && status !== 'failure')) return null;
  return {
    id,
    name: stringValue(row, 'name'),
    lastRunAt: stringValue(row, 'lastRunAt') || stringValue(row, 'last_run_at'),
    nextRunAt: nullableString(row, 'nextRunAt') ?? nullableString(row, 'next_run_at'),
    status,
    processedCount: numberValue(row, 'processedCount', numberValue(row, 'processed_count')),
    summary: stringValue(row, 'summary'),
    error: nullableString(row, 'error'),
    outputs: stringArray(row, 'outputs'),
    updatedAt: stringValue(row, 'updatedAt') || stringValue(row, 'updated_at'),
  };
}

function normalizeFaq(row: JsonRecord): FaqCandidate | null {
  const id = stringValue(row, 'id');
  const status = stringValue(row, 'status');
  const category = stringValue(row, 'category');
  if (!id || !hasValue(FAQ_STATUSES, status) || !hasValue(INQUIRY_CATEGORIES, category)) return null;
  return {
    id,
    question: stringValue(row, 'question'),
    proposedAnswer: stringValue(row, 'proposedAnswer') || stringValue(row, 'proposed_answer'),
    occurrenceCount: numberValue(row, 'occurrenceCount', numberValue(row, 'occurrence_count')),
    sourceInquiryIds: stringArray(row, 'sourceInquiryIds').length ? stringArray(row, 'sourceInquiryIds') : stringArray(row, 'source_inquiry_ids'),
    category,
    aiReason: stringValue(row, 'aiReason') || stringValue(row, 'ai_reason'),
    status,
    updatedAt: stringValue(row, 'updatedAt') || stringValue(row, 'updated_at'),
  };
}

function normalizeLog(row: JsonRecord): ActivityLog | null {
  const id = stringValue(row, 'id');
  const status = stringValue(row, 'status');
  if (!id || (status !== 'success' && status !== 'failure')) return null;
  return {
    id,
    occurredAt: stringValue(row, 'occurredAt') || stringValue(row, 'occurred_at'),
    actor: stringValue(row, 'actor'),
    action: stringValue(row, 'action'),
    target: stringValue(row, 'target'),
    status,
    detail: stringValue(row, 'detail'),
    updatedAt: stringValue(row, 'updatedAt') || stringValue(row, 'updated_at'),
  };
}

function compact<T>(items: (T | null)[]): T[] {
  return items.filter((item): item is T => item !== null);
}

export const BUNDLED_OPERATIONS: OperationsData = {
  inquiries: compact(sourceItems(inquiriesSource).map(normalizeInquiry)),
  socialPosts: compact(sourceItems(socialPostsSource).map(normalizeSocialPost)),
  aiTasks: compact(sourceItems(aiTasksSource).map(normalizeAiTask)),
  faqCandidates: compact(sourceItems(faqCandidatesSource).map(normalizeFaq)),
  activityLog: compact(sourceItems(activityLogSource).map(normalizeLog)),
  source: 'bundled',
  warning: null,
};

async function selectRows(table: string): Promise<JsonRecord[]> {
  if (!supabase) throw new Error('database_unavailable');
  const { data, error } = await supabase.from(table).select('*');
  if (error) throw error;
  return Array.isArray(data) ? data.filter(isRecord) : [];
}

export async function loadOperationsData(): Promise<OperationsData> {
  if (!supabase) return BUNDLED_OPERATIONS;
  try {
    const [inquiries, socialPosts, aiTasks, faqCandidates, activityLog] = await Promise.all([
      selectRows('operation_inquiries'),
      selectRows('operation_social_posts'),
      selectRows('operation_ai_tasks'),
      selectRows('operation_faq_candidates'),
      selectRows('operation_activity_log'),
    ]);
    return {
      inquiries: compact(inquiries.map(normalizeInquiry)).sort((a, b) => b.receivedAt.localeCompare(a.receivedAt)),
      socialPosts: compact(socialPosts.map(normalizeSocialPost)).sort((a, b) => b.generatedAt.localeCompare(a.generatedAt)),
      aiTasks: compact(aiTasks.map(normalizeAiTask)).sort((a, b) => b.lastRunAt.localeCompare(a.lastRunAt)),
      faqCandidates: compact(faqCandidates.map(normalizeFaq)).sort((a, b) => b.occurrenceCount - a.occurrenceCount),
      activityLog: compact(activityLog.map(normalizeLog)).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt)),
      source: 'database',
      warning: null,
    };
  } catch {
    return { ...BUNDLED_OPERATIONS, warning: '運用データを取得できなかったため、同梱された確認用データを表示しています。' };
  }
}

export async function saveInquiry(inquiry: Inquiry) {
  if (!supabase) return;
  const { error } = await supabase.from('operation_inquiries').update({
    category: inquiry.category,
    urgency: inquiry.urgency,
    status: inquiry.status,
    owner_memo: inquiry.ownerMemo,
    updated_at: new Date().toISOString(),
  }).eq('id', inquiry.id);
  if (error) throw error;
}

export async function saveSocialPost(post: SocialPost) {
  if (!supabase) return;
  const { error } = await supabase.from('operation_social_posts').update({
    body: post.body,
    scheduled_at: post.scheduledAt,
    status: post.status,
    owner_memo: post.ownerMemo,
    updated_at: new Date().toISOString(),
  }).eq('id', post.id);
  if (error) throw error;
}

export async function saveFaqCandidate(candidate: FaqCandidate) {
  if (!supabase) return;
  const { error } = await supabase.from('operation_faq_candidates').update({
    proposed_answer: candidate.proposedAnswer,
    status: candidate.status,
    updated_at: new Date().toISOString(),
  }).eq('id', candidate.id);
  if (error) throw error;
}

export async function appendActivityLog(entry: ActivityLog) {
  if (!supabase) return;
  const { error } = await supabase.from('operation_activity_log').upsert({
    id: entry.id,
    occurred_at: entry.occurredAt,
    actor: entry.actor,
    action: entry.action,
    target: entry.target,
    status: entry.status,
    detail: entry.detail,
    updated_at: entry.updatedAt,
    schema_version: 1,
  });
  if (error) throw error;
}
