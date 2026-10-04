import fs from 'node:fs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const before=read('docs/content/theory-taxonomy-before.json'),rows=read('docs/content/theory-taxonomy-after.json'),plan=read('docs/content/theory-taxonomy-plan.json');
const sub=read('src/data/generated/theory-subcategories.json'),redirects=read('src/data/generated/theory-id-redirects.json');
const ids=new Set(rows.map(t=>t.tagId)),resolve=id=>redirects[id]??id;
const findings=[];
const duplicate=(values)=>[...new Map(values.map(v=>[v,values.filter(x=>x===v).length])).entries()].filter(([,n])=>n>1);
const normalize=s=>s.normalize('NFKC').trim().toLocaleLowerCase();
const titleDuplicates=duplicate(rows.map(t=>normalize(t.title)));
const aliasOwners=new Map();
for(const t of rows)for(const name of [t.title,...t.aliases]){const key=normalize(name);const owners=aliasOwners.get(key)??new Set();owners.add(t.tagId);aliasOwners.set(key,owners);}
const aliasConflicts=[...aliasOwners].filter(([,owners])=>owners.size>1).map(([name,owners])=>({name,ids:[...owners]}));
const legacyIds=rows.flatMap(t=>t.legacyIds);
for(const t of rows){
 const s=sub.find(s=>s.id===t.subcategoryId);
 if(!s || s.categoryId!==t.categoryId) findings.push(`classification: ${t.tagId}`);
 if(t.relatedTheoryIds.some(id=>!ids.has(id)||id===t.tagId))findings.push(`theory links: ${t.tagId}`);
}
const techniques=read('src/data/generated/techniques.json').categories.flatMap(c=>c.subcategories.flatMap(s=>s.items));
for(const t of techniques)for(const id of [...t.relatedTheoryIds??[],...t.primaryTheoryIds??[]])if(!ids.has(id))findings.push(`technique link: ${t.id} -> ${id}`);
for(const t of before)if(!ids.has(resolve(t.id)))findings.push(`lost ID: ${t.id}`);
for(const s of sub){const members=rows.filter(t=>t.subcategoryId===s.id);if(members.some((t,i)=>t.sortOrder!==i+1))findings.push(`order: ${s.id}`);}
const classificationReview=[
 ['kb_240','心理学 > 自己','逆境一般を説明し、悲嘆だけに限定されない。回復過程と個人資源のどちらを入口にするか。'],
 ['kb_559','心理学 > 社会心理','レヴィンの個人と環境の相互作用。認知過程との境界。'],
 ['kb_097','実践知 > 人間関係','臨床技法としての標準化・根拠を確認するまで追加移動しない。'],
 ['kb_533','実践知 > 行動','習慣形成の説明と最小行動を決める実用手順の境界。'],
 ['kb_101','心理学 > 心理技法','独立した会話技法としての出典・適用範囲を確認。'],
 ['kb_552','行動科学 > 目標達成','偶然の発見という概念と、発見を促す実務のどちらを本文で扱うか。'],
 ['kb_417','心理学 > 対人','独立した学術概念か、会話上の工夫につけた説明名か。'],
 ['kb_409','心理学 > 言語','顕著性という心理現象と会話の読み取り方の境界。'],
 ['kb_463','心理学 > 言語','タイミング一般は説明範囲が広い。現行本文の対話目的を超える移動は保留。'],
 ['kb_450','戦略論 > 判断','一般的な認知過程か、専門家の意思決定モデルか。'],
 ['kb_545','実践知 > 判断','80対20の経験則としての説明と、偏りを調べる分析用途の境界。'],
 ['kb_433','心理学 > 自己','責任判断一般と、対人関係の罪悪感との境界。'],
 ['kb_481','組織・経営論 > 人事','一般的な社会規範か、職場での評価・自己宣伝問題か。'],
 ['kb_286','戦略論 > 実行','撤退判断をリスク管理として扱うか、実行局面として扱うか。'],
 ['kb_016','現行タイトルを維持','「呼び名効果」は独立した確立済み効果ではない。統合後は実用名。旧別名は保持。'],
 ['kb_406','現行タイトルを維持','「仮説提示効果」の学術上の正式名称が未確認。本文に沿う実用名と旧別名を保持。'],
 ['kb_758','独立カードへの分割を検討','曖昧性回避という現象とエルズバーグのパラドックスは同義語とは限らない。既存一枚の構成を保持し、追加分割は保留。'],
 ['kb_840','独立カードへの分割を検討','希少性マインドセットとトンネリングは枠組みと作用機序の関係。別名として扱わない。'],
 ['kb_749','正式な理論と応用手法の区別を検討','メンタル・コントラスティングと実行意図を含むWOOP・MCIIは同義ではない。既存カードの分割は保留。'],
 ['kb_841','一般理論と固有効果の区別を検討','リスク補償一般とペルツマンの研究対象が同一範囲かを確認。'],
 ['kb_853','独立カードへの分割を検討','経験曲線の原価と学習曲線の習熟では測る対象が異なり得る。既存一枚の分割は保留。'],
 ['kb_735','現象と理論枠組みの区別を検討','観察学習と社会的学習理論の親子関係を確認。旧複合タイトルを同義のaliasesには移さない。'],
 ['kb_862','独立カードへの分割を検討','ミニマックスとマキシミンは同一ではない。既存対比カードであり、今回新たな統合はしていない。'],
];
const candidate=read('docs/content/theory-duplicate-candidates.json');
const pairs=new Map();
function decision(a,b,result,reason){const key=[a,b].sort().join('|');pairs.set(key,{a,b,result,reason});}
for(const p of candidate.pairs){
 const a=before.find(t=>t.id===p.a),b=before.find(t=>t.id===p.b);
 decision(p.a,p.b,'別理論として維持',`Aは「${a.summary.split('。')[0]}」、Bは「${b.summary.split('。')[0]}」。対象・機序・範囲を分けて保持。`);
}
for(const m of plan.merges)decision(m.canonicalId,m.legacyId,'統合',m.reason);
const special=[
 ['kb_001','kb_002','別理論として維持','最初と最後の情報の効果。対照概念であり統合禁止。'],
 ['kb_133','kb_134','別理論として維持','プロスペクト理論とその構成要素である損失回避。親子概念。'],
 ['kb_216','kb_580','別理論として維持','反すうの説明と中断の対処法。現象と手法。'],
 ['kb_437','kb_536','別理論として維持','強化に焦点を当てる説明と、結果による行動学習全体。説明範囲が異なる。'],
 ['kb_124','kb_123','別理論として維持','低い期待による低下と高い期待による向上。対照概念。'],
 ['kb_820','kb_819','別理論として維持','否定的期待と治療文脈による改善等。作用方向が異なる。'],
 ['kb_584','kb_571','別理論として維持','資源のストックという概念と、その形成を投資として説明する理論。'],
 ['kb_514','kb_102','要確認','希少性による価値判断が重なるが、希少資源と説得の原理の出典・範囲を確認する。'],
 ['theory-1789620805420-wbuepmtu','kb_141','要確認','現行定義は中間選択で近い。ゴルディロックスの呼称が別分野でも使われるため出典確認を要する。'],
 ['kb_063','kb_457','要確認','定義が重なる。効果と行動という名称だけで統合せず、出典・説明範囲を確認する。'],
 ['kb_195','kb_508','要確認','指標と目的の逆転が重なる。組織の目標置換との同一性を一次資料で確認する。'],
 ['kb_055','kb_436','要確認','面子一般と、自律・承認を含むフェイス理論との範囲差を確認する。'],
 ['kb_549','kb_629','要確認','孫子の同じ文の一部と全文。翻訳・本文の射程を確認するまで保持。'],
 ['kb_148','kb_147','別理論として維持','原則立脚型の複数原則のうち、利益への着目という部分に焦点を当てた手法。'],
 ['kb_223','kb_224','別理論として維持','ACTの思考との距離の技法と、経験全般を観察する視点。共通性だけでは同一にしない。'],
];
for(const d of special)if(before.some(t=>t.id===d[0])&&before.some(t=>t.id===d[1]))decision(...d);
const byId=new Map(before.map(t=>[t.id,t]));
const unresolved=[...pairs.values()].filter(p=>p.result==='要確認');
const audit={source:'Supabase psfexomjhivqieehcrzx / public.theories',before:before.length,after:rows.length,mergedPairs:plan.merges.length,retiredContents:before.length-rows.length,physicalDeletes:0,unclassified:rows.filter(t=>!t.subcategoryId).length,other:rows.filter(t=>/その他/.test(t.subcategoryTitle)).length,missingIds:rows.filter(t=>!t.tagId).length,duplicateIds:duplicate(rows.map(t=>t.tagId)),duplicateTitles:titleDuplicates,aliasConflicts,legacyConflicts:duplicate(legacyIds),lostPreviousIds:before.filter(t=>!ids.has(resolve(t.id))).length,linkFailures:findings.filter(f=>/links?:/.test(f)),orderFailures:findings.filter(f=>f.startsWith('order:')),categories:[...new Set(rows.map(t=>t.categoryTitle))].map(title=>({title,count:rows.filter(t=>t.categoryTitle===title).length,subcategories:sub.filter(s=>rows.some(t=>t.categoryTitle===title&&t.subcategoryId===s.id)).map(s=>({title:s.title,count:rows.filter(t=>t.subcategoryId===s.id).length}))})),classificationReviewCount:classificationReview.length,duplicateReviewCount:unresolved.length,pairComparisonCount:candidate.comparedPairs};
fs.writeFileSync('docs/content/theory-taxonomy-audit.json',JSON.stringify(audit,null,2)+'\n');
const md=['# 理論分類・重複レビュー','', '正本759件のタイトル・本文・関連・出典を確認し、明示的なID対応表で分類した。文字列候補検出は全287,661組を比較する補助検査であり、意味の同一性を証明しない。低信頼の統合は実行しない。以下の提案への追加移動は未実行。','', '## 分類・名称の要レビュー','', '| ID | 理論名 | 現在分類 | 提案分類 | 論点 | 信頼度 |','|---|---|---|---|---|---|'];
for(const [id,proposal,issue]of classificationReview){const t=rows.find(t=>t.tagId===id);md.push(`| ${id} | ${t?.title} | ${t?.categoryTitle} > ${t?.subcategoryTitle} | ${proposal} | ${issue} | 中（追加変更は保留） |`);}
md.push('','## 重複候補の判定','','| A | B | 判定 | 理由 |','|---|---|---|---|');
for(const p of pairs.values())md.push(`| ${p.a}: ${byId.get(p.a)?.title} | ${p.b}: ${byId.get(p.b)?.title} | ${p.result} | ${p.reason} |`);
md.push('','## 分類の境界','','心理学は説明対象を軸にし、心理技法を独立させる。社会心理は集団・社会規範、対人は二者の関係、言語は伝達・説得の機序。記憶は保持・想起の仕組み、行動科学の学習は反復・練習・行動変化。喪失は悲嘆・役割喪失・回復の文脈。','', '行動科学の意思決定は価値・確率・時間の評価、選択は提示された選択肢の比較、行動設計は環境への介入。習慣は反復と文脈、動機づけは行動の強さ、目標達成は目標と遂行の制御。','', '組織・経営論は職務個人、共同作業チーム、指導者、制度・文化、雇用・評価、人脈、権力、経営の直接対象で一つに決める。職場で観察できるだけの一般心理概念は心理学へ。','', '戦略論は情報構造を分析し、判断し、交渉・競争・ゲームの局面に進み、損失を制御し、適応して実行する分類。交渉は合意形成、ゲームは相互依存する選択の構造。','', '実践知は会話、関係維持、思考、判断、着手、仕事、自己管理、キャリアという利用目的。元から存在する39のオリジナル原文は変更しない。古典・思想は系譜、兵法、ことわざ、短い格言、作品という出典・形式を優先。','', '分類は一義的な学問体系を主張するものではなく、この本文が直接扱う対象に対する一つの主分類。関連領域は関連理論・検索で横断する。');
fs.writeFileSync('theory_classification_review.md',md.join('\n')+'\n');
const report=['# 理論再構成・監査結果','','正本は Supabase `psfexomjhivqieehcrzx` の `public.theories`。変更前は公開759件。リポジトリの759件スナップショットとID・タイトル・本文・大分類のMD5が一致した（`041403168f4b650ab737b95454c42ffa`）。古い349/386/630件ファイルは編集対象にしない。作業用クローンは `theory-restructure`。','', '一覧・詳細は `catalog.ts` と `theories.public.json` を初期表示に使用し、`public_theories` で公開メタデータを同期する。完全版本文は認証済み `paid-content` から取得する。CMSは `theories` と公開・下書きRPC。`paid_content` は正本ではなくトリガーによる投影。数値表示ID（P-001等）と安定ID（kb_NNN、theory-UUID）は別。','', '## 件数','','| 大分類 | 件数 | 内部分類（件数） |','|---|---:|---|'];
for(const c of audit.categories)report.push(`| ${c.title} | ${c.count} | ${c.subcategories.map(s=>`${s.title} ${s.count}`).join('、')} |`);
report.push('','統合前759、統合後754。統合5組、非表示化5件、物理削除0件。元の759件全てに解決先がある。無料151件を維持。','', '## 実装','','`subcategoryId`、`subcategoryTitle`、`sortOrder`、`canonicalId`、`legacyIds`、`mergedFromIds` を追加。6大分類とカード、余白・フォントを保持し、見出しで内部分類を表示。50件のページングを維持。検索は全件横断で別名も対象とし、検索カードに所属を表示。','', 'CMSに大分類と内部分類の選択、内部分類内の順番、内部分類の追加・名称変更・移動順・空分類の削除を追加。保存・公開RPCで所属を検証する。','', '旧IDはクライアントの辞書、保存復元処理、DBの互換行、認証済み本文の互換投影から解決する。旧アプリ向け `public_theories` は759行を返し、新クライアントはcanonical行だけを採用して754件を表示する。旧URLの静的ルートも維持する。履歴イベントと変更履歴は原記録を保持する。処世術の正・副リンク、理論間リンク、処世術下書き、ランキング、SNS元理論リンクは移行する。','', '表示IDは安定IDではない。大分類移動先では空き番号を使用し、未移動行とオリジナルA-001〜039を保持。表示順は内部分類内の基礎概念を先頭に置いた明示順であり五十音順ではない。','', '## 自動監査','','| 項目 | 結果 |','|---|---:|',`| 未分類 | ${audit.unclassified} |`,`| その他 | ${audit.other} |`,`| ID欠損 | ${audit.missingIds} |`,`| ID重複 | ${audit.duplicateIds.length} |`,`| title重複（NFKC） | ${audit.duplicateTitles.length} |`,`| 別名の他カードとの競合 | ${audit.aliasConflicts.length} |`,`| legacyId競合 | ${audit.legacyConflicts.length} |`,`| 旧IDの解決漏れ | ${audit.lostPreviousIds} |`,`| 処世術・理論リンク切れ | ${audit.linkFailures.length} |`,`| 順番の不整合 | ${audit.orderFailures.length} |`,`| 分類・名称レビュー | ${classificationReview.length} |`,`| 未統合の重複レビュー | ${unresolved.length} |`,'', '検証ログ、DB適用状況、画面証跡は `docs/content/theory-taxonomy-validation.md` に記録する。実データ対応はbefore/after/plan JSON、重複候補はtheory-duplicate-candidates JSON、判断表はルートのtheory_classification_review.md。','', '復元用にDBのowner専用 `theory_taxonomy_backups` とリポジトリの正本スナップショットを保持。移行は公開件数と正本ハッシュが変わると中断し、再レビューなしに上書きしない。');
fs.writeFileSync('docs/content/theory-taxonomy-audit.md',report.join('\n')+'\n');
if(findings.length||titleDuplicates.length||aliasConflicts.length||audit.duplicateIds.length||audit.legacyConflicts.length)throw Error(JSON.stringify({findings,titleDuplicates,aliasConflicts}));
console.log(JSON.stringify(audit));
