import { writeFile } from 'node:fs/promises';

const [output] = process.argv.slice(2);
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
if (!output || !url || !key) throw new Error('Output file and public Supabase settings are required.');

const endpoint = new URL('/rest/v1/public_techniques', url);
endpoint.search = new URLSearchParams({ select: 'id', status: 'eq.published', access_tier: 'eq.free', order: 'id' });
const pageSize = 500;
const ids = new Set();
for (let offset = 0; ; offset += pageSize) {
  endpoint.searchParams.set('limit', String(pageSize));
  endpoint.searchParams.set('offset', String(offset));
  const response = await fetch(endpoint, { headers: { apikey: key }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`Free technique lookup failed (${response.status}).`);
  const rows = await response.json();
  if (!Array.isArray(rows)) throw new Error('Unexpected free technique response.');
  for (const { id } of rows) {
    if (typeof id !== 'string' || !id.trim() || ids.has(id)) throw new Error('Invalid or duplicate free technique ID.');
    ids.add(id);
  }
  if (rows.length < pageSize) break;
}

if (!ids.size) throw new Error('Supabase returned no free techniques.');
await writeFile(output, JSON.stringify([...ids]), 'utf8');
console.log(`Captured ${ids.size} published free technique IDs.`);
