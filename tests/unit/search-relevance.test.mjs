import './register-data.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {performance} from 'node:perf_hooks';

const engine = await import('../../src/data/search-ranking.ts');
const {getTechniqueTags} = await import('../../src/data/technique-tags.ts');
const catalog = await import('../../src/data/catalog.ts');
const search = await import('../../src/data/search-catalog.ts');
const full = JSON.parse(fs.readFileSync('src/data/generated/techniques.json','utf8'));
const theories = JSON.parse(fs.readFileSync('src/data/generated/theories.json','utf8'));
const cards = full.categories.flatMap(c=>c.subcategories.flatMap(p=>p.items.map(t=>({...t,categoryKey:c.key,categoryName:c.name,subcategory:p.name,articleTitle:p.name}))));
const review = JSON.parse(fs.readFileSync('docs/content/search-tags-review-20261016.json','utf8'));

test('all published technique IDs have a reviewed concise tag set; explicit owner tags take priority',()=>{
  assert.equal(review.techniques.length,356);
  assert.equal(new Set(review.techniques.map(t=>t.id)).size,356);
  for(const row of review.techniques){assert.ok(cards.some(c=>c.id===row.id));assert.equal(new Set(row.tags).size,row.tags.length);assert.ok(row.tags.length>=3&&row.tags.length<=6);}
  assert.deepEqual(getTechniqueTags({...cards[0],tags:['独自タグ','独自タグ','  編集済み ']}),['独自タグ','編集済み']);
  assert.deepEqual(getTechniqueTags({...cards[0],tags:[]}),[]);
  assert.ok(!getTechniqueTags({...cards[0],title:'静かに待つ',essence:'判断の前に間を置く',subtitle:'',tags:undefined,explanation:'この段落には交渉と恋愛という単語がある。'}).includes('交渉'));
});

test('normalization preserves names and IDs and supports width, kana and English variants',()=>{
  assert.equal(engine.normalizeSearchText(' Ｐ－００１　'),'p-001');
  assert.deepEqual(engine.prepareSearchQuery('ざいあんす効果').map(t=>t.text),['単純接触効果']);
  assert.deepEqual(engine.prepareSearchQuery('MERE-EXPOSURE EFFECT').map(t=>t.text),['単純接触効果']);
  assert.deepEqual(engine.prepareSearchQuery('ストレスを減らす方法').map(t=>t.text),['すとれす']);
  assert.deepEqual(engine.prepareSearchQuery('仕事　先延ばし').map(t=>t.text),['仕事','先延ばし']);
  assert.deepEqual(engine.prepareSearchQuery('交渉 未知の検証語').map(t=>t.text),['交渉','未知の検証語']);
  assert.deepEqual(engine.prepareSearchQuery('   '),[]);
});

test('ranking favors the actual topic and never widens to unrelated umbrella concepts',()=>{
  const docs=[
    {title:'交渉',tags:[]},
    {title:'代替案を持つ',tags:['交渉']},
    {title:'契約の準備',summary:'交渉に備えて条件を整理する'},
    {title:'聞き上手になる',body:'会話は楽しい。交渉ではどうだろう。'},
    {title:'自然な沈黙',tags:['会話','沈黙']},
  ];
  assert.deepEqual(engine.rankSearchItems(docs,d=>d,'交渉').map(d=>d.title),['交渉','代替案を持つ','契約の準備']);
  assert.equal(engine.scoreSearchDocument({title:'仕事の進め方'},'転職'),0);
  assert.equal(engine.scoreSearchDocument({title:'集団の特徴'},'リーダーシップ'),0);
  assert.equal(engine.scoreSearchDocument({title:'人間関係の管理'},'友達'),0);
  assert.equal(engine.scoreSearchDocument({title:'今日から行動する'},'習慣'),0);
  assert.equal(engine.scoreSearchDocument({title:'資料を運ぶ',body:'運用と運営について。'},'運'),0);
  assert.ok(engine.scoreSearchDocument({title:'運がいい人'},'運')>0);
  assert.equal(engine.scoreSearchDocument({title:'start'},'art'),0);
  assert.equal(engine.scoreSearchDocument({title:'交渉'},'交渉 未知の検証語'),0);
});

test('feature bodies remain searchable while unrelated distant fragments and link URLs are excluded',()=>{
  assert.ok(engine.scoreSearchDocument({title:'ある特集',body:'本文だけの検証語です。'},'本文だけの検証語')>0);
  assert.equal(engine.scoreSearchDocument({title:'ある特集',body:'青空。'+'無関係な段落。'.repeat(50)+'月明かり。'},'青空 月明かり'),0);
  assert.ok(engine.scoreSearchDocument({title:'ある特集',body:'青空と月明かりの違い。'},'青空 月明かり')>0);
  assert.equal(engine.scoreSearchDocument({title:'ある特集',body:'[資料](https://example.test/negotiation)'},'negotiation'),0);
});

test('free search excludes complete-edition technique bodies and unpublished features',()=>{
  const free=search.getSearchResults('清潔感',false);
  assert.ok(free.techniqueMatches.some(t=>t.id==='master336-001'));
  assert.ok(search.getSearchResults('最適化の罠',false).theoryMatches.some(t=>t.tagId==='kb_568'));
  for(const query of ['第一印象','挫折','単純接触効果','交渉','先延ばし','最適化の罠']){
    const results=search.getSearchResults(query,false);
    assert.ok(results.techniqueMatches.length+results.theoryMatches.length>0,query);
  }
  assert.ok(search.getSearchResults('挫折',false).theoryMatches.some(t=>t.title==='レジリエンス理論'));
  const smallTalk=search.getSearchResults('雑談',false);
  assert.ok(smallTalk.techniqueMatches.length+smallTalk.theoryMatches.length>0);
  assert.equal(engine.scoreSearchDocument({title:'一般的な関係論'},'挫折'),0);
  const feature={id:'published',title:'交渉',lead:'条件の調整',body:'',display_order:0,status:'published'};
  assert.deepEqual(search.getFeatureSearchResults([feature,{...feature,id:'draft',status:'draft'}],'交渉').map(t=>t.id),['published']);
});

test('complete catalogue finds the requested six topics, natural wording and exact theory aliases',()=>{
  catalog.hydratePaidCatalog(cards,theories);
  const ids=q=>search.getSearchResults(q,true).techniqueMatches.map(t=>t.id);
  for(const [query,id] of [['第一印象','001'],['挫折','311'],['交渉','222'],['先延ばし','193'],['最適化の罠','200'],['単純接触効果','060']])assert.ok(ids(query).includes('master336-'+id),query);
  assert.ok(!ids('交渉').includes('master336-027'));
  assert.ok(!ids('先延ばし').includes('master336-008'));
  assert.ok(!ids('友達').includes('master336-222'));
  assert.ok(!ids('転職').includes('master336-112'));
  assert.deepEqual(ids('初対面の印象'),ids('第一印象'));
  assert.deepEqual(ids('先延ばしをやめたい'),ids('先延ばし'));
  assert.ok(ids('仕事 先延ばし').includes('master336-193'));
  for(const [query,id] of [['ザイアンス効果','kb_004'],['mere-exposure effect','kb_004'],['最適化のわな','kb_568'],['神経可塑性',theories.find(t=>t.title==='脳の可塑性').tagId]])assert.equal(search.getSearchResults(query,true).theoryMatches[0]?.tagId,id,query);
  assert.equal(search.getSearchResults('kb_004',true).theoryMatches[0]?.tagId,'kb_004');
  const batch=['第一印象','挫折','単純接触効果','交渉','先延ばし','最適化の罠','人の目が気になる','断れない','ストレスを減らす方法','仕事 先延ばし'];
  const start=performance.now();for(const query of batch)search.getSearchResults(query,true);
  console.log(`Search benchmark (${cards.length} techniques / ${theories.length} theories): ${((performance.now()-start)/batch.length).toFixed(1)}ms/query.`);
});

test('every theory title remains directly searchable and ranks ahead of explanatory mentions',()=>{
  const documents=theories.map(t=>({title:t.title,aliases:t.aliases,summary:t.summary}));
  for(const title of new Set(theories.map(t=>t.title)))assert.equal(engine.rankSearchItems(documents,d=>d,title)[0]?.title,title,title);
});
