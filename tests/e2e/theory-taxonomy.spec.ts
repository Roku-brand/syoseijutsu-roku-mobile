import { test, expect } from '@playwright/test';
import fs from 'node:fs';
const rows=JSON.parse(fs.readFileSync('src/data/generated/theories.json','utf8'));
const subcategories=JSON.parse(fs.readFileSync('src/data/generated/theory-subcategories.json','utf8'));
const categories=[...new Map(rows.map((t:any)=>[t.categoryId,{kind:'theory',id:t.categoryId,title:t.categoryTitle,display_order:['psychology','behavioral-science','organization-management','strategy','practical-wisdom','classics-thought'].indexOf(t.categoryId)+1}])).values()];
async function mockOwner(page:any){
 const user={id:'00000000-0000-4000-8000-000000000003',aud:'authenticated',role:'authenticated',email:'taxonomy@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
 const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:4102444800})).toString('base64url')+'.test';
 const project=new URL(process.env.EXPO_PUBLIC_SUPABASE_URL??'https://example.supabase.co').hostname.split('.')[0];
 await page.addInitScript(({user,token,key}:any)=>localStorage.setItem(key,JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user})),{user,token,key:`sb-${project}-auth-token`});
 await page.route('**/auth/v1/**',(route:any)=>route.fulfill({json:user}));
 await page.route('**/rest/v1/**',(route:any)=>{
  const url=route.request().url();
  if(url.includes('/profiles'))return route.fulfill({json:{role:'owner',display_name:'検証利用者'}});
  if(url.includes('/theory_subcategories'))return route.fulfill({json:subcategories.map((s:any)=>({id:s.id,title:s.title,category_id:s.categoryId,display_order:s.displayOrder}))});
  if(url.includes('/content_categories'))return route.fulfill({json:categories});
  if(url.includes('/theories')||url.includes('/public_theories')){const u=new URL(url),offset=Number(u.searchParams.get('offset')??0),limit=Number(u.searchParams.get('limit')??1000);return route.fulfill({json:rows.slice(offset,offset+limit).map((t:any)=>({id:t.tagId,title:t.title,summary:t.summary,category_id:t.categoryId,category_title:t.categoryTitle,subcategory_id:t.subcategoryId,subcategory_title:t.subcategoryTitle,taxonomy_order:t.sortOrder,canonical_id:t.tagId,legacy_ids:t.legacyIds,display_id:t.displayId,display_order:t.displayId,status:'published',provenance:t.provenance,access_tier:t.accessTier,aliases:t.aliases,related_theory_ids:t.relatedTheoryIds,updated_at:'2026-10-04T00:00:00Z'}))});}
  return route.fulfill({json:[]});
 });
 await page.route('**/functions/v1/**',(route:any)=>{
  const url=route.request().url();if(url.includes('/access'))return route.fulfill({json:{access:'active',accessType:'thirty_day',accessExpiresAt:'2099-01-01T00:00:00Z'}});
  return route.fulfill({json:{items:new URL(url).searchParams.get('type')==='theory'?rows.filter((t:any)=>t.accessTier==='complete').map((t:any)=>({content_type:'theory',content_id:t.tagId,payload:t})):[]}});
 });
}
test('大分類と内部分類の見出しで一覧を表示し、モバイルでも横にはみ出さない',async({page})=>{
 await page.route('**/rest/v1/**',route=>route.fulfill({status:503,json:{message:'offline fallback'}}));
 await page.goto('/theories?category=behavioral-science&page=1');
 await expect(page.getByTestId('theory-index-list').getByRole('heading',{name:'行動科学',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'意思決定・選択',exact:true})).toBeVisible();
 await expect(page.getByRole('heading',{name:'習慣・行動設計',exact:true})).toBeVisible();
 await expect(page.getByTestId('theory-index-row-card')).toHaveCount(rows.filter((t:any)=>t.categoryId==='behavioral-science').length);
 await expect(page.getByTestId('theory-index-pagination')).toHaveCount(0);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
 await expect(page.locator('#roku-launch')).toBeHidden();
 await page.screenshot({path:test.info().outputPath('theory-taxonomy-mobile.png')});
});
test('別名を全件検索し、旧ディープリンクを同じ正本へ解決する',async({page})=>{
 await mockOwner(page);
 await page.goto('/search?mode=theories&q=能動的・建設的反応');
 await expect(page.getByText('アクティブ・コンストラクティブ・レスポンディング',{exact:true})).toBeVisible();
 await expect(page.getByText('心理学 > 人間関係・コミュニケーション',{exact:true})).toBeVisible();
 await page.goto('/theory/kb_418');
 await expect(page.getByTestId('theory-title')).toContainText('アクティブ・コンストラクティブ・レスポンディング');
 await page.goto('/theory/kb_001');await expect(page.getByTestId('theory-title')).toHaveText('初頭効果');
 await page.goto('/theory/kb_002');await expect(page.getByTestId('theory-title')).toHaveText('親近効果');
});
test('保存した旧IDを復元し、同義語の重複保存を解消する',async({page})=>{
 await page.route('**/rest/v1/**',route=>route.fulfill({status:503,json:{message:'offline fallback'}}));
 await page.addInitScript(()=>localStorage.setItem('@shoseijutsu-roku/state/v1',JSON.stringify({savedTheoryIds:['kb_392','kb_016','kb_001','kb_002'],savedIds:[],historyIds:[]})));
 await page.goto('/theories');
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('@shoseijutsu-roku/state/v1')??'{}').savedTheoryIds)).toEqual(['kb_016','kb_001','kb_002']);
});
test('CMSが内部分類で絞り込み、選択・順番・分類管理を編集できる',async({page})=>{
 await page.setViewportSize({width:1440,height:1000});await mockOwner(page);
 await page.goto('/owner/content?kind=theory');
 await expect(page.getByText(`${rows.length}件`,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'意思決定・選択',exact:true}).first().click();
 await expect(page.getByText(`${rows.filter((t:any)=>t.subcategoryId==='behavioral-science-d').length}件`,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'プロスペクト理論',exact:true}).first().click();
 await expect(page.getByRole('textbox',{name:'理論名',exact:true})).toHaveValue('プロスペクト理論');
 await expect(page.getByRole('textbox',{name:'内部分類内の並び順',exact:true})).toHaveValue(String(rows.find((t:any)=>t.title==='プロスペクト理論').sortOrder));
 await expect(page.getByRole('button',{name:'内部分類：意思決定・選択',exact:true})).toHaveAttribute('aria-pressed','true');
 await page.getByRole('button',{name:'内部分類を管理',exact:true}).nth(1).click();
 await page.getByRole('button',{name:'＋ 内部分類',exact:true}).click();
 await expect(page.getByRole('textbox',{name:'内部分類名',exact:true})).toBeVisible();
 await expect(page.locator('#roku-launch')).toBeHidden();
 await page.screenshot({path:test.info().outputPath('theory-taxonomy-cms.png'),fullPage:true});
});

test('追加した完全版理論を別名から検索して、本文・出典・自己理解の分類を表示する',async({page})=>{
 await mockOwner(page);
 for(const [alias,title,id] of [['Proteus effect','プロテウス効果','kb_869'],['CBT','認知行動療法','kb_901'],['SWOT','SWOT分析','kb_908']]) {
  await page.goto(`/search?mode=theories&q=${encodeURIComponent(alias)}`);
  await expect(page.getByText(title,{exact:true})).toBeVisible();
  await page.goto(`/theory/${id}`);
  await expect(page.getByTestId('theory-title')).toHaveText(title);
  await expect(page.getByText(rows.find((t:any)=>t.tagId===id).summary.split('。')[0]+'。',{exact:false}).first()).toBeVisible();
  await expect(page.getByText('出典を読む',{exact:true})).toBeVisible();
 }
 await page.goto('/theories?category=psychology&page=7');
 await expect(page.getByRole('heading',{name:'自己理解・成長',exact:true})).toBeVisible();
 await expect(page.getByTestId('theory-index-pagination')).toHaveCount(0);
 await expect(page.getByText('ピアジェの認知発達理論',{exact:true})).toBeVisible();
});
