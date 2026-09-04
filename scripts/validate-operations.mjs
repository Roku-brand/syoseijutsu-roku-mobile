import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['dashboard.json', 'inquiries.json', 'social-posts.json', 'ai-tasks.json', 'faq-candidates.json', 'activity-log.json'];

for (const file of files) {
  const document = JSON.parse(await fs.readFile(path.join(root, 'operations', file), 'utf8'));
  if (document.schemaVersion !== 1 || typeof document.updatedAt !== 'string') throw new Error(`${file}: schemaVersion / updatedAt が不正です。`);
  if (file !== 'dashboard.json') {
    if (!Array.isArray(document.items)) throw new Error(`${file}: items が配列ではありません。`);
    const ids = document.items.map((item) => item?.id);
    if (ids.some((id) => typeof id !== 'string' || !id) || new Set(ids).size !== ids.length) throw new Error(`${file}: id が不正または重複しています。`);
    if (document.items.some((item) => typeof item?.status !== 'string' || !item.status)) throw new Error(`${file}: status がない項目があります。`);
    if (document.items.some((item) => /gmail:sample-|@example\.com/i.test(JSON.stringify(item)))) throw new Error(`${file}: デモ用レコードを運用データへ含めることはできません。`);
  }
  console.log(`${file}: OK`);
}
