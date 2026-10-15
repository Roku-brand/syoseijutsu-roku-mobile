import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const rows=read('src/data/generated/theories.json');
const retired=read('docs/content/retired-original-maxims-20261015.json');
const audits=read('docs/content/historical-maxims-audit-20261015.json');
const relations=read('src/data/generated/theory-relations.json');
const subs=read('src/data/generated/theory-subcategories.json');
const quote=rows.find((t:any)=>t.quotation && t.tagId!=='kb_595');
async function account(page:Page,owner=false){
 const user={id:'00000000-0000-4000-8000-000000000003',aud:'authenticated',role:'authenticated',email:'network@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:4102444800})).toString('base64url')+'.test';
 const project=new URL(process.env.EXPO_PUBLIC_SUPABASE_URL??'https://example.supabase.co').hostname.split('.')[0];
 await page.addInitScript(({user,token,key})=>localStorage.setItem(key,JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user})),{user,token,key:`sb-${project}-auth-token`});
 await page.route('**/auth/v1/**',r=>r.fulfill({json:user}));
 await page.route('**/rest/v1/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname.endsWith('/profiles'))return r.fulfill({json:{role:owner?'owner':'user',display_name:'検証利用者'}});
  if(u.pathname.endsWith('/theory_relations')){
   const filter=u.searchParams.get('or');
   return r.fulfill({json:relations.filter((x:any)=>!filter||filter.includes(x.sourceId)||filter.includes(x.targetId)).map((x:any)=>({source_id:x.sourceId,target_id:x.targetId,relation_type:x.type,review_status:x.reviewStatus,rationale:x.rationale,priority:x.priority}))});
  }
  if(owner && u.pathname.endsWith('/theory_quote_reviews'))return r.fulfill({json:audits.map((a:any)=>({audit:a}))});
  if(owner && u.pathname.endsWith('/theory_subcategories'))return r.fulfill({json:subs.map((s:any)=>({id:s.id,title:s.title,category_id:s.categoryId,display_order:s.displayOrder}))});
  if(owner && u.pathname.endsWith('/content_categories'))return r.fulfill({json:[...new Map(rows.map((t:any)=>[t.categoryId,{kind:'theory',id:t.categoryId,title:t.categoryTitle,display_order:1}])).values()]});
  if(owner && u.pathname.endsWith('/theories'))return r.fulfill({json:rows.map((t:any)=>({id:t.tagId,title:t.title,summary:t.summary,knowledge_type:t.knowledgeType,quotation:t.quotation,category_id:t.categoryId,category_title:t.categoryTitle,subcategory_id:t.subcategoryId,taxonomy_order:t.sortOrder,display_id:t.displayId,display_order:t.displayId,canonical_id:t.tagId,legacy_ids:t.legacyIds,access_tier:t.accessTier,provenance:t.provenance,aliases:t.aliases,related_theory_ids:t.relatedTheoryIds,status:'published',updated_at:'2026-10-15T12:56:07Z'}))});
  return owner ? r.fulfill({json:[]}) : r.fulfill({status:503,json:{message:'bundled fallback'}});
 });
 await page.route('**/functions/v1/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname.endsWith('/access'))return r.fulfill({json:{access:'active',accessType:'thirty_day',accessExpiresAt:'2099-01-01T00:00:00Z'}});
  return r.fulfill({json:{items:u.searchParams.get('type')==='theory'?rows.filter((t:any)=>t.accessTier==='complete').map((t:any)=>({content_type:'theory',content_id:t.tagId,payload:t})):[]}});
 });
}
test('実践知は43件、削除した39件の言葉は公開一覧に出ない',async({page})=>{
 await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
 await page.goto('/theories?category=practical-wisdom');
 await expect(page.getByTestId('theory-index-row-card')).toHaveCount(43);
 for(const t of retired)await expect(page.getByText(t.title,{exact:true})).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('practical-wisdom-retained.png'),fullPage:true});
});
test('公開終了URLは本文を再表示せず、保存IDは保持する',async({page})=>{
 const id=retired[0].id??retired[0].tagId;
 await page.addInitScript(id=>localStorage.setItem('@shoseijutsu-roku/state/v1',JSON.stringify({savedTheoryIds:[id],historyIds:[id],savedIds:[]})),id);
 await page.goto('/theory/'+id);
 await expect(page.getByText('公開を終了した知識',{exact:true})).toBeVisible();
 await expect(page.getByText(retired[0].title,{exact:true})).toHaveCount(0);
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('@shoseijutsu-roku/state/v1')!).savedTheoryIds)).toContain(id);
});
test('有料格言は無料のHTML・ページに原文や訳文を含めない',async({page,request})=>{
 const response=await request.get('/theory/'+quote.tagId);const html=await response.text();
 expect(html).not.toContain(quote.quotation.translationText);expect(html).not.toContain(quote.quotation.originalText);
 await page.goto('/theory/'+quote.tagId);
 await expect(page.getByTestId('theory-title')).toHaveCount(0);
 await expect(page.getByText(quote.quotation.translationText,{exact:false})).toHaveCount(0);
});
test('完全版では格言・人物・作品が先に表示され背景は短く保たれる',async({page})=>{
 await account(page);await page.goto('/theory/'+quote.tagId);
 await expect(page.getByTestId('theory-title')).toHaveText('「'+quote.quotation.translationText+'」');
 await expect(page.getByTestId('quotation-attribution')).toContainText(quote.quotation.author);
 await expect(page.getByTestId('quotation-attribution')).toContainText(quote.quotation.work);
 await expect(page.getByTestId('theory-summary')).toContainText(quote.quotation.contextNote.split('。')[0]);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:test.info().outputPath('historical-quotation-mobile.png'),fullPage:true});
});
for(const width of [320,390,1440])test(`関係図は${width}pxで重ならず選択から詳細へ移動できる`,async({page})=>{
 await page.setViewportSize({width,height:900});await account(page);await page.goto('/theory/kb_133');
 await page.getByRole('button',{name:'知識のつながりを見る',exact:true}).click();
 const graph=page.getByTestId('knowledge-graph');await expect(graph).toBeVisible();
 const nodes=graph.getByRole('button');expect(await nodes.count()).toBeGreaterThan(0);expect(await nodes.count()).toBeLessThanOrEqual(6);
 const boxes=await nodes.evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height};}));
 const centre=await page.getByTestId('knowledge-graph-current').boundingBox();expect(centre).not.toBeNull();
 boxes.push({x:centre!.x,y:centre!.y,w:centre!.width,h:centre!.height});
 for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++)expect(boxes[i].x+boxes[i].w<=boxes[j].x||boxes[j].x+boxes[j].w<=boxes[i].x||boxes[i].y+boxes[i].h<=boxes[j].y||boxes[j].y+boxes[j].h<=boxes[i].y).toBeTruthy();
 await nodes.first().click();await expect(page.getByTestId('knowledge-graph-selection')).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.screenshot({path:test.info().outputPath(`knowledge-network-${width}.png`),animations:'disabled'});
 await page.getByRole('button',{name:'この知識を読む',exact:true}).click();await expect(page).not.toHaveURL(/kb_133$/);
});
test('CMSで原典と権利の編集・50件監査を表示し未確認公開を拒否する',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await account(page,true);
 await page.goto('/owner/content?kind=theory');
 await page.getByRole('textbox',{name:'タイトル・本文で検索',exact:true}).fill(quote.title);
 await page.getByRole('button',{name:quote.title,exact:true}).first().click();
 await page.getByRole('button',{name:'補足メモ',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'原文',exact:true})).toHaveValue(quote.quotation.originalText);
 await page.getByRole('textbox',{name:'原文',exact:true}).scrollIntoViewIfNeeded();
 await page.screenshot({path:test.info().outputPath('cms-quotation-editor.png'),animations:'disabled'});
 await page.getByRole('button',{name:'権利：保留',exact:true}).click();
 await page.getByRole('button',{name:'公開する',exact:true}).click();
 await expect(page.getByText('原典と権利の確認が済むまで格言は公開できません。',{exact:false})).toBeVisible();
 await page.getByRole('button',{name:'今回の格言候補50件の監査を見る',exact:true}).click();
 await page.getByRole('textbox',{name:'格言候補の監査を検索',exact:true}).fill('13');
 await expect(page.getByText('候補13 · 太宰治 · 採用保留',{exact:true})).toBeVisible();
 await page.getByText('候補13 · 太宰治 · 採用保留',{exact:true}).scrollIntoViewIfNeeded();
 await expect(page.getByRole('button',{name:'＋ 内部分類',exact:true})).toHaveCount(0);
 await page.screenshot({path:test.info().outputPath('cms-rights-and-candidates.png'),fullPage:true});
});
