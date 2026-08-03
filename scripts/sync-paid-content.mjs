import { readFile } from 'node:fs/promises';
import path from 'node:path';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sourcePath = process.env.PAID_CONTENT_SOURCE ?? path.join(process.cwd(), 'dist-secure-content', 'paid-content.ndjson');
const chunkSize = Number(process.env.PAID_CONTENT_CHUNK_SIZE ?? 100);

if (!supabaseUrl) throw new Error('SUPABASE_URL or EXPO_PUBLIC_SUPABASE_URL is required.');
if (!serviceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.');
if (!Number.isInteger(chunkSize) || chunkSize < 1 || chunkSize > 500) throw new Error('PAID_CONTENT_CHUNK_SIZE must be between 1 and 500.');

const baseUrl = `${supabaseUrl.replace(/\/$/, '')}/rest/v1/paid_content`;
const headers = {
  apikey: serviceRoleKey,
  Authorization: `Bearer ${serviceRoleKey}`,
  'Content-Type': 'application/json',
};

function keyOf(row) {
  return `${row.content_type}\u0000${row.content_id}`;
}

function chunks(items, size) {
  const result = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

async function request(url, init = {}) {
  const response = await fetch(url, { ...init, headers: { ...headers, ...(init.headers ?? {}) } });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`${init.method ?? 'GET'} ${url} failed (${response.status}): ${text.slice(0, 1000)}`);
  }
  return text ? JSON.parse(text) : null;
}

const sourceText = await readFile(sourcePath, 'utf8');
const rows = sourceText.split(/\r?\n/).filter(Boolean).map((line, index) => {
  try {
    return JSON.parse(line);
  } catch (error) {
    throw new Error(`Invalid JSON on line ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
  }
});

const allowedTypes = new Set(['technique', 'theory', 'learning']);
const desiredKeys = new Set();
for (const row of rows) {
  if (!allowedTypes.has(row.content_type)) throw new Error(`Unsupported content_type: ${row.content_type}`);
  if (!row.content_id || typeof row.content_id !== 'string') throw new Error('Every row requires a string content_id.');
  if (!row.payload || typeof row.payload !== 'object') throw new Error(`Missing payload for ${row.content_type}/${row.content_id}.`);
  const key = keyOf(row);
  if (desiredKeys.has(key)) throw new Error(`Duplicate paid-content key: ${row.content_type}/${row.content_id}`);
  desiredKeys.add(key);
}

console.log(`Prepared ${rows.length} paid-content rows from ${sourcePath}.`);

for (const batch of chunks(rows, chunkSize)) {
  await request(`${baseUrl}?on_conflict=content_type,content_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify(batch),
  });
  console.log(`Upserted ${batch.length} rows.`);
}

const existing = await request(`${baseUrl}?select=content_type,content_id&limit=10000`, { method: 'GET' });
const staleByType = new Map();
for (const row of existing ?? []) {
  if (!desiredKeys.has(keyOf(row))) {
    const ids = staleByType.get(row.content_type) ?? [];
    ids.push(row.content_id);
    staleByType.set(row.content_type, ids);
  }
}

let deleted = 0;
for (const [contentType, ids] of staleByType) {
  for (const batch of chunks(ids, 100)) {
    const encodedType = encodeURIComponent(contentType);
    const encodedIds = batch.map((id) => `"${String(id).replaceAll('"', '\\"')}"`).join(',');
    await request(`${baseUrl}?content_type=eq.${encodedType}&content_id=in.(${encodeURIComponent(encodedIds)})`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    deleted += batch.length;
    console.log(`Deleted ${batch.length} stale ${contentType} rows.`);
  }
}

const finalRows = await request(`${baseUrl}?select=content_type,content_id&limit=10000`, { method: 'GET' });
const finalKeys = new Set((finalRows ?? []).map(keyOf));
const missing = [...desiredKeys].filter((key) => !finalKeys.has(key));
const unexpected = [...finalKeys].filter((key) => !desiredKeys.has(key));
if (missing.length || unexpected.length || finalKeys.size !== desiredKeys.size) {
  throw new Error(`Paid-content verification failed. expected=${desiredKeys.size}, actual=${finalKeys.size}, missing=${missing.length}, unexpected=${unexpected.length}`);
}

const counts = rows.reduce((result, row) => {
  result[row.content_type] = (result[row.content_type] ?? 0) + 1;
  return result;
}, {});
console.log(`Paid-content sync complete. total=${rows.length}, deleted=${deleted}, counts=${JSON.stringify(counts)}`);
