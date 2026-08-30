import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = process.argv[2] ?? path.join(root, 'theory-link-report.json');
const legacyRef = process.env.LEGACY_CATALOG_REF ?? 'd72e563^';
const techniquesPath = path.join(root, 'src', 'data', 'generated', 'techniques.json');
const theoriesPath = path.join(root, 'src', 'data', 'generated', 'theories.json');

const personaDomains = new Map([
  ['対人術/印象がいい人', ['関係の構築']], ['対人術/会話がうまい人', ['関係の構築']],
  ['対人術/聞き上手な人', ['関係の構築']], ['対人術/信頼される人', ['関係の構築', '関係の管理']],
  ['対人術/人たらしの人', ['関係の構築']], ['対人術/人たらしの人①', ['関係の構築']], ['対人術/人たらしの人②', ['関係の構築']], ['対人術/面白い人', ['関係の構築']],
  ['対人術/人を見極められる人', ['関係の管理']], ['対人術/人に振り回されない人', ['自己防衛・境界線', '関係の管理']],
  ['対人術/軽く扱われない人', ['立ち回り', '関係の管理']], ['対人術/人間関係が安定する人', ['関係の管理']],
  ['対人術/集団に馴染める人', ['集団での立ち回り', '立ち回り']], ['対人術/人を動かせる人', ['集団での立ち回り', '立ち回り', '評価の獲得']],
  ['対人術/リーダーシップがある人', ['集団での立ち回り', '立ち回り', '評価の獲得']],
  ['対人術/カリスマ性のある人', ['立ち回り']], ['仕事術/仕事ができる人', ['目標達成', '評価の獲得']],
  ['仕事術/タスク処理がうまい人', ['目標達成']], ['仕事術/頭がいい人', ['目標達成']],
  ['仕事術/正しく評価される人', ['評価の獲得']], ['仕事術/交渉がうまい人', ['交渉・合意術', '交渉・合意の戦術']], ['仕事術/交渉がうまい人①', ['交渉・合意術', '交渉・合意の戦術']], ['仕事術/交渉がうまい人②', ['交渉・合意術', '交渉・合意の戦術']],
  ['仕事術/組織でうまく立ち回れる人', ['評価の獲得', '交渉・合意の戦術']], ['人生術/充実した人生を過ごせる人', ['人生の指針', '人生のつまずき・再設計']],
  ['人生術/自分らしく生きられる人', ['人生の指針', '人生のつまずき・再設計']], ['人生術/人生を楽しめる人', ['人生の指針']],
  ['人生術/不安に強い人', ['不安の解消']], ['人生術/後悔しない人', ['人生の指針', '人生のつまずき・再設計']],
  ['人生術/立ち直れる人', ['人生のつまずき・再設計', '人生のつまずき']], ['人生術/可能性を広げられる人', ['人生の指針', '人生のつまずき・再設計', '人生のつまずき']],
]);

const theoryRules = [
  [/違和感|たとえ|ユーモア|面白/, ['kb_450', 'kb_409', 'kb_414']],
  [/価値観|カリスマ|存在感/, ['kb_461', 'kb_474', 'kb_477']],
  [/暗黙|組織|社内/, ['kb_506', 'kb_497', 'kb_498']],
  [/楽し.*予定|予定.*楽し/, ['kb_173', 'kb_174', 'kb_547']],
  [/分から|例外|決めつけ|前提|反対の可能性|仮説/, ['kb_570', 'kb_573', 'kb_574']],
  [/初対面|第一印象|清潔感/, ['kb_001', 'kb_387', 'kb_399']], [/表情|視線|姿勢|声/, ['kb_388', 'kb_389', 'kb_474']],
  [/テンポ|リズム|間を合わせ/, ['kb_013', 'kb_015', 'kb_390']], [/名前を呼|名前.*使/, ['kb_016', 'kb_392', 'kb_417']],
  [/別れ際|最後.*印象|終わり方/, ['kb_002', 'kb_029']], [/好意.*先|歓迎/, ['kb_007', 'kb_047']],
  [/自己開示|弱み|人間味/, ['kb_008', 'kb_009', 'kb_397']], [/質問|深掘|聞く/, ['kb_018', 'kb_407', 'kb_412']],
  [/沈黙/, ['kb_416', 'kb_013']], [/共感|感情を受け止め|傾聴/, ['kb_404', 'kb_411', 'kb_412']],
  [/約束|一貫|言葉と行動|信頼/, ['kb_421', 'kb_422', 'kb_443']], [/謝|間違|失敗.*認/, ['kb_423', 'kb_424', 'kb_298']],
  [/秘密|情報を漏ら/, ['kb_447']], [/境界|断る|嫌われ|好かれよう|頼まれ|罪悪感/, ['kb_051', 'kb_092', 'kb_427']],
  [/距離|連絡頻度|離れる/, ['kb_431', 'kb_432', 'kb_035']], [/見極|行動を見る|観察/, ['kb_442', 'kb_443', 'kb_450']],
  [/権威|肩書|評判/, ['kb_091', 'kb_103', 'kb_452']], [/集団|馴染|空気を読む|輪に/, ['kb_455', 'kb_456', 'kb_459']],
  [/動か|説得|依頼/, ['kb_462', 'kb_483', 'kb_520']], [/責任.*曖昧|責任の所在/, ['kb_073', 'kb_487']],
  [/根回し|会議.*前|提案.*前/, ['kb_159', 'kb_483']], [/評価|上司|成果を見せ|実績/, ['kb_111', 'kb_116', 'kb_117']],
  [/目的|完了条件|依頼.*先/, ['kb_170', 'kb_171', 'kb_498']], [/締切|期限|予定/, ['kb_190', 'kb_192', 'kb_547']],
  [/優先|重要.*捨て|完璧/, ['kb_329', 'kb_330', 'kb_545']], [/タスク.*頭の外|メモ|書き出/, ['kb_493', 'kb_577']],
  [/着手|始める|取りかか/, ['kb_172', 'kb_530', 'kb_532']], [/集中|割り込み|気が散/, ['kb_181', 'kb_493']],
  [/習慣|続け/, ['kb_180', 'kb_533', 'kb_534']], [/例外|決めつけ|前提|反対の可能性|仮説/, ['kb_570', 'kb_573', 'kb_574']],
  [/交渉.*前|代替案|決裂/, ['kb_142', 'kb_143', 'kb_144']], [/条件|譲歩|交換/, ['kb_147', 'kb_150', 'kb_151']],
  [/対立|面子|衝突/, ['kb_157', 'kb_159', 'kb_160']], [/幸せ|幸福|成功だけ|充実/, ['kb_268', 'kb_551', 'kb_560']],
  [/時間|忙し/, ['kb_556', 'kb_562']], [/自分らし|価値観|得意|強み|他人の正解/, ['kb_257', 'kb_259', 'kb_491']],
  [/比べ|比較|他人の正解/, ['kb_266', 'kb_338']], [/不安|心配|恐れ/, ['kb_203', 'kb_204', 'kb_213']],
  [/不安.*動|恐れ.*行動/, ['kb_210', 'kb_221', 'kb_222']], [/後悔|選択|納得/, ['kb_554', 'kb_569', 'kb_277']],
  [/失敗|立ち直|喪失|回復/, ['kb_240', 'kb_241', 'kb_264']], [/可能性|未来|肩書|選び直|小さく試/, ['kb_256', 'kb_279', 'kb_290']],
  [/学び|能力|スキル/, ['kb_571', 'kb_584', 'kb_585']],
];

function cardsOf(catalog) {
  return catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
}

function normalized(value = '') {
  return value.normalize('NFKC').replace(/[\s、。・「」『』（）()【】\[\]{}〈〉《》!?！？:：;；,，.．…—―ー]/g, '');
}

function grams(value, weight = 1) {
  const text = normalized(value);
  const result = new Map();
  for (const size of [2, 3]) {
    for (let index = 0; index <= text.length - size; index += 1) {
      const gram = text.slice(index, index + size);
      result.set(gram, (result.get(gram) ?? 0) + weight);
    }
  }
  return result;
}

function mergeVectors(parts) {
  const result = new Map();
  for (const [value, weight] of parts) {
    for (const [term, count] of grams(value, weight)) result.set(term, (result.get(term) ?? 0) + count);
  }
  return result;
}

function cosine(left, right) {
  let dot = 0;
  let leftSize = 0;
  let rightSize = 0;
  for (const value of left.values()) leftSize += value * value;
  for (const value of right.values()) rightSize += value * value;
  for (const [term, value] of left) dot += value * (right.get(term) ?? 0);
  return leftSize && rightSize ? dot / Math.sqrt(leftSize * rightSize) : 0;
}

function techniqueVector(card) {
  return mergeVectors([
    [card.title, 8],
    [card.essence, 4],
    [card.explanation, 1],
  ]);
}

function theoryVector(theory) {
  return mergeVectors([
    [theory.title, 10],
    [theory.summary, 5],
  ]);
}

const [catalog, theories] = await Promise.all([
  readFile(techniquesPath, 'utf8').then(JSON.parse),
  readFile(theoriesPath, 'utf8').then(JSON.parse),
]);
const legacyCatalog = JSON.parse(execFileSync('git', [
  '-c', `safe.directory=${root.replaceAll('\\\\', '/')}`,
  'show', `${legacyRef}:src/data/generated/techniques.json`,
], { cwd: root, encoding: 'utf8' }));

const cards = cardsOf(catalog);
const legacyCards = cardsOf(legacyCatalog);
const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const theoryVectors = new Map(theories.map((theory) => [theory.tagId, theoryVector(theory)]));
const legacyVectors = new Map(legacyCards.map((card) => [card.id, techniqueVector(card)]));
const report = [];
const leadershipTheoryTitles = new Map([
  ['目的を一文で共有する', ['社会的アイデンティティ理論', '共通内集団アイデンティティ', 'アジェンダ設定']], ['成功の基準を先にそろえる', ['集団規範', '標準化', '目標置換']],
  ['決める人と任せる人を分ける', ['責任の明確化', '責任の分散', '統制範囲']], ['現場の声が戻る経路をつくる', ['心理的安全性', '沈黙の螺旋', '組織学習']],
  ['反対意見を早く出せる空気をつくる', ['心理的安全性', '集団思考', '少数派影響']], ['判断の理由を隠さない', ['公正フレーミング', '意思決定支援', '予測可能性']],
  ['役割を強みで配る', ['強み理論', 'トランザクティブ・メモリー', '役割限定性']], ['期待を行動で具体化する', ['具体的フィードバック', 'ピグマリオン効果', 'アウトカム評価']],
  ['小さな前進を見えるようにする', ['可視性バイアス', '成果帰属問題', '自己成就予言']], ['成果の手柄をチームに返す', ['成果帰属問題', 'リーダー・メンバー交換理論', '反射的栄光浴']],
  ['失敗を責める前に仕組みを直す', ['組織学習', '標準化', '心理的安全性']], ['困難な判断を先送りしない', ['意思決定支援', '意思決定疲れ', '信頼性理論']],
  ['優先順位を繰り返し示す', ['アジェンダ設定', '目標置換', '認知負荷理論']], ['会議で結論と次の行動を残す', ['責任の明確化', '一貫性原理', '認知負荷理論']],
  ['一対一で状態を確かめる', ['リーダー・メンバー交換理論', '心理的安全性', '組織支援理論']], ['守る境界を明確にする', ['アサーション理論', '境界線理論', '境界設定']],
  ['異なる意見を統合する', ['集団思考', '少数派影響', '共通内集団アイデンティティ']], ['自ら約束を守る', ['一貫性ヒューリスティック', '予測可能性', '信頼性理論']],
  ['育成を仕事として時間を取る', ['ピグマリオン効果', 'リーダー・メンバー交換理論', 'トランザクティブ・メモリー']], ['退く判断もリーダーが引き受ける', ['サンクコスト効果', 'OODAループ', '組織学習']],
]);
const theoryIdByTitle = new Map(theories.map((theory) => [theory.title, theory.tagId]));

for (const card of cards) {
  const vector = techniqueVector(card);
  const compatibleTheories = theories;
  const legacyRanked = legacyCards
    .filter((legacy) => legacy.field === card.field)
    .map((legacy) => {
      const contentScore = cosine(vector, legacyVectors.get(legacy.id));
      const titleScore = cosine(grams(card.title, 1), grams(legacy.title, 1));
      const personaBonus = legacy.persona === card.persona ? 0.06 : 0;
      return { legacy, score: contentScore * 0.72 + titleScore * 0.22 + personaBonus };
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, 6);

  const scores = new Map();
  for (const { legacy, score } of legacyRanked) {
    for (const id of legacy.relatedTheoryIds ?? []) {
      const theory = theoryById.get(id);
      if (!theory) continue;
      scores.set(id, (scores.get(id) ?? 0) + score);
    }
  }
  for (const theory of compatibleTheories) {
    const direct = cosine(vector, theoryVectors.get(theory.tagId));
    const title = cosine(grams(card.title, 1), grams(theory.title, 1));
    scores.set(theory.tagId, (scores.get(theory.tagId) ?? 0) + direct * 0.85 + title * 0.4);
  }
  const keyText = `${card.title} ${card.essence}`;
  for (const [pattern, ids] of theoryRules) {
    if (!pattern.test(keyText)) continue;
    for (const id of ids) {
      const theory = theoryById.get(id);
      if (theory) {
        scores.set(id, (scores.get(id) ?? 0) + 1.75);
      }
    }
  }

  const ranked = [...scores]
    .map(([id, score]) => ({ id, score, theory: theoryById.get(id) }))
    .filter((entry) => entry.theory)
    .sort((left, right) => right.score - left.score);
  const threshold = ranked[0]?.score ?? 0;
  const selected = ranked.filter((entry) => entry.score >= Math.max(0.45, threshold * 0.6));
  const curatedTitles = leadershipTheoryTitles.get(card.title);
  if (card.persona === '人を動かせる人' && curatedTitles) {
    const curatedIds = curatedTitles.map((title) => theoryIdByTitle.get(title));
    if (curatedIds.some((id) => !id)) throw new Error(`Missing curated leadership theory for ${card.title}`);
    selected.splice(0, selected.length, ...curatedIds.map((id) => ({ id, score: 100, theory: theoryById.get(id) })));
  }
  if (!selected.length) throw new Error(`No compatible theory found for ${card.id}: ${card.title}`);
  card.relatedTheoryIds = selected.map((entry) => entry.id);
  report.push({
    id: card.id,
    field: card.field,
    persona: card.persona,
    title: card.title,
    confidence: Number(selected[0].score.toFixed(4)),
    theories: selected.map((entry) => ({ id: entry.id, title: entry.theory.title, score: Number(entry.score.toFixed(4)) })),
    nearestLegacy: legacyRanked.map(({ legacy, score }) => ({
      id: legacy.id,
      title: legacy.title,
      score: Number(score.toFixed(4)),
    })),
  });
}

const linkedIds = new Set(cards.flatMap((card) => card.relatedTheoryIds));
const invalid = cards.flatMap((card) => card.relatedTheoryIds.filter((id) => !theoryById.has(id)));
if (invalid.length) throw new Error(`Invalid theory IDs: ${invalid.join(', ')}`);

await writeFile(techniquesPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
await writeFile(reportPath, `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  legacyRef,
  techniqueCount: cards.length,
  linkedTheoryCount: linkedIds.size,
  averageLinks: Number((cards.reduce((sum, card) => sum + card.relatedTheoryIds.length, 0) / cards.length).toFixed(2)),
  links: report,
}, null, 2)}\n`, 'utf8');

console.log(JSON.stringify({
  techniques: cards.length,
  links: cards.reduce((sum, card) => sum + card.relatedTheoryIds.length, 0),
  linkedTheoryCards: linkedIds.size,
  report: reportPath,
}, null, 2));
