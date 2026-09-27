import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// One-time editorial migration. Keep the list explicit so every retained idea
// has a human-written heading independent of the attributed quotation.
const originalTitles = {
  kb_633: '経験の意味は後から見つかる',
  kb_634: '自分の価値観で時間を使う',
  kb_635: '長期的な後悔を選択の基準にする',
  kb_636: '新しい試みには失敗も含まれる',
  kb_637: '一度の出来事で人生全体を決めつけない',
  kb_638: '失敗から大切なものを見直す',
  kb_639: '一度の失点を次へ持ち越さない',
  kb_640: '才能を支える習慣と忍耐',
  kb_641: '休息を継続のために確保する',
  kb_642: '傷つく可能性を受け入れて挑む',
  kb_643: '失敗から次に使える教訓を探す',
  kb_644: '判断の基準を目先の便利さに譲らない',
  kb_645: '結果より今日の行動に集中する',
  kb_646: '改善余地を見つけ続ける',
  kb_647: '考える時間と決断の質を分ける',
  kb_648: '動きながら完成度を高める',
  kb_649: '困難の中で実用的な工夫を探す',
  kb_650: '価値ある挑戦を恐れだけで諦めない',
  kb_651: '今変えられる行動へ意識を戻す',
  kb_652: '違いを自分の強みに育てる',
  kb_653: '努力だけでなく環境と適性を見直す',
  kb_654: '自分ならではの価値観を守る',
  kb_655: '行き詰まりの先で工夫する',
  kb_656: '姿勢・熱意・能力を合わせて考える',
  kb_657: '過去の弁明より次の行動を選ぶ',
  kb_658: '人への思いやりも成果として捉える',
  kb_659: '自然体でいられる関係を大切にする',
  kb_660: '所属するために成果を条件にしない',
  kb_661: '試してから判断する',
  kb_662: '何もしないことの機会損失を見る',
  kb_663: '挑戦から学べる失敗を選ぶ',
  kb_664: '批評だけで終わらず実際に動く',
  kb_665: '過去の努力を理由に進路を固定しない',
  kb_666: '不当な扱いには境界線を引く',
  kb_667: '過去の未熟さを成長の一部と捉える',
  kb_668: '好きなものへの熱意を隠さない',
  kb_669: '成功の裏にある試行錯誤を見る',
  kb_670: '可能性を必要以上に狭めない',
  kb_671: '時間と人間関係の余白を自分で決める',
  kb_672: '望むものに率直に向き合う',
  kb_673: '批判を恐れず挑戦を選ぶ',
  kb_674: '社会への貢献も成功の尺度にする',
  kb_703: '惰性で過ごす時間を見直す',
  kb_704: '過去の傷との付き合い方を学ぶ',
  kb_705: '落ち着きを保ちながら行動する',
};
const existingPracticalTitles = {
  kb_330: 'まず完成させてから改善する',
  kb_331: '望ましい行動が起きる環境をつくる',
  kb_338: '他人の好調な一場面と自分の全体を比べない',
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = path.join(root, 'src/data/generated');
const read = async (name) => JSON.parse(await fs.readFile(path.join(data, name), 'utf8'));
const write = async (name, value) => fs.writeFile(path.join(data, name), `${JSON.stringify(value, null, 2)}\n`);
const theories = await read('theories.json');
const oldById = new Map(theories.map((theory) => [theory.tagId, theory]));
const formerMaxims = theories.filter((theory) => theory.categoryId === 'maxims-experience');
const removed = formerMaxims.filter((theory) => /^kb_(?:67[5-9]|68\d|69\d|700)$/.test(theory.tagId));
const removedIds = new Set(removed.map((theory) => theory.tagId));
if (formerMaxims.length !== 73 || removed.length !== 26 || Object.keys(originalTitles).length !== 45) {
  throw new Error('Editorial source no longer matches the reviewed 73-card catalogue.');
}
const oldScope = JSON.parse(await fs.readFile(path.join(root, 'src/data/content-scope.json'), 'utf8'));
const oldFreeIds = new Set();
const prefixes = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'practical-wisdom': 'W', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const oldCounts = {};
for (const theory of theories) {
  const category = theory.categoryId;
  oldCounts[category] = (oldCounts[category] ?? 0) + 1;
  if (oldScope.freeTheoryDisplayIds.includes(`${prefixes[category]}-${oldCounts[category]}`)) oldFreeIds.add(theory.tagId);
}
if (oldFreeIds.size !== oldScope.free.theories || [...oldFreeIds].some((id) => removedIds.has(id))) {
  throw new Error('Free portfolio needs individual review before migration.');
}

const next = theories.filter((theory) => !removedIds.has(theory.tagId)).map((theory) => {
  if (existingPracticalTitles[theory.tagId]) return { ...theory, title: existingPracticalTitles[theory.tagId] };
  if (originalTitles[theory.tagId]) return {
    ...theory,
    title: originalTitles[theory.tagId],
    categoryId: 'practical-wisdom',
    categoryTitle: '実践知',
    provenance: undefined,
    relatedTheoryIds: (theory.relatedTheoryIds ?? []).filter((id) => !removedIds.has(id)),
  };
  if (['kb_701', 'kb_702'].includes(theory.tagId)) return {
    ...theory,
    categoryId: 'classics-thought',
    categoryTitle: '古典・思想',
  };
  return { ...theory, relatedTheoryIds: (theory.relatedTheoryIds ?? []).filter((id) => !removedIds.has(id)) };
});
if (next.some((theory) => theory.categoryId === 'maxims-experience')) throw new Error('Maxim category survived.');
await write('theories.json', next);

// Remove every obsolete link from the canonical technique catalogue and its
// precomputed link map; public shells are regenerated from these sources.
const techniques = await read('techniques.json');
for (const category of techniques.categories) for (const persona of category.subcategories) for (const item of persona.items) {
  for (const key of ['relatedTheoryIds', 'primaryTheoryIds', 'theoryTagIds']) {
    if (Array.isArray(item[key])) item[key] = item[key].filter((id) => !removedIds.has(id));
  }
}
await write('techniques.json', techniques);
const comprehensive = await read('comprehensive-theory-links.json');
for (const [key, ids] of Object.entries(comprehensive)) comprehensive[key] = ids.filter((id) => !removedIds.has(id));
await write('comprehensive-theory-links.json', comprehensive);

const scope = { ...oldScope, complete: { ...oldScope.complete, theories: next.length } };
const counts = {};
const freeDisplayIds = [];
for (const theory of next) {
  counts[theory.categoryId] = (counts[theory.categoryId] ?? 0) + 1;
  if (oldFreeIds.has(theory.tagId)) freeDisplayIds.push(`${prefixes[theory.categoryId]}-${counts[theory.categoryId]}`);
}
scope.freeTheoryDisplayIds = freeDisplayIds;
await fs.writeFile(path.join(root, 'src/data/content-scope.json'), `${JSON.stringify(scope, null, 2)}\n`);
const metadata = await read('metadata.json');
metadata.theoryCount = next.length;
metadata.productTheoryCount = next.length;
metadata.categoryCounts = counts;
await write('metadata.json', metadata);

// Verified sources for renamed practical concepts would falsely imply that
// their new wording was spoken by the named person. Retain only the two
// public-domain literary attributions.
const provenancePath = path.join(root, 'docs/content/theory-provenance-verified.json');
const provenance = JSON.parse(await fs.readFile(provenancePath, 'utf8'));
provenance.records = provenance.records.filter((record) => !removedIds.has(record.tagId) && !originalTitles[record.tagId]);
await fs.writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);

const report = [
  '# 理論カテゴリと権利確認の変更記録',
  '',
  '2026-09-27。これは公開コンテンツの編集判断であり、個々の台詞の著作物性についての法的断定ではありません。',
  '',
  `- 旧「格言」73件のうち、45件を引用表現と著名人名を外した独立の説明として「実践知」へ再編集。`,
  '- 夏目漱石の2件を「古典・思想」へ移動。',
  '- 既存の「実践知」3件も格言風の表題を独立した説明に変更。',
  `- 現代の漫画・小説等の台詞26件を削除。原文の一致・巻話数を確認できないものが多く、許諾も確認できないため。`,
  `- 理論総数は793件から${next.length}件。旧「格言」カテゴリは廃止。`,
  '',
  '## 削除した公開カタログ26件',
  '',
  '- kb_675–kb_676：『ONE PIECE』の台詞（2件）',
  '- kb_677–kb_680：『NARUTO』の台詞（4件）',
  '- kb_681–kb_683：『SLAM DUNK』の台詞（3件）',
  '- kb_684–kb_686：『ハイキュー!!』の台詞（3件）',
  '- kb_687–kb_690：『宇宙兄弟』の台詞（4件）',
  '- kb_691–kb_693：『ドラえもん』の台詞（3件）',
  '- kb_694–kb_695：『進撃の巨人』の台詞（2件）',
  '- kb_696–kb_698：『鋼の錬金術師』の台詞（3件）',
  '- kb_699–kb_700：『春に踊れば』の台詞（2件）',
  '',
  '## 公開データベースのみの削除1件',
  '',
  '- theory-1789343197612-6d9ahj0r：会話用の語呂合わせ「木戸に立てかけし衣食住」。出典・利用許諾が確認できないため削除。',
  '',
  '## 判定基準',
  '',
  '文化庁の説明では、アイデアやありふれた表現は著作物に当たらない一方、創作的な表現は保護され、保護期間は原則著作者の死後70年です。短文も一律に自由利用できるとは扱わず、現代作品の台詞は予防的に取り下げました。',
  '',
  '- https://www.bunka.go.jp/seisaku/chosakuken/seidokaisetsu/chosakukensha_fumei/',
  '- https://www.bunka.go.jp/seisaku/bunka_gyosei/kibankyoka/faq/index.html',
  '',
];
await fs.writeFile(path.join(root, 'docs/content/theory-rights-removal-report-2026-09-27.md'), report.join('\n'));
console.log(`Migrated ${Object.keys(originalTitles).length} to practical wisdom, 2 to classics; deleted ${removed.length}.`);
