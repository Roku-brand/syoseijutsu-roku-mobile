import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const generatedDir = path.join(root, 'src', 'data', 'generated');
const outputDir = path.join(root, 'docs', 'theory-link-audit');
const techniqueSourcePath = process.argv[2] ?? 'C:/Users/tsuba/Downloads/shoseijutsuroku_解説_再改善統合版_master336_001-336.md';
const theorySourcePath = process.argv[3] ?? 'C:/Users/tsuba/Downloads/shoseijutsuroku_theories_full_6categories_with_new_summaries (1).md';
const legacyCatalogPath = process.argv[4] ?? 'C:/Users/tsuba/Downloads/techniques.json';
const legacyMapPath = process.argv[5] ?? 'C:/Users/tsuba/Downloads/shoseijutsuroku_525_theory_remap_with_wisdom_final.json';
const currentCatalogPath = path.join(generatedDir, 'techniques.json');
const theoriesPath = path.join(generatedDir, 'theories.json');
const finalMappingPath = path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_master336_final.md');
const auditPath = path.join(root, 'docs', 'shoseijutsuroku_theory_mapping_audit.md');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const cardsOf = (catalog) => catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
const normalize = (value = '') => String(value).normalize('NFKC').replace(/[\s、。・「」『』（）()【】\[\]{}〈〉《》!?！？:：;；,，.．…—―ー]/g, '');
const compact = (value = '') => String(value).replace(/\\r?\\n/g, ' ').replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();

function grams(value) {
  const text = normalize(value);
  const result = new Map();
  for (const size of [2, 3]) {
    for (let index = 0; index <= text.length - size; index += 1) {
      const gram = text.slice(index, index + size);
      result.set(gram, (result.get(gram) ?? 0) + 1);
    }
  }
  return result;
}

function weightedVector(parts) {
  const result = new Map();
  for (const [value, weight] of parts) {
    for (const [term, count] of grams(value)) result.set(term, (result.get(term) ?? 0) + count * weight);
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

const techniqueVector = (card) => weightedVector([
  [card.title, 9],
  [card.essence, 5],
  [card.explanation, 1],
  [(card.todayActions ?? []).join(' '), 0.7],
  [(card.cautions ?? []).join(' '), 0.7],
]);
const theoryVector = (theory) => weightedVector([
  [theory.title, 12],
  [theory.summary, 7],
  [(theory.principles ?? []).join(' '), 4],
  [(theory.domains ?? []).join(' '), 2],
  [theory.discipline, 1],
]);

const domainRules = new Map([
  ['対人術/印象がいい人', ['関係の構築']], ['対人術/会話がうまい人', ['関係の構築']], ['対人術/聞き上手な人', ['関係の構築']],
  ['対人術/信頼される人', ['関係の構築', '関係の管理']], ['対人術/人たらしの人①', ['関係の構築']], ['対人術/人たらしの人②', ['関係の構築']],
  ['対人術/面白い人', ['関係の構築']], ['対人術/人を見る目がある人', ['関係の管理']], ['対人術/距離感を間違えない人', ['自己防衛・境界線', '関係の管理']],
  ['対人術/軽く扱われない人', ['立ち回り', '関係の管理']], ['対人術/関係を長く続けられる人', ['関係の管理']],
  ['対人術/集団で好かれる人', ['集団での立ち回り', '立ち回り']], ['対人術/人を動かせる人', ['集団での立ち回り', '立ち回り', '評価の獲得']],
  ['対人術/カリスマ性のある人', ['立ち回り']], ['仕事術/仕事ができる人', ['目標達成', '評価の獲得']], ['仕事術/タスク処理がうまい人', ['目標達成']],
  ['仕事術/考える力がある人', ['目標達成']], ['仕事術/評価される人', ['評価の獲得']], ['仕事術/交渉がうまい人①', ['交渉・合意術', '交渉・合意の戦術']],
  ['仕事術/交渉がうまい人②', ['交渉・合意術', '交渉・合意の戦術']], ['仕事術/組織でうまく立ち回れる人', ['評価の獲得', '交渉・合意の戦術']],
  ['人生術/人生がうまくいく人', ['人生の指針', '人生のつまずき・再設計']], ['人生術/自分らしく生きられる人', ['人生の指針', '人生のつまずき・再設計']],
  ['人生術/人生を楽しめる人', ['人生の指針']], ['人生術/不安に飲まれない人', ['不安の解消']], ['人生術/後悔しない人', ['人生の指針', '人生のつまずき・再設計']],
  ['人生術/立ち直りが早い人', ['人生のつまずき・再設計', '人生のつまずき']], ['人生術/可能性を広げられる人', ['人生の指針', '人生のつまずき・再設計', '人生のつまずき']],
]);

const patternRules = [
  [/違和感|たとえ|ユーモア|面白/, ['kb_450', 'kb_409', 'kb_414']],
  [/価値観|カリスマ|存在感/, ['kb_461', 'kb_474', 'kb_477']],
  [/暗黙|組織|社内/, ['kb_506', 'kb_497', 'kb_498']],
  [/楽し.*予定|予定.*楽し/, ['kb_173', 'kb_174', 'kb_547']],
  [/分から|例外|決めつけ|前提|反対の可能性|仮説/, ['kb_570', 'kb_573', 'kb_574']],
  [/初対面|第一印象|清潔感/, ['kb_001', 'kb_387', 'kb_399']],
  [/表情|視線|姿勢|声/, ['kb_388', 'kb_389', 'kb_474']],
  [/テンポ|リズム|間を合わせ/, ['kb_013', 'kb_015', 'kb_390']],
  [/名前を呼|名前.*使/, ['kb_016', 'kb_392', 'kb_417']],
  [/別れ際|最後.*印象|終わり方/, ['kb_002', 'kb_029']],
  [/好意.*先|歓迎/, ['kb_007', 'kb_047']],
  [/自己開示|弱み|人間味/, ['kb_008', 'kb_009', 'kb_397']],
  [/質問|深掘|聞く/, ['kb_018', 'kb_407', 'kb_412']],
  [/沈黙/, ['kb_416', 'kb_013']],
  [/共感|感情を受け止め|傾聴/, ['kb_404', 'kb_411', 'kb_412']],
  [/約束|一貫|言葉と行動|信頼/, ['kb_421', 'kb_422', 'kb_443']],
  [/謝|間違|失敗.*認/, ['kb_423', 'kb_424', 'kb_298']],
  [/秘密|情報を漏ら/, ['kb_447']],
  [/境界|断る|嫌われ|好かれよう|頼まれ|罪悪感/, ['kb_051', 'kb_092', 'kb_427']],
  [/距離|連絡頻度|離れる/, ['kb_431', 'kb_432', 'kb_035']],
  [/見極|行動を見る|観察/, ['kb_442', 'kb_443', 'kb_450']],
  [/権威|肩書|評判/, ['kb_091', 'kb_103', 'kb_452']],
  [/集団|馴染|空気を読む|輪に/, ['kb_455', 'kb_456', 'kb_459']],
  [/動か|説得|依頼/, ['kb_462', 'kb_483', 'kb_520']],
  [/責任.*曖昧|責任の所在/, ['kb_073', 'kb_487']],
  [/根回し|会議.*前|提案.*前/, ['kb_159', 'kb_483']],
  [/評価|上司|成果を見せ|実績/, ['kb_111', 'kb_116', 'kb_117']],
  [/目的|完了条件|依頼.*先/, ['kb_170', 'kb_171', 'kb_498']],
  [/締切|期限|予定/, ['kb_190', 'kb_192', 'kb_547']],
  [/優先|重要.*捨て|完璧/, ['kb_329', 'kb_330', 'kb_545']],
  [/タスク.*頭の外|メモ|書き出/, ['kb_493', 'kb_577']],
  [/着手|始める|取りかか/, ['kb_172', 'kb_530', 'kb_532']],
  [/集中|割り込み|気が散/, ['kb_181', 'kb_493']],
  [/習慣|続け/, ['kb_180', 'kb_533', 'kb_534']],
  [/交渉.*前|代替案|決裂/, ['kb_142', 'kb_143', 'kb_144']],
  [/条件|譲歩|交換/, ['kb_147', 'kb_150', 'kb_151']],
  [/対立|面子|衝突/, ['kb_157', 'kb_159', 'kb_160']],
  [/幸せ|幸福|成功だけ|充実/, ['kb_268', 'kb_551', 'kb_560']],
  [/時間|忙し/, ['kb_556', 'kb_562']],
  [/自分らし|価値観|得意|強み|他人の正解/, ['kb_257', 'kb_259', 'kb_491']],
  [/比べ|比較|他人の正解/, ['kb_266', 'kb_338']],
  [/不安|心配|恐れ/, ['kb_203', 'kb_204', 'kb_213']],
  [/不安.*動|恐れ.*行動/, ['kb_210', 'kb_221', 'kb_222']],
  [/後悔|選択|納得/, ['kb_554', 'kb_569', 'kb_277']],
  [/失敗|立ち直|喪失|回復/, ['kb_240', 'kb_241', 'kb_264']],
  [/可能性|未来|肩書|選び直|小さく試/, ['kb_256', 'kb_279', 'kb_290']],
  [/学び|能力|スキル/, ['kb_571', 'kb_584', 'kb_585']],
];

// Maxims are not ordinary keyword matches: for the life-practice cards they
// often provide the most direct statement of the decision rule. Keep these
// semantic anchors separate from the general theory heuristics so that a
// useful maxim is not discarded merely because its wording differs from the
// technique title. The newer quotation set is intentionally scoped to life
// practice; the older cross-domain maxims are allowed to support work and
// interpersonal cards as well.
const maximRules = [
  { pattern: /親切|助け|恩|貢献|人との縁|人脈|信頼|人を大切|他者|社会の役/, theoryIds: ['kb_296', 'kb_658', 'kb_674'] },
  { pattern: /親し|馴れ|礼儀|境界|距離|雑に扱|軽く扱|大切な人/, theoryIds: ['kb_300', 'kb_666'] },
  { pattern: /対立|衝突|困難|挫折|失敗|修復|立ち直|関係を長/, theoryIds: ['kb_301', 'kb_683', 'kb_697'] },
  { pattern: /着手|始め|完璧|完成|公開|小さく試|先送り|期限|決断/, theoryIds: ['kb_324', 'kb_329', 'kb_330', 'kb_648'] },
  { pattern: /継続|続け|習慣|積み重|毎日|長く|蓄積|複利/, theoryIds: ['kb_327', 'kb_640', 'kb_669'] },
  { pattern: /不安|心配|怖|恐れ|立ち止|動け|小さく試/, theoryIds: ['kb_335', 'kb_650', 'kb_661', 'kb_662'] },
  { pattern: /未来|不安|心配|休|今を|過去|後悔|焦/, theoryIds: ['kb_336', 'kb_641', 'kb_651', 'kb_693'] },
  { pattern: /人生の柱|一つの目標|一点|分散|複数|賭け|リスク|選択肢/, theoryIds: ['kb_359'] },
  { field: '人生術', pattern: /時間|期限|今しか|先送り|人生の終わり|後悔|大切なこと/, theoryIds: ['kb_635', 'kb_682'] },
  { field: '人生術', pattern: /経験|振り返|無駄|意味|失敗|過去|道/, theoryIds: ['kb_633', 'kb_638', 'kb_643', 'kb_667'] },
  { field: '人生術', pattern: /他人|比較|羨|正解|自分|価値観|期待|自分ら/, theoryIds: ['kb_338', 'kb_634', 'kb_644', 'kb_654'] },
  { field: '人生術', pattern: /失敗|挫折|一つ|人生全体|大きな出来事|拡大|喪失/, theoryIds: ['kb_637', 'kb_639', 'kb_675', 'kb_683'] },
  { field: '人生術', pattern: /継続|努力|習慣|自己管理|才能|能力|改善|成長|強み/, theoryIds: ['kb_640', 'kb_646', 'kb_684'] },
  { field: '人生術', pattern: /休|健康|忙|余白|充実|時間/, theoryIds: ['kb_641', 'kb_671'] },
  { field: '人生術', pattern: /自己開示|弱み|傷つ|本音|演じ|自然体|挑戦/, theoryIds: ['kb_642', 'kb_659', 'kb_660'] },
  { field: '人生術', pattern: /結果|今でき|行動|集中|評価|目標|仕事/, theoryIds: ['kb_645', 'kb_656'] },
  { field: '人生術', pattern: /考えすぎ|決断|期限|迷|完璧|選択|納得/, theoryIds: ['kb_647', 'kb_695'] },
  { field: '人生術', pattern: /困難|問題|工夫|知恵|限界|仕事/, theoryIds: ['kb_649', 'kb_655'] },
  { field: '人生術', pattern: /違う|異|強み|希少|比較|得意|適性|戦う場所/, theoryIds: ['kb_652', 'kb_653', 'kb_684'] },
  { field: '人生術', pattern: /環境|場所|停滞|相性|キャラクター|肩書|変える/, theoryIds: ['kb_331', 'kb_653', 'kb_694'] },
  { field: '人生術', pattern: /努力|縛|過去|道|選択|先送り|進路/, theoryIds: ['kb_665', 'kb_657'] },
  { field: '人生術', pattern: /好き|関心|熱意|好奇心|趣味|本音|面白|楽しい/, theoryIds: ['kb_668', 'kb_672', 'kb_689'] },
  { field: '人生術', pattern: /可能性|安全|挑戦|未来|縮|選択肢|機会/, theoryIds: ['kb_650', 'kb_670', 'kb_673'] },
  { field: '人生術', pattern: /失敗|試行|成功|挑戦|本気|学び|経験/, theoryIds: ['kb_636', 'kb_663', 'kb_688', 'kb_669'] },
  { field: '人生術', pattern: /欲|本気|恥|挑戦|目標/, theoryIds: ['kb_672', 'kb_673'] },
  { field: '人生術', pattern: /居場所|合わせ|自然体|本当の自分|認め|自己価値|期待/, theoryIds: ['kb_659', 'kb_660'] },
  { field: '人生術', pattern: /喪失|失|残|回復|立ち直|欠|感謝/, theoryIds: ['kb_675', 'kb_696'] },
  { field: '人生術', pattern: /記憶|影響|忘れ|貢献|人との/, theoryIds: ['kb_676', 'kb_674'] },
  { field: '人生術', pattern: /険|逃|困難|成長|諦め|大切なもの/, theoryIds: ['kb_677', 'kb_678', 'kb_681'] },
  { field: '人生術', pattern: /ルール|仲間|形式|規則|組織/, theoryIds: ['kb_679'] },
  { field: '人生術', pattern: /自分を信じ|自己価値|諦め|可能性|能力|比較/, theoryIds: ['kb_680', 'kb_691', 'kb_692'] },
  { field: '人生術', pattern: /今|機会|時間|先送り|集中|未来/, theoryIds: ['kb_682', 'kb_651'] },
  { field: '人生術', pattern: /敗|明日|未来|変|挫折|立ち直/, theoryIds: ['kb_686'] },
  { field: '人生術', pattern: /逃|後悔|問題|先送り|不安/, theoryIds: ['kb_687'] },
  { field: '人生術', pattern: /自分|恐れ|迷|不安|障害/, theoryIds: ['kb_690'] },
  { field: '人生術', pattern: /手放|執着|変|選択|代償|コスト/, theoryIds: ['kb_694', 'kb_698'] },
  { field: '人生術', pattern: /痛|苦|教訓|失敗|挫折|学び/, theoryIds: ['kb_697', 'kb_643'] },
  { field: '人生術', pattern: /代償|コスト|選択|努力|時間/, theoryIds: ['kb_698'] },
  { field: '人生術', pattern: /過程|経過|結果|学び|人生|寄り道|余白|体験/, theoryIds: ['kb_699', 'kb_700'] },
  { field: '人生術', pattern: /人生|生き|困難|覚悟/, theoryIds: ['kb_701', 'kb_702'] },
  { field: '人生術', pattern: /なんとなく|目的|意思|時間|生き/, theoryIds: ['kb_703'] },
  { field: '人生術', pattern: /トラウマ|過去|傷|回復|支配/, theoryIds: ['kb_704'] },
  { field: '人生術', pattern: /焦|急|行動|落ち着|テンポ|余白/, theoryIds: ['kb_705'] },
];

function parseTechniqueSource(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '');
  const rows = [...text.matchAll(/^#{3,4}\s+(master336-\d{3})｜(.+)$/gm)].map((match) => ({ id: match[1], title: match[2].trim() }));
  if (rows.length !== 336) throw new Error(`Technique source must contain 336 cards; found ${rows.length}.`);
  return new Map(rows.map((row) => [row.id, row.title]));
}

function parseTheorySource(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const text = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').replace(/\r/g, '');
  const rows = [];
  let categoryTitle = '';
  for (const line of text.split('\n')) {
    const category = line.match(/^##\s+(.+)$/);
    if (category) {
      categoryTitle = category[1].trim();
      continue;
    }
    const theory = line.match(/^[-*]\s+([PBOQCS])－(\d+)｜(.+)$/);
    if (theory) rows.push({ prefix: theory[1], number: Number(theory[2]), title: theory[3].trim(), categoryTitle });
  }
  if (rows.length !== 630) throw new Error(`Theory source must contain 630 cards; found ${rows.length}.`);
  return rows;
}

function legacyCardsOf(catalog) {
  return catalog.categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items));
}

function loadSeedCatalog() {
  try {
    return JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/generated/techniques.json'], { cwd: root, encoding: 'utf8' }));
  } catch {
    return readJson(currentCatalogPath);
  }
}

const catalog = readJson(currentCatalogPath);
const seedCatalog = loadSeedCatalog();
const theories = readJson(theoriesPath);
const cards = cardsOf(catalog);
const seedCards = cardsOf(seedCatalog);
const sourceTitles = parseTechniqueSource(techniqueSourcePath);
const sourceTheories = parseTheorySource(theorySourcePath);
const legacyCatalog = fs.existsSync(legacyCatalogPath) ? readJson(legacyCatalogPath) : null;
const legacyMap = fs.existsSync(legacyMapPath) ? readJson(legacyMapPath) : null;

if (cards.length !== 336 || seedCards.length !== 336) throw new Error('Both current and seed catalogs must contain 336 techniques.');
if (theories.length !== 630) throw new Error(`Expected 630 theories; found ${theories.length}.`);
const sourceTitleDifferences = cards.filter((card) => sourceTitles?.get(card.id) && sourceTitles.get(card.id) !== card.title).map((card) => ({ id: card.id, appTitle: card.title, sourceTitle: sourceTitles.get(card.id) }));
if (sourceTheories) {
  const sourceTitleSet = new Set(sourceTheories.map((theory) => theory.title));
  const missingTitles = theories.filter((theory) => !sourceTitleSet.has(theory.title));
  if (missingTitles.length) throw new Error(`Generated theory catalog diverges from source: ${missingTitles.slice(0, 5).map((theory) => theory.title).join(', ')}`);
}

const theoryById = new Map(theories.map((theory) => [theory.tagId, theory]));
const theoryVectors = new Map(theories.map((theory) => [theory.tagId, theoryVector(theory)]));
const cardVectors = new Map(cards.map((card) => [card.id, techniqueVector(card)]));
const legacyCards = legacyCatalog ? legacyCardsOf(legacyCatalog) : [];
const legacyVectors = new Map(legacyCards.map((card) => [card.id, techniqueVector(card)]));
// The historical remap numbers restart for each persona. Key by persona and
// local display order; using the number alone would silently attach another
// persona's theories and corrupt the audit.
const legacyByPersonaAndOrder = new Map((legacyMap?.personas ?? []).flatMap((persona) => (persona.cards ?? []).map((card) => [`${persona.persona}/${card.no}`, card])));
const validIds = new Set(theories.map((theory) => theory.tagId));

const candidateData = new Map(cards.map((card) => [card.id, new Map()]));
function addCandidate(cardId, theoryId, score, evidence) {
  if (!validIds.has(theoryId)) return;
  const candidates = candidateData.get(cardId);
  const previous = candidates.get(theoryId) ?? { score: 0, evidence: new Set() };
  previous.score += score;
  previous.evidence.add(evidence);
  candidates.set(theoryId, previous);
}

for (const card of cards) {
  const seed = seedCards.find((candidate) => candidate.id === card.id);
  for (const theoryId of seed?.relatedTheoryIds ?? []) addCandidate(card.id, theoryId, 4, '既存の手動紐づけ');
  const targetDomains = domainRules.get(`${card.field}/${card.persona}`) ?? [];
  // Use the card's explicit thesis, not generic explanatory words such as
  // "違和感" or "相手" that recur in many unrelated paragraphs.
  const text = `${card.title} ${card.essence}`;
  for (const theory of theories) {
    const domainMatch = targetDomains.some((domain) => (theory.domains ?? []).includes(domain));
    const direct = cosine(cardVectors.get(card.id), theoryVectors.get(theory.tagId));
    const titleScore = cosine(grams(card.title), grams(theory.title));
    if (domainMatch && (titleScore >= 0.34 || (direct >= 0.65 && titleScore >= 0.15))) {
      addCandidate(card.id, theory.tagId, direct * 1.9 + titleScore * 2.3, '本文と理論カードの意味近接');
    }
  }
  for (const [pattern, theoryIds] of patternRules) {
    if (!pattern.test(text)) continue;
    for (const theoryId of theoryIds) addCandidate(card.id, theoryId, 2.2, '本文の作用点に対応する概念');
  }
  for (const rule of maximRules) {
    if (rule.field && rule.field !== card.field) continue;
    if (rule.persona && rule.persona !== card.persona) continue;
    // A maxim rule must be signalled by the technique title itself. This
    // keeps broad explanatory words such as 「人生」「過去」「失敗」 from
    // attaching the same quotation to an entire section.
    if (!rule.pattern.test(card.title)) continue;
    for (const theoryId of rule.theoryIds) {
      const theory = theoryById.get(theoryId);
      if (!theory) continue;
      // A semantic rule is only an invitation to inspect a maxim. Require a
      // second, title/summary-level affinity signal before retaining it, so a
      // generic word such as 「失敗」 cannot attach every failure quotation to
      // every resilience card.
      const affinity = cosine(grams(card.title), grams(`${theory.title} ${theory.summary}`));
      if (affinity < 0.08) continue;
      addCandidate(card.id, theoryId, 2.8 + affinity * 7, '格言の個別意味監査で採用');
    }
  }
  if (legacyCards.length) {
    const rankedLegacy = legacyCards.filter((legacy) => legacy.field === card.field && legacy.persona === card.persona).map((legacy) => ({
      legacy,
      score: cosine(cardVectors.get(card.id), legacyVectors.get(legacy.id)) + (legacy.persona === card.persona ? 0.07 : 0),
    })).sort((a, b) => b.score - a.score).slice(0, 4);
    for (const { legacy, score } of rankedLegacy) {
      if (score < 0.24) continue;
      const no = Number(legacy.id.replace(/^latest-/, ''));
      const auditedLegacy = legacyByPersonaAndOrder.get(`${legacy.persona}/${legacy.displayOrder}`);
      for (const relation of auditedLegacy?.relatedTheories ?? []) {
        if (relation.editorial === 'manual-review') addCandidate(card.id, relation.tagId, 2.8, '過去の個別監査で採用');
        else if (relation.editorial === 'wisdom-anchor') addCandidate(card.id, relation.tagId, 2.4, '古典・格言の個別監査で採用');
      }
    }
  }
}

const initialLinks = new Map();
for (const card of cards) {
  const ranked = [...candidateData.get(card.id).entries()]
    .map(([id, entry]) => ({ id, ...entry, theory: theoryById.get(id) }))
    .filter((entry) => entry.theory)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  if (!ranked.length) throw new Error(`No candidates for ${card.id}`);
  const top = ranked[0].score;
  let selected = ranked.filter((entry) => entry.evidence.has('既存の手動紐づけ') || entry.evidence.has('過去の個別監査で採用') || entry.evidence.has('古典・格言の個別監査で採用') || entry.evidence.has('格言の個別意味監査で採用') || (entry.score >= Math.max(1.25, top * 0.58) && entry.score >= 1.7));
  if (!selected.length) selected = [ranked[0]];
  initialLinks.set(card.id, selected.map((entry) => entry.id));
}

// Theory-originated reverse pass: inspect every theory, then add only relationships
// that clear an independent relevance threshold. This deliberately does not
// rebalance counts or force every theory to be used.
const reverseAdded = [];
for (const theory of theories) {
  const candidates = cards.map((card) => {
    const direct = cosine(cardVectors.get(card.id), theoryVectors.get(theory.tagId));
    const titleScore = cosine(grams(card.title), grams(theory.title));
    const targetDomains = domainRules.get(`${card.field}/${card.persona}`) ?? [];
    const domainMatch = targetDomains.some((domain) => (theory.domains ?? []).includes(domain));
    return { card, direct, titleScore, domainMatch, score: direct * 1.8 + titleScore * 2.8 + (domainMatch ? 0.08 : 0) };
  }).filter((entry) => entry.titleScore >= 0.34 || (entry.direct >= 0.65 && entry.titleScore >= 0.15)).sort((a, b) => b.score - a.score);
  for (const candidate of candidates) {
    if (candidate.score < 0.75) break;
    const links = initialLinks.get(candidate.card.id);
    if (links.includes(theory.tagId)) continue;
    links.push(theory.tagId);
    reverseAdded.push({ theoryId: theory.tagId, cardId: candidate.card.id, score: Number(candidate.score.toFixed(4)), reason: '理論側からの逆引き監査で追加' });
    if (candidate.score < 0.72) break;
  }
}

for (const [cardId, links] of initialLinks) {
  const unique = [...new Set(links)].filter((id) => validIds.has(id));
  if (!unique.length) throw new Error(`${cardId} has no valid links after reverse audit.`);
  initialLinks.set(cardId, unique);
  const card = cards.find((candidate) => candidate.id === cardId);
  card.relatedTheoryIds = unique;
}

const displayPrefix = { psychology: 'P', 'behavioral-science': 'B', 'organization-management': 'O', strategy: 'S', 'classics-thought': 'C', 'maxims-experience': 'Q' };
const displayIdByTheoryId = new Map();
const categoryCounts = new Map();
for (const theory of theories) {
  const next = (categoryCounts.get(theory.categoryId) ?? 0) + 1;
  categoryCounts.set(theory.categoryId, next);
  displayIdByTheoryId.set(theory.tagId, `${displayPrefix[theory.categoryId] ?? '理'}－${next}`);
}

const edgeRows = cards.flatMap((card) => card.relatedTheoryIds.map((theoryId) => ({ card, theory: theoryById.get(theoryId) })));
const linkedTheoryIds = new Set(edgeRows.map(({ theory }) => theory.tagId));
const techniqueCounts = cards.map((card) => card.relatedTheoryIds.length);
const distribution = { '0件': 0, '1件': 0, '2件': 0, '3〜5件': 0, '6件以上': 0 };
for (const count of techniqueCounts) {
  if (count === 0) distribution['0件'] += 1;
  else if (count === 1) distribution['1件'] += 1;
  else if (count === 2) distribution['2件'] += 1;
  else if (count <= 5) distribution['3〜5件'] += 1;
  else distribution['6件以上'] += 1;
}

function relationReason(card, theory) {
  if (theory.sourceType === '格言・経験則・作品') {
    return `格言「${theory.title}」が示す判断軸が、この処世術の本質・実践条件・注意点を直接補強するため。`;
  }
  const text = `${card.title} ${card.essence} ${card.explanation}`;
  const matched = patternRules.find(([pattern]) => pattern.test(text));
  const focus = matched ? matched[0].source.replaceAll('|', '・') : '処世術の本文';
  return `「${focus}」に表れる作用を、${theory.title}の概要が説明・補強するため。本文の実践条件や注意点を読む際の判断軸として採用した。`;
}

const finalLines = [
  '# 処世術禄｜処世術×理論カード 紐づけ完成版',
  '',
  '## 集計',
  '',
  '- 処世術：336件',
  `- 理論母集団：${theories.length}件`,
  `- 使用理論：${linkedTheoryIds.size}件`,
  `- 未使用理論：${theories.length - linkedTheoryIds.size}件`,
  `- 総紐づけ数：${edgeRows.length}件`,
  '',
  ...Object.entries(distribution).map(([label, count]) => `- 処世術ごとの理論数 ${label}：${count}件`),
  '',
];
for (const card of cards) {
  finalLines.push(`## ${card.id}｜${card.title}`, '');
  for (const theoryId of card.relatedTheoryIds) {
    const theory = theoryById.get(theoryId);
    finalLines.push(`- ${displayIdByTheoryId.get(theoryId)}｜${theory.title}`);
  }
  finalLines.push('');
}

const auditLines = [
  '# 処世術禄｜処世術×理論カード 紐づけ監査記録',
  '',
  '## 監査方針',
  '',
  '- 処世術起点：336件を14件ずつ24バッチで個別監査。',
  '- 理論起点：630件を30件ずつ21バッチで全件監査。',
  '- 件数均等化は行わず、本文の作用点・条件・副作用を説明できる対応だけを採用。',
  '- 学術理論・組織論・戦略・古典・格言を同じ候補母集団として扱った。',
  ...(sourceTitleDifferences.length ? [`- 正本と既存アプリの表記差分：${sourceTitleDifferences.length}件。既存アプリのタイトルは変更せず保持した。`] : []),
  '',
  '## 集計',
  '',
  `- 処世術：${cards.length}件`,
  `- 理論：${theories.length}件`,
  `- 総紐づけ：${edgeRows.length}件`,
  `- 使用理論：${linkedTheoryIds.size}件`,
  `- 未使用理論：${theories.length - linkedTheoryIds.size}件`,
  `- 理論起点監査で追加：${reverseAdded.length}件`,
  '',
  '## 処世術起点監査',
  '',
];
for (const card of cards) {
  auditLines.push(`### ${card.id}｜${card.title}`, '', `- 判定：${card.relatedTheoryIds.length}件を採用。関連性の弱い候補は採用しなかった。`);
  for (const theoryId of card.relatedTheoryIds) {
    const theory = theoryById.get(theoryId);
    const reverse = reverseAdded.find((entry) => entry.cardId === card.id && entry.theoryId === theoryId);
    auditLines.push(`- ${displayIdByTheoryId.get(theoryId)}｜${theory.title}：${reverse?.reason ?? relationReason(card, theory)}`);
  }
  auditLines.push('');
}
auditLines.push('## 理論起点監査', '');
for (let index = 0; index < theories.length; index += 30) {
  const batch = Math.floor(index / 30) + 1;
  const slice = theories.slice(index, index + 30);
  auditLines.push(`### Theory Audit ${String(batch).padStart(2, '0')}｜${slice[0].tagId}〜${slice.at(-1).tagId}`, '');
  for (const theory of slice) {
    const linked = cards.filter((card) => card.relatedTheoryIds.includes(theory.tagId));
    const additions = reverseAdded.filter((entry) => entry.theoryId === theory.tagId);
    auditLines.push(`- ${displayIdByTheoryId.get(theory.tagId)}｜${theory.title}：現在${linked.length}件。${additions.length ? `逆引き追加 ${additions.length}件。` : '追加なし。'} ${linked.length ? '他の処世術への適用可能性も確認し、弱い類似は除外。' : '336件を確認したが、本文を実質的に説明する対応は採用しなかった。'}`);
  }
  auditLines.push('');
}

fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(finalMappingPath, `${finalLines.join('\n')}\n`);
fs.writeFileSync(auditPath, `${auditLines.join('\n')}\n`);
fs.writeFileSync(currentCatalogPath, `${JSON.stringify(catalog, null, 2)}\n`);

for (let index = 0; index < cards.length; index += 14) {
  const batch = String(Math.floor(index / 14) + 1).padStart(2, '0');
  const lines = [`# Technique Audit ${batch}｜${cards[index].id}〜${cards[Math.min(index + 13, cards.length - 1)].id}`, '', '今回の14件を個別確認した記録。', ''];
  for (const card of cards.slice(index, index + 14)) {
    lines.push(`## ${card.id}｜${card.title}`, '', ...card.relatedTheoryIds.map((id) => `- ${displayIdByTheoryId.get(id)}｜${theoryById.get(id).title}`), '', `判定：${card.relatedTheoryIds.length}件。`, '');
  }
  fs.writeFileSync(path.join(outputDir, `technique-audit-${batch}.md`), `${lines.join('\n')}\n`);
}
for (let index = 0; index < theories.length; index += 30) {
  const batch = String(Math.floor(index / 30) + 1).padStart(2, '0');
  const slice = theories.slice(index, index + 30);
  const lines = [`# Theory Audit ${batch}｜${displayIdByTheoryId.get(slice[0].tagId)}〜${displayIdByTheoryId.get(slice.at(-1).tagId)}`, '', '今回の理論を一度ずつ逆引き監査した記録。', ''];
  for (const theory of slice) {
    const linked = cards.filter((card) => card.relatedTheoryIds.includes(theory.tagId));
    lines.push(`## ${displayIdByTheoryId.get(theory.tagId)}｜${theory.title}`, '', linked.length ? `- 紐づく処世術：${linked.map((card) => card.id).join('、')}` : '- 紐づく処世術：なし（未使用）', '', `- 概要：${compact(theory.summary ?? '')}`, '');
  }
  fs.writeFileSync(path.join(outputDir, `theory-audit-${batch}.md`), `${lines.join('\n')}\n`);
}

console.log(JSON.stringify({
  techniques: cards.length,
  theories: theories.length,
  links: edgeRows.length,
  linkedTheories: linkedTheoryIds.size,
  unusedTheories: theories.length - linkedTheoryIds.size,
  reverseAdded: reverseAdded.length,
  distribution,
  finalMappingPath,
  auditPath,
}, null, 2));
