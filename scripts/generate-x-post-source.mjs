import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outputPath = path.join(root, 'docs', 'content', 'x-post-source.md');

const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
const text = (value) => String(value ?? '').trim();
const bullets = (values) => (Array.isArray(values) && values.length ? values.map((value) => `- ${text(value)}`).join('\n') : '- なし');
const theoryLink = (theory, includeSummary = true) => {
  if (!theory) return '参照先データなし';
  const base = `**${theory.tagId}｜${theory.title}**（${theory.categoryTitle}）`;
  return includeSummary && theory.summary ? `${base} — ${theory.summary}` : base;
};

// The X source database must use the complete source catalogue. The public
// bundle intentionally contains locked shells for 20 source-only cards.
const techniquesSource = readJson('src/data/generated/techniques.json');
const theories = readJson('src/data/generated/theories.json');
const actions = readJson('src/data/generated/practical-actions.json');
const primaryLinks = readJson('src/data/generated/primary-theory-links.json');
const comprehensiveLinks = readJson('src/data/generated/comprehensive-theory-links.json');
const learning = readJson('src/data/generated/learning.full.json');
const metadata = readJson('src/data/generated/metadata.json');
const publicActions = readJson('src/data/generated/practical-actions.public.json');
const homeBrand = readJson('src/data/generated/home-brand-content.json');
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const actionById = new Map(actions.map((action) => [action.id, action]));

const techniques = techniquesSource.categories.flatMap((category) =>
  category.subcategories.flatMap((subcategory) =>
    subcategory.items.map((item) => ({
      ...item,
      categoryKey: category.key,
      categoryName: category.name,
      persona: item.persona ?? subcategory.name,
      subcategory: subcategory.name,
      articleTitle: subcategory.articleTitle ?? subcategory.name,
    })),
  ),
);

const categoryCounts = techniques.reduce((counts, item) => {
  counts[item.categoryName] = (counts[item.categoryName] ?? 0) + 1;
  return counts;
}, {});
const personaCounts = techniques.reduce((counts, item) => {
  counts[item.persona] = (counts[item.persona] ?? 0) + 1;
  return counts;
}, {});

const primaryIdsFor = (technique) => technique.primaryTheoryIds ?? primaryLinks[technique.id] ?? technique.relatedTheoryIds ?? [];
const allIdsFor = (technique) => {
  const configured = comprehensiveLinks[technique.id] ?? technique.relatedTheoryIds ?? technique.theoryTagIds ?? [];
  return [...new Set([...configured, ...primaryIdsFor(technique)])];
};

const reverseAll = new Map();
const reversePrimary = new Map();
for (const technique of techniques) {
  for (const theoryId of allIdsFor(technique)) {
    if (!reverseAll.has(theoryId)) reverseAll.set(theoryId, []);
    reverseAll.get(theoryId).push(technique);
  }
  for (const theoryId of primaryIdsFor(technique)) {
    if (!reversePrimary.has(theoryId)) reversePrimary.set(theoryId, []);
    reversePrimary.get(theoryId).push(technique);
  }
}

const lines = [];
const add = (...values) => lines.push(...values.flatMap((value) => String(value).split('\n')));
const addBlank = () => add('');

add('# X投稿素材データベース｜処世術禄');
addBlank();
add('> 現行リポジトリのコンテンツを、X投稿の企画・執筆・画像化に使えるように整理した編集用データ。本文の意味を変えず、投稿では「フック → 判断の視点 → 実践 → 理論的な裏づけ → 注意点 → アプリ導線」の順に再構成する。');
addBlank();
add('## 使い方');
add('');
add('- **フック**：各処世術の「タイトル」「エッセンス」「サブタイトル」から、1つの悩みや場面を選ぶ。');
add('- **本文**：詳細説明から、なぜ起きるか・どの場面で効くか・やりすぎの限界を抜き出す。');
add('- **実践**：「今日からできる実践」を1〜2個に絞り、具体例を添える。');
add('- **根拠**：主要理論を1〜2件使い、必要なら「あわせて読む理論」で別視点を足す。理論名だけで断定しない。');
add('- **注意**：注意点を必ず確認し、「いつでも効く」「絶対に好かれる」などの表現を避ける。');
add('- **導線**：投稿末尾は「聞いたことがある、で終わらせない。」を軸に、プロフィールのアプリリンクへ誘導する。');
add('- **表現**：処世術を人の操作や人格改造として扱わず、自分の目的・価値観・安全を守るための判断材料として扱う。');
addBlank();

add('## データ正本・スナップショット');
add('');
add(`- カタログ識別子：${metadata.catalogVersion ?? '現行生成データ'}（作業時点のリポジトリHEADを基準）`);
add('- 処世術正本：`src/data/generated/techniques.json`（詳細本文を含む完全ソース356件）');
add('- アプリ同梱公開束：`src/data/generated/techniques.public.json`（現行実装では20件をロック表示し、読めるカードは336件）');
add('- 理論正本：`src/data/generated/theories.json`（630件）');
add('- 実践正本：`src/data/generated/practical-actions.json`（完全正本356件に対応）');
add('- 主要理論紐づけ：`src/data/generated/primary-theory-links.json`');
add('- 網羅理論紐づけ：`src/data/generated/comprehensive-theory-links.json`');
add('- ケース学習：`src/data/generated/learning.full.json`（21ケース）');
add('- 投稿運用データ：`operations/social-posts.json`（現時点では登録済み投稿なし）');
add(`- X素材DBの件数：処世術 ${techniques.length}件／理論 ${theories.length}件／ケース ${learning.length}件`);
add('');
add('### 336件／356件の差異（確認済み）');
add('');
add('- `techniques.json`は356件の公開済み詳細データを持ち、`metadata.json`の`techniqueCount`も356。');
add('- `FRONTEND_CANONICAL_SPEC.md`と`RELEASE_REPORT.md`は完全版356件と記載している。');
add('- 直近コミットの`src/data/content-scope.json`は完全版を336件とし、`master336-337`〜`master336-356`の20件を`excludedTechniqueIds`に指定している。`access-config.ts`と`build-public-catalog.mjs`がこの除外を実装するため、現行アプリ同梱束は336件＋20件のロックシェルになる。');
add('- このDBはX投稿の一次素材として356件を収録する。したがって追加20件を「catalog外」とは扱わない。アプリの販売・公開範囲を356件へ変更する作業は別途、正本方針を確定してから行う。');
addBlank();

add('## 処世術禄の思想・表現ガイド');
add('');
add('### 中心メッセージ');
add('');
add('- **人生をうまく生きる方法を、すべての人へ。**');
add('- **聞いたことがある、で終わらせない。**');
add('- 処世術禄は、散らばった人生の知識を集め、整理し、理論と結びつけ、必要なときに取り出して使える知恵へ変える場所。');
add('');
add('### 処世術とは');
add('');
add('処世術とは、社会の中で人や状況とうまく関わりながら、自分の目的や生活を成り立たせていくための知恵や方法。人間関係の築き方、コミュニケーション、仕事での立ち回り、感情のコントロール、失敗への対処、適切な距離の取り方などを含む。対人術・仕事術・人生術の3領域に整理する。');
add('');
add('### 処世術禄の設計（5つの柱）');
add('');
add('1. **網羅する**：対人関係・仕事・人生をまたぎ、日常で繰り返し直面する判断を幅広く扱う。');
add('2. **体系にする**：「人物像」「処世術」「理論」の構造で、目的からも具体策からも探せるようにする。');
add('3. **理論につなぐ**：心理学・行動科学・社会科学などと結び、なぜ効くか・どこで効くか・限界は何かを考えられるようにする。');
add('4. **実践に落とす**：理論を現実の「では何をするか」に変換し、実践と理論を往復させる。');
add('5. **何度でも使える**：保存・メモ・履歴で、流れて消える知識を必要なときに戻れる知恵へ変える。');
add('');
add('### 処世術の五大原則（投稿時の安全弁）');
add('');
add('- **01 処世術は好かれない｜メタ発言抑制**：使うものであって、誇示して語るものではない。');
add('- **02 処世術は万能ではない｜コンテクスト依存性**：人・場・力関係・時間軸・文化・目的で結果は変わる。');
add('- **03 処世術は人格の代替ではない｜行動分離原則**：人格を作り替えるのではなく、人格や価値観を守る道具。');
add('- **04 処世術は知識ではない｜実践優先**：知っているだけでなく、現場の判断・行動に変換して初めて術になる。');
add('- **05 処世術は目的ではない｜手段従属**：何を大切にし、どこへ向かうかを決めるのは本人。処世術は手段。');
add('');
add('### 投稿で避ける表現');
add('');
add('- 「これだけで必ずうまくいく」「誰にでも効く」「相手を操れる」などの万能・操作表現。');
add('- 理論名だけを権威として振りかざす説明。出典が確認できる理論でも、適用範囲と限界を残す。');
add('- 医療・法律・税務・金融・投資・心理支援などの専門助言を代替するような断定。');
addBlank();

add('## 1. カテゴリ・人物像インデックス');
add('');
add('| 領域 | 処世術数 | 含まれる人物像（サブカテゴリ） |');
add('|---|---:|---|');
for (const category of techniquesSource.categories) {
  const categoryItems = techniques.filter((item) => item.categoryKey === category.key);
  const personas = [...new Set(categoryItems.map((item) => item.persona))];
  add(`| ${category.name} | ${categoryItems.length} | ${personas.map((persona) => `${persona}（${personaCounts[persona]}）`).join('、')} |`);
}
addBlank();
add('### 人物像別件数');
add('');
for (const [persona, count] of Object.entries(personaCounts)) add(`- **${persona}**：${count}件`);
addBlank();

add('### ホーム表示・投稿企画の初期候補');
add('');
add('`home-brand-content.json`が日替わり表示に使う候補。Xでは、ここから処世術・人物像・理論の3種類を組み合わせると、同じ領域に偏らない企画を作れる。');
add('');
for (const [domain, group] of Object.entries(homeBrand.dailyCandidates ?? {})) {
  add(`- **${domain}**`);
  add(`  - 処世術候補：${(group.techniqueIds ?? []).map((id) => `${id}「${techniques.find((item) => item.id === id)?.title ?? id}」`).join('、')}`);
  add(`  - 人物像候補：${(group.personaNames ?? []).join('、')}`);
  add(`  - 理論候補：${(group.theoryIds ?? []).map((id) => `${id}「${theoryById.get(id)?.title ?? id}」`).join('、')}`);
}
add('');
add(`- 固定の代表処世術：${Object.values(homeBrand.fallbackTechniqueSnapshots ?? {}).map((item) => `${item.id}「${item.title}」`).join('、')}`);
add(`- 固定の代表人物像：${Object.values(homeBrand.fallbackPersonaSnapshots ?? {}).map((item) => `${item.name}（${item.description}）`).join('、')}`);
add(`- 固定の理論スナップショット：${(homeBrand.theorySnapshots ?? []).map((item) => `${item.tagId}「${item.title}」`).join('、')}`);
addBlank();

add('## 2. 処世術詳細ページ素材（完全正本356件）');
add('');
add('各項目は、詳細ページの内容を投稿素材へ変換するための最小単位。理論の本文は「3. 理論詳細ページ素材」に集約し、ここでは紐づけと要約を併記する。');
addBlank();

for (const technique of techniques.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))) {
  const action = actionById.get(technique.id);
  const primaryIds = primaryIdsFor(technique);
  const allIds = allIdsFor(technique);
  const supplementalIds = allIds.filter((id) => !primaryIds.includes(id));
  add(`### ${technique.id}｜${technique.title}`);
  add('');
  add(`- **領域**：${technique.categoryName} / **人物像**：${technique.persona} / **分類**：${technique.subcategory}`);
  add(`- **重要度**：${technique.importance ?? '未設定'} / **表示順**：${technique.displayOrder ?? '未設定'} / **状態**：${technique.status ?? '未設定'}`);
  if (technique.essence) add(`- **エッセンス**：${technique.essence}`);
  if (technique.subtitle && technique.subtitle !== technique.essence) add(`- **サブタイトル**：${technique.subtitle}`);
  if (technique.tags?.length) add(`- **タグ**：${technique.tags.join('、')}`);
  add('');
  add('**詳細ページ本文**');
  add('');
  add(text(technique.explanation) || '本文なし');
  add('');
  add('**今日からできる実践**');
  add('');
  add(bullets(action?.todayActions));
  add('');
  add('**具体例**');
  add('');
  add(bullets(action?.examples));
  add('');
  add('**注意点**');
  add('');
  add(bullets(action?.cautions));
  add('');
  add(`**主要理論（${primaryIds.length}件）**`);
  add('');
  if (primaryIds.length) for (const id of primaryIds) add(`- ${theoryLink(theoryById.get(id))}`);
  else add('- なし');
  add('');
  add(`**あわせて読む理論（${supplementalIds.length}件）**`);
  add('');
  if (supplementalIds.length) for (const id of supplementalIds) add(`- ${theoryLink(theoryById.get(id))}`);
  else add('- なし');
  add('');
  add('**X投稿への抽出メモ**');
  add('');
  add(`- フック候補：${technique.title}`);
  add(`- 判断の核：${technique.essence ?? technique.subtitle ?? '詳細本文から一文を選ぶ'}`);
  add(`- 行動候補：${action?.todayActions?.[0] ?? '実践欄から一つ選ぶ'}`);
  add(`- 根拠候補：${primaryIds.map((id) => theoryById.get(id)?.title ?? id).join('、') || '理論紐づけなし'}`);
  add('- 注意：上記の注意点から、場面依存性またはやりすぎの限界を1つ残す。');
  addBlank();
}

add('## 3. 理論詳細ページ素材（全630件）');
add('');
add('理論は「こうするべき」の根拠ではなく、処世術を状況に応じて使い分けるための見取り図。投稿では、理論の定義を短く示し、処世術の具体例へ戻す。');
addBlank();
for (const theory of theories) {
  add(`### ${theory.tagId}｜${theory.title}`);
  add('');
  add(`- **分野**：${theory.categoryTitle}（${theory.categoryId}）`);
  add(`- **概要**：${theory.summary}`);
  if (theory.provenance) {
    add(`- **出典メモ**：${theory.provenance.status ?? '確認状況不明'} / ${theory.provenance.attribution ?? '帰属未記載'}`);
    if (theory.provenance.works?.length) add(`- **関連文献**：${theory.provenance.works.join('；')}`);
  }
  const primary = reversePrimary.get(theory.tagId) ?? [];
  const related = reverseAll.get(theory.tagId) ?? [];
  add(`- **主要理論として紐づく処世術**：${primary.length ? primary.map((item) => `${item.id}「${item.title}」`).join('、') : 'なし'}`);
  add(`- **理論全体として紐づく処世術**：${related.length ? related.map((item) => `${item.id}「${item.title}」`).join('、') : 'なし'}`);
  addBlank();
}

add('## 4. 理論→処世術の逆引き（投稿テーマ探索用）');
add('');
add('理論名から投稿テーマを探すための索引。まず理論の概要を読み、逆引きされた処世術から具体的な場面と実践を選ぶ。');
addBlank();
for (const theory of theories) {
  const related = reverseAll.get(theory.tagId) ?? [];
  if (!related.length) continue;
  const primary = new Set((reversePrimary.get(theory.tagId) ?? []).map((item) => item.id));
  add(`- **${theory.tagId}｜${theory.title}**：${related.map((item) => `${primary.has(item.id) ? '主要' : '補完'} ${item.id}「${item.title}」`).join('／')}`);
}
addBlank();

add('## 5. ケース学習（場面・選択肢・正解理由）');
add('');
add('ケースは、X投稿の「あるあるの場面」や短い問いかけに転用しやすい。正解だけを切り出さず、他の選択肢がなぜ機能しにくいかまで確認する。');
addBlank();
for (const item of learning) {
  add(`### ${item.id}｜${item.title}`);
  add('');
  add(`- **ステージ**：${item.stage} / **番号**：${item.number} / **場面**：${item.eyebrow}`);
  add(`- **状況**：${item.situation}`);
  add(`- **問い**：${item.question}`);
  add('');
  add('**選択肢とレビュー**');
  add('');
  for (const choice of item.choices ?? []) add(`- **${choice.id}｜${choice.label}**：${choice.review}`);
  add('');
  add(`- **推奨選択**：${item.goodChoiceId}`);
  add(`- **良い一手**：${item.goodMove}`);
  add(`- **理由**：${item.why}`);
  add(`- **注意**：${item.caution}`);
  add(`- **関連処世術**：${(item.relatedCardIds ?? []).join('、') || 'なし'}`);
  addBlank();
}

const catalogIds = new Set(techniques.map((item) => item.id));
const extraActions = actions.filter((action) => !catalogIds.has(action.id));
add('## 6. 完全正本に未収載の実践アクション（参考）');
add('');
add('`practical-actions.json`にある処世術IDのうち、完全正本356件に対応しないものだけを参考欄に残す。現在の完全正本が356件であるため、通常は0件になる。');
addBlank();
for (const action of extraActions) {
  add(`### ${action.id}｜${action.title}`);
  add('');
  add('**今日からできる実践**');
  add('');
  add(bullets(action.todayActions));
  add('');
  add('**具体例**');
  add('');
  add(bullets(action.examples));
  add('');
  add('**注意点**');
  add('');
  add(bullets(action.cautions));
  addBlank();
}

add('## 7. 整合性チェック');
add('');
const missingActionIds = techniques.filter((item) => !actionById.has(item.id)).map((item) => item.id);
const missingTheoryIds = [...new Set(techniques.flatMap((item) => allIdsFor(item)))].filter((id) => !theoryById.has(id));
const primaryNotInAll = techniques.flatMap((item) => primaryIdsFor(item).filter((id) => !allIdsFor(item).includes(id)).map((id) => `${item.id}:${id}`));
add(`- X素材DBの処世術数：${techniques.length}（期待値356）`);
add(`- 理論数：${theories.length}（期待値630）`);
add(`- 現行処世術に実践データがないID：${missingActionIds.length ? missingActionIds.join('、') : 'なし'}`);
add(`- 紐づけ先が理論正本にないID：${missingTheoryIds.length ? missingTheoryIds.join('、') : 'なし'}`);
add(`- 主要理論が網羅紐づけに含まれない組み合わせ：${primaryNotInAll.length ? primaryNotInAll.join('、') : 'なし'}`);
add(`- theory→technique逆引きに登場する理論：${reverseAll.size}件／未紐づけ理論：${theories.length - reverseAll.size}件`);
add(`- 公開実践アクション：${publicActions.length}件（現行アプリの無料公開範囲）`);
addBlank();
add('## 参照上の注意');
add('');
add('- このファイルは投稿制作のための素材台帳。投稿本文そのものではない。');
add('- リポジトリ更新後は、同梱スクリプト `pnpm exec node scripts/generate-x-post-source.mjs` を実行して再生成する。');
add('- 理論の出典メタデータがない項目は、出典が確定しているかのように表現しない。');

fs.writeFileSync(outputPath, `${lines.join('\n')}\n`, 'utf8');
console.log(`generated ${outputPath} (${lines.length} lines)`);
