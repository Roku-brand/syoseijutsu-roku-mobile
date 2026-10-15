import fs from 'node:fs';import {createHash} from 'node:crypto';import {reviewedRelations} from './reviewed-theory-relations.mjs';import {workLinkChanges} from './reviewed-work-theory-links.mjs';
if(!process.argv[2]) throw Error('Provide the privileged pre-content snapshot JSON.');
const source=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));const rows=source.theories;const ids=new Set(rows.map(t=>t.id));const byId=new Map(rows.map(t=>[t.id,t]));
const exceptions={};
const assign=(type,list)=>list.split(/\s+/).filter(Boolean).forEach(id=>exceptions[id]=type);
assign('method','kb_225 kb_210 kb_238 kb_272 kb_901 kb_227 kb_217 kb_226 kb_224 kb_222 kb_223 kb_580 kb_578 kb_202 kb_230 kb_237 kb_264 kb_262 kb_038 kb_426 kb_427 kb_412 kb_411 kb_052 kb_053 kb_054 kb_024 kb_040 kb_056 kb_097 kb_099 kb_098 kb_100 kb_277 kb_172 kb_174 kb_173 kb_749 kb_539 kb_178 kb_179 kb_528 kb_182 kb_438 kb_529 kb_533 kb_534 kb_541 kb_198 kb_415 kb_948 kb_130 kb_507 kb_516 kb_509 kb_108 kb_449 kb_570 kb_148 kb_149 kb_154 kb_522 kb_150 kb_151 kb_152 kb_153 kb_161 kb_486 kb_524 kb_160 kb_159 kb_147 kb_525 kb_792 kb_164 kb_166 kb_542 kb_286 kb_280 kb_279 kb_599 kb_282 kb_284 kb_548 kb_488 kb_544 kb_561 kb_495 kb_546 kb_952 kb_398 kb_407 kb_016 kb_406 kb_408 kb_101 kb_417 kb_464 kb_431 kb_448 kb_432 kb_471 kb_554 kb_547 kb_483 kb_498 kb_435 kb_487 kb_394 kb_517 kb_538 kb_553');
assign('heuristic','kb_416 kb_409 kb_463 kb_557 kb_568 kb_591 kb_530 kb_532 kb_592 kb_594 kb_192 kb_502 kb_482 kb_475 kb_443 kb_499 kb_551 kb_545 kb_132');
assign('thought','kb_562 kb_263 kb_583 kb_754 kb_867 kb_868');
assign('model','kb_906 kb_724 kb_726 kb_822 kb_062 kb_861 kb_745 kb_943 kb_944 kb_764 kb_775 kb_803 kb_806 kb_908 kb_941 kb_802 kb_162 kb_165 kb_796 kb_797 kb_798 kb_799 kb_163 kb_795 kb_862');
assign('principle','kb_047 kb_035 kb_171 kb_575 kb_755 kb_274 kb_401 kb_794 kb_863 kb_934 kb_932 kb_933 kb_918 kb_513 kb_518');
const duplicateGroups=[
 {ids:['kb_111','kb_112'],note:'印象管理と自己呈示は概念の重なりが大きい。行動の調整と望む自己像の伝達という焦点を保ち、根拠のない包含を付けない。'},
 {ids:['kb_245','kb_581','kb_582'],note:'基本的前提の崩れという主題が重なる。理論の語・意味世界の経験・前提の再構成という記述の焦点を監査。機械的統合は保留。'},
 {ids:['kb_102','kb_514'],note:'希少性による価値評価の重複候補。承諾原理と価値の捉え方を区別し、科学的な別効果と主張しない。'},
 {ids:['kb_141','theory-1789620805420-wbuepmtu'],note:'同一の妥協効果を説明する異名。無料・完全版の公開範囲が異なり、ID統合で境界を変えない。関連欄で通称との対応を示す。'},
 {ids:['kb_195','kb_508','kb_557'],note:'Mertonの目標置換に対応。前二者の異名を明示し、個人の実務への応用である手段の目的化と関連付ける。'},
 {ids:['kb_579','kb_604'],note:'同じ提要第1節の概念名と日常向けの言い換え。公開範囲が異なるためIDは維持し、関連欄で対応を示す。'},
 {ids:['kb_549','kb_629'],note:'同じ孫子虚実篇の原句と解釈。公開範囲を保ち、同じ出典に基づくことを関連欄で明示する。'},
 {ids:['kb_088','kb_089'],note:'特異性信用を獲得する過程と、許容を蓄積した信用という状態の対応。別の確立した法則であると断定しない。'},
];
const classify=t=>{
 if(exceptions[t.id])return exceptions[t.id];
 if(t.category_id==='classics-thought')return 'thought';
 if(/モデル|枠組み/.test(t.title))return 'model';
 if(/理論|仮説/.test(t.title))return 'theory';
 if(/法則|原理/.test(t.title))return 'principle';
 if(/効果|バイアス|錯覚|錯誤|誤謬|現象|パラドックス/.test(t.title))return 'phenomenon';
 if(t.category_id==='practical-wisdom')return 'heuristic';
 return 'unspecified';
};
const review=rows.map(t=>({id:t.id,title:t.title,categoryId:t.category_id,subcategoryId:t.subcategory_id,knowledgeType:classify(t),sourceSha256:createHash('sha256').update(JSON.stringify({id:t.id,title:t.title,summary:t.summary,category:t.category_id,subcategory:t.subcategory_id,displayId:t.display_id,accessTier:t.access_tier})).digest('hex'),reviewedOn:'2026-10-15',titleBodyAlignment:t.id==='kb_002'?'表記修正：親近効果→新近効果（recency effect）。旧表記は検索別名に保持。':'本文の主題と見出しの対応を確認',independentValue:'理論・現象・方法・経験則・思想の役割を区別。学術名の保証と実務上の説明価値を混同しない。',classificationDecision:'既存の大分類・内部分類を維持。追加・分割・第3階層なし。',duplicateNote:duplicateGroups.filter(g=>g.ids.includes(t.id)).map(g=>g.note).join(' ')||null,relationshipReview:'既存リンクを一般的な関連として保全。本文から関係を確認できた組だけ種別を設定。未接続を件数合わせで解消しない。',conciseness:t.summary.length<=250?'短い知識カードとして維持':'説明の適用条件を含むため維持',needsFurtherReview:duplicateGroups.some(g=>g.ids.includes(t.id))||classify(t)==='unspecified'}));
const relations=reviewedRelations.map(([sourceId,targetId,type,rationale],i)=>{if(!ids.has(sourceId)||!ids.has(targetId)||sourceId===targetId)throw Error('Invalid relation '+sourceId+'/'+targetId);if(['contrasts','complements','related'].includes(type)&&sourceId>targetId)[sourceId,targetId]=[targetId,sourceId];return {sourceId,targetId,type,rationale,reviewStatus:'confirmed',priority:i+1};});
const seen=new Set();for(const r of relations){const key=[r.sourceId,r.targetId].sort().join('|');if(seen.has(key))throw Error('Duplicate pair '+key);seen.add(key);}
const edges=new Map();for(const r of relations.filter(r=>r.type==='contains'))edges.set(r.sourceId,[...(edges.get(r.sourceId)??[]),r.targetId]);const visit=(id,path=[])=>{if(path.includes(id))throw Error('Contains cycle '+id);for(const child of edges.get(id)??[])visit(child,[...path,id]);};for(const id of edges.keys())visit(id);
const work=workLinkChanges.map(c=>{const t=source.techniques.find(t=>t.id===c.id);if(!t)throw Error(c.id);const links=[...new Set([...t.theory_ids.filter(id=>!c.remove.includes(id)),...c.add])];if(c.primary.some(id=>!links.includes(id)))throw Error('Primary outside all '+c.id);return {...c,title:t.title,beforeTheoryIds:t.theory_ids,beforePrimaryIds:t.primary_theory_ids,afterTheoryIds:links,afterPrimaryIds:c.primary,roles:links.map(id=>({theoryId:id,role:c.primary.includes(id)?(classify(byId.get(id))==='method'?'実践手法':'背景原理'):byId.get(id).category_id==='classics-thought'?'補完する思想':'補足・適用条件'})),reviewedOn:'2026-10-15'};});
fs.writeFileSync('docs/content/theory-editorial-review-20261015.json',JSON.stringify(review,null,2)+'\n');fs.writeFileSync('docs/content/theory-knowledge-relations-20261015.json',JSON.stringify(relations,null,2)+'\n');fs.writeFileSync('docs/content/work-theory-link-review-20261015.json',JSON.stringify(work,null,2)+'\n');
console.log({reviewed:review.length,types:Object.fromEntries([...new Set(review.map(x=>x.knowledgeType))].map(k=>[k,review.filter(x=>x.knowledgeType===k).length])),relations:relations.length,workChanges:work.length,duplicateGroups:duplicateGroups.length});
