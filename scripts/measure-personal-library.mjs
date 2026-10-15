import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
const label=process.argv[2]??'after';
const base='http://127.0.0.1:4195';
const categories=JSON.parse(await readFile('src/data/generated/techniques.public.json','utf8')).categories;
const techniques=categories.flatMap(c=>c.subcategories.flatMap(s=>s.items));
const theories=JSON.parse(await readFile('src/data/generated/theories.public.json','utf8'));
const manifest=JSON.parse(await readFile('content/features/manifest.json','utf8'));
const articles=await Promise.all(manifest.map(async row=>({...row,body:await readFile(`content/features/${row.slug}.md`,'utf8'),lead:'検証用の記事概要',status:'published',related_technique_ids:[],related_theory_ids:[],related_feature_ids:[],source_references:[]})));
const state={savedIds:techniques.slice(0,100).map(c=>c.id),savedTheoryIds:theories.slice(0,100).map(c=>c.tagId),savedFeatureIds:articles.map(a=>a.id),historyIds:[...techniques.slice(0,50).map(c=>c.id),...theories.slice(0,50).map(c=>c.tagId)],featureHistoryIds:articles.map(a=>a.id),personalMemos:Array.from({length:300},(_,i)=>({id:`memo-${i}`,text:`自分の知恵 ${i+1}`,folderId:i%2?'work':null,createdAt:'2026-10-15T00:00:00Z'})),personalMemoFolders:[{id:'work',name:'仕事の言葉',createdAt:'2026-10-15T00:00:00Z'}],libraryFolders:[{id:'work',name:'仕事で使う知恵',createdAt:'2026-10-15T00:00:00Z'}],libraryFolderByItem:{}};
const browser=await chromium.launch(); const results=[];
try{for(let run=0;run<3;run++){
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'});const page=await context.newPage();let calls=0;
await page.addInitScript(()=>{
 window.__tabPaints=[];
 document.addEventListener('click',event=>{
  if(!event.target.closest('[role="tab"]')) return;
  const start=performance.now();
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.__tabPaints.push(performance.now()-start)));
 },true);
});
await page.addInitScript(state=>{localStorage.setItem('@shoseijutsu-roku/installation-welcome/v1','done');localStorage.setItem('@shoseijutsu-roku/state/v1',JSON.stringify(state));},state);
await page.route('**/rest/v1/**',route=>{if(route.request().url().includes('/feature_articles')){calls++;return route.fulfill({json:articles});}return route.fulfill({status:503,json:{}});});
await page.route('**/functions/v1/**',r=>r.fulfill({status:503,json:{}}));
const cdp=await context.newCDPSession(page);await cdp.send('Performance.enable');
const snapshot=async name=>{await page.waitForTimeout(250);const perf=await cdp.send('Performance.getMetrics');const metric=Object.fromEntries(perf.metrics.map(x=>[x.name,x.value]));const resources=await page.evaluate(()=>performance.getEntriesByType('resource').map(x=>({name:x.name,bytes:x.encodedBodySize,transfer:x.transferSize,type:x.initiatorType})));return {name,run,dom:await page.locator('*').count(),heapMiB:metric.JSHeapUsedSize/1048576,taskMs:metric.TaskDuration*1000,images:resources.filter(x=>/\.(webp|png)(\?|$)/.test(x.name)).map(x=>({name:new URL(x.name).pathname,bytes:x.bytes})),featureRequests:calls,tabPaintMs:await page.evaluate(()=>window.__tabPaints)};};
await page.goto(base+'/discover');await expect(page.getByTestId('discover-categories')).toBeVisible();await expect(page.locator('#roku-launch')).toBeHidden();await page.waitForFunction(()=>Array.from(document.images).every(i=>i.complete));results.push(await snapshot('discover'));
await page.goto(base+'/my-os');await expect(page.getByTestId('my-page-dashboard')).toBeVisible();await expect(page.locator('#roku-launch')).toBeHidden();results.push(await snapshot('history'));
await page.getByRole('tab',{name:'蔵書',exact:true}).click();results.push(await snapshot('library'));
await page.getByRole('tab',{name:'マイ処世術',exact:true}).click();results.push(await snapshot('mine'));
const before=calls;for(let i=0;i<5;i++){for(const name of ['閲覧履歴','蔵書','マイ処世術']){await page.getByRole('tab',{name,exact:true}).click();}}
results.push({...await snapshot('five-tab-cycles'),additionalFeatureRequests:calls-before});await context.close();
}}finally{await browser.close();}
const files=await import('node:fs/promises');const jsFiles=(await files.readdir('dist/_expo/static/js/web')).filter(f=>f.endsWith('.js'));const bundles=await Promise.all(jsFiles.map(async file=>{const b=await readFile('dist/_expo/static/js/web/'+file);return {bytes:b.length,gzip:gzipSync(b).length};}));
await mkdir('docs/reports/personal-library-20261015',{recursive:true});await writeFile(`docs/reports/personal-library-20261015/${label}.json`,JSON.stringify({label,cache:'HTTP cache disabled by API fixture; conservative cold image payloads',fixture:{saved:204,history:100,memos:300},bundles,results},null,2));console.log(label+' benchmark complete');
