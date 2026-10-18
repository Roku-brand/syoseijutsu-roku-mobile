import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {additions} from './theory-release-20261018-data.mjs';
import {mapTheoryDisplayIds} from './public-content-portfolio.mjs';

const read = file => JSON.parse(fs.readFileSync(file,'utf8'));
const write = (file,value) => fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');
const base='docs/content/theory-release-20261018';
const baseline=read(base+'-baseline.json');
const frozenSnapshot=read(base+'-snapshot.json');
const snapshot = file => structuredClone(frozenSnapshot[file]);
const fingerprint = value => createHash('sha256').update(JSON.stringify(value??null)).digest('hex');
const previous=snapshot('src/data/generated/theories.json');
const sections=read('src/data/generated/theory-subcategories.json');
assert.deepEqual(sections,snapshot('src/data/generated/theory-subcategories.json'),'Do not overwrite a later taxonomy.');
const sectionById=new Map(sections.map(s=>[s.id,s]));
const review=read(base+'-alias-review.json');
const normalize = s => s.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-0x60)).replace(/[・･]/g,'').replace(/[‐‑‒–—−]/g,'-').replace(/([a-z])-(?=[a-z])/g,'$1 ').replace(/\s+/g,' ').trim();
const categories=[...new Set(previous.map(t=>t.categoryId))];
const categoryTitles=Object.fromEntries(previous.map(t=>[t.categoryId,t.categoryTitle]));
assert.equal(previous.length,821); assert.equal(additions.length,124);
const cards=structuredClone(previous);
const byId=new Map(cards.map(t=>[t.tagId,t]));
const removals=[];
for(const row of review.removals){const t=byId.get(row.id);t.aliases=t.aliases.filter(a=>{if(row.terms.includes(a)){removals.push({id:row.id,term:a,reason:row.reason});return false;}return true;});}
const aliasChanges=[];
const excluded=[];
const names=new Map();
for(const t of cards)for(const name of [t.title,...t.aliases??[]]){
  const key=normalize(name); assert.ok(!names.has(key)||names.get(key)===t.tagId,`Existing collision: ${name}`);names.set(key,t.tagId);
}
const addAlias=(t,term,source)=>{
  const key=normalize(term);
  if(names.has(key)){excluded.push({id:t.tagId,term,reason:names.get(key)===t.tagId?'normalized duplicate':'other identity collision'});return;}
  t.aliases??=[];t.aliases.push(term);names.set(key,t.tagId);aliasChanges.push({id:t.tagId,term,source});
};
for(const row of review.rows.filter(r=>r.decision==='alias')){
  const t=byId.get(row.id);assert.equal(t?.title,row.title,`Alias identity drift: ${row.id}`);addAlias(t,row.term,row.source);
}
const added=[];
for(const [index,row] of additions.entries()){
  const section=sectionById.get(row.section);assert.ok(section,row.title);
  const tagId=`kb_${957+index}`;assert.ok(!byId.has(tagId));assert.ok(!names.has(normalize(row.title)),row.title);
  const t={tagId,title:row.title,summary:row.summary,categoryId:section.categoryId,categoryTitle:categoryTitles[section.categoryId],subcategoryId:section.id,subcategoryTitle:section.title,
    canonicalId:tagId,legacyIds:[],mergedFromIds:[],aliases:[],relatedTheoryIds:[...row.relatedTheoryIds],accessTier:'complete',knowledgeType:row.knowledgeType,provenance:row.provenance};
  names.set(normalize(t.title),tagId);
  for(const alias of row.aliases)addAlias(t,alias,t.provenance.sources[0].url);
  assert.ok(t.summary.length>=150 && t.provenance.sources.length && t.provenance.note,t.title);
  cards.push(t);byId.set(tagId,t);added.push(t);
}
const keywordMap={};
const keyword=(id,term)=>{assert.ok(byId.has(id),id);keywordMap[id]??=[];if(!keywordMap[id].includes(term))keywordMap[id].push(term);};
for(const [term,ids]of Object.entries(review.ambiguous))for(const id of ids)keyword(id,term);
for(const row of review.removals)for(const term of row.terms)keyword(row.id,term);
const byCandidate=new Map(additions.map((r,i)=>[String(r.candidate),added[i]]));
for(const [candidate,terms]of Object.entries({7:['トップダウン処理','ボトムアップ処理','top-down processing','bottom-up processing'],20:['前向干渉','逆向干渉','proactive interference','retroactive interference'],21:['TOT'],42:['fear of negative evaluation'],67:['マシュマロ実験','marshmallow test'],104:['行動変容の輪','behaviour change wheel'],139:['STAR']}))for(const term of terms)keyword(byCandidate.get(candidate).tagId,term);
keyword('kb_048','部分強化消去効果');keyword('kb_003','ホーン効果');
const relations=structuredClone(snapshot('src/data/generated/theory-relations.json'));
const relationChanges=[];
const connect=(a,b,reason)=>{
  assert.ok(byId.has(a)&&byId.has(b)&&a!==b,`${a}/${b}`);
  for(const [source,target]of [[a,b],[b,a]])byId.get(source).relatedTheoryIds=[...new Set([...(byId.get(source).relatedTheoryIds??[]),target])];
  const [sourceId,targetId]=[a,b].sort();
  if(!relations.some(r=>[r.sourceId,r.targetId].sort().join('|')===`${sourceId}|${targetId}`)){
    const relation={sourceId,targetId,type:'related',reviewStatus:'confirmed',rationale:reason,priority:100};relations.push(relation);relationChanges.push(relation);
  }
};
for(const t of added)for(const id of t.relatedTheoryIds)connect(t.tagId,id,`${t.title}と${byId.get(id)?.title}は説明対象・手法を区別しながら読める。${additions.find(r=>r.title===t.title).provenance.note}`);
for(const [a,b,reason]of [[1,2,'意識的識別の閾値と信号・雑音の判断基準を対比する。'],[3,'extra-absolute','刺激の存在の閾値と差の閾値を区別する。'],[17,18,'知識構造一般と出来事の順序の知識を区別する。'],[51,50,'社会的な名付けと、分類される人から分類へ戻る相互作用を比較する。'],[81,82,'普及による魅力低下と、高価格による地位表示を区別する。'],[104,106,'行動条件の診断と、介入アイデアの設計枠組みを併用できる。'],[132,'extra-ipass','状況連絡と担当交代の引き継ぎの構造を比較する。'],[147,148,'問いの分解と、その区分の重複・抜けを点検する。']])connect(byCandidate.get(String(a)).tagId,byCandidate.get(String(b)).tagId,reason);
// Keep all existing stable IDs, within-section order and identity metadata.
// Append new material per section, then derive dense category display numbers.
const ordered=[];
for(const category of categories)for(const section of sections.filter(s=>s.categoryId===category).sort((a,b)=>a.displayOrder-b.displayOrder)){
  const members=[...cards.filter(t=>t.subcategoryId===section.id && !added.includes(t)).sort((a,b)=>a.sortOrder-b.sortOrder),...added.filter(t=>t.subcategoryId===section.id)];
  members.forEach((t,i)=>{t.sortOrder=i+1;});ordered.push(...members);
}
for(const category of categories)ordered.filter(t=>t.categoryId===category).forEach((t,i)=>{t.displayId=i+1;t.displayOrder=i+1;});
assert.equal(ordered.length,945);
for(const t of ordered)for(const id of t.relatedTheoryIds??[])assert.ok(byId.has(id)&&id!==t.tagId,`${t.tagId}/${id}`);
const expected={psychology:405,'behavioral-science':146,'organization-management':131,strategy:94,'practical-wisdom':79,'classics-thought':90};
assert.deepEqual(Object.fromEntries(categories.map(id=>[id,ordered.filter(t=>t.categoryId===id).length])),expected);
// Guard against re-running a dated release over later editorial/CMS changes.
const current=read('src/data/generated/theories.json');
const priorBuild=fs.existsSync(base+'-changes.json')?read(base+'-changes.json'):undefined;
assert.ok(JSON.stringify(current)===JSON.stringify(previous)||JSON.stringify(current)===JSON.stringify(ordered)||fingerprint(current)===priorBuild?.outputFingerprint,'Catalog changed since this release; review instead of overwriting.');
const scope=snapshot('src/data/content-scope.json');
scope.complete.theories=ordered.length;
const displayById=new Map([...mapTheoryDisplayIds(ordered)].map(([displayId,t])=>[t.tagId,displayId]));
scope.freeTheoryDisplayIds=scope.freeTheoryIds.map(id=>displayById.get(id));
const techniqueTree=snapshot('src/data/generated/techniques.json');
const techniques=techniqueTree.categories.flatMap(c=>c.subcategories.flatMap(s=>s.items));
const comprehensive=snapshot('src/data/generated/comprehensive-theory-links.json');
const techniqueChanges=[];
// Explicitly reviewed applied links, never automatic category-wide linking.
for(const [candidate,anchor,techniqueId]of [[149,'kb_709','master336-310'],[134,'kb_394','master336-056'],[145,'kb_547','master336-188'],[167,'kb_547','master336-189'],[175,'kb_573','master336-208']]){
  const t=byCandidate.get(String(candidate));
  const target=techniques.find(x=>x.id===techniqueId && (x.relatedTheoryIds??[]).includes(anchor));
  assert.ok(target,anchor);target.relatedTheoryIds=[...new Set([...target.relatedTheoryIds,t.tagId])];
  comprehensive[target.id]=[...new Set([...(comprehensive[target.id]??[]),t.tagId])];
  techniqueChanges.push({techniqueId:target.id,theoryId:t.tagId,anchor,reason:`既存の${byId.get(anchor).title}の説明に、${t.title}による具体的な実践・理解を補う。`});
}
for(const row of review.unrecorded){const t=byCandidate.get(row.A);row.decisions=String(row.E??'').split(';').filter(Boolean).map(term=>({term,decision:term.startsWith('?')?'defer':t?.aliases.some(a=>normalize(a)===normalize(term))?'alias-in-manifest':'defer',reason:term.startsWith('?')?'元台帳の疑義を維持。':'正式同義語は原稿の確認済み別名に限定。その他は未反映。'}));}
for(const row of review.additional){const t=added.find(t=>t.title===row.C);row.decisions=String(row.D??'').split(';').filter(Boolean).map(term=>({term,decision:t?.aliases.some(a=>normalize(a)===normalize(term))?'alias-in-manifest':'defer',reason:'正式同義語は採用原稿で確認した範囲。未採用概念・未確認の語は登録しない。'}));}
const artifacts={'src/data/generated/theories.json':ordered,'src/data/generated/theory-relations.json':relations,'src/data/generated/theory-search-keywords.json':keywordMap,'src/data/generated/techniques.json':techniqueTree,'src/data/generated/comprehensive-theory-links.json':comprehensive,'src/data/content-scope.json':scope};
for(const [file,value]of Object.entries(artifacts)){
  const current=fs.existsSync(file)?read(file):undefined;
  if(priorBuild?.artifactFingerprints?.[file])assert.ok(fingerprint(current)===priorBuild.artifactFingerprints[file]||fingerprint(current)===fingerprint(value)||fingerprint(current)===fingerprint(frozenSnapshot[file]),`Later editorial change: ${file}`);
}
for(const [file,value]of Object.entries(artifacts))write(file,value);
write(base+'-alias-review.json',review);
write(base+'-changes.json',{before:821,added:124,after:945,outputFingerprint:fingerprint(ordered),baselineCommit:baseline.commit,categories:expected,sections:sections.map(s=>({...s,before:previous.filter(t=>t.subcategoryId===s.id).length,after:ordered.filter(t=>t.subcategoryId===s.id).length})),additions:added.map(t=>({id:t.tagId,title:t.title,category:t.categoryTitle,section:t.subcategoryTitle})),aliasChanges,excluded,removals,keywords:keywordMap,relationChanges,techniqueChanges});
console.log(JSON.stringify({total:ordered.length,added:added.length,aliasChanges:aliasChanges.length,excluded:excluded.length,keywords:Object.values(keywordMap).flat().length,relations:relationChanges.length,techniqueLinks:techniqueChanges.length}));
const changes=read(base+'-changes.json');
changes.artifactFingerprints=Object.fromEntries(Object.entries(artifacts).map(([file,value])=>[file,fingerprint(value)]));
write(base+'-changes.json',changes);
