import {test,expect,type Page} from '@playwright/test';
import fs from 'node:fs';
const read=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const review=read('docs/content/content-network-review-20261016.json');
const articles=read('tests/fixtures/content-network-features.json').map((f:any)=>{const r=review.features.find((r:any)=>r.id===f.id);return{...f,related_technique_ids:r.techniqueIds,related_theory_ids:r.theoryIds,related_feature_ids:r.featureIds};});
const theories=read('src/data/generated/theories.json');
const categories=read('src/data/generated/techniques.json').categories;
const techniques=categories.flatMap((c:any)=>c.subcategories.flatMap((p:any)=>p.items.map((t:any)=>({...t,categoryKey:c.key,categoryName:c.name,subcategory:p.name,articleTitle:p.name}))));
const lockedTechniqueIds = new Set<string>(read('src/data/generated/techniques.public.json').categories.flatMap(
  (category: { subcategories: { items: { id: string; status?: string }[] }[] }) =>
    category.subcategories.flatMap(group => group.items.filter(item => item.status === 'locked').map(item => item.id)),
));
const freeLearningIds = new Set<string>(read('src/data/generated/learning.public.json').map((item: { id: string }) => item.id));
const paidLearning = read('src/data/generated/learning.full.json').filter((item: { id: string }) => !freeLearningIds.has(item.id));
async function mock(page:Page,paid=false,items=articles){
 const metadata:string[]=[];
 if(paid){
  const user={id:'00000000-0000-4000-8000-000000000003',aud:'authenticated',role:'authenticated',email:'network@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const token='eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:4102444800})).toString('base64url')+'.test';
  const project=new URL(process.env.EXPO_PUBLIC_SUPABASE_URL??'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({user,token,key})=>localStorage.setItem(key,JSON.stringify({access_token:token,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user})),{user,token,key:`sb-${project}-auth-token`});
  await page.route('**/auth/v1/**',r=>r.fulfill({json:user}));
 }
 await page.route('**/functions/v1/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname.endsWith('/access'))return r.fulfill({json:{access:'active',accessType:'thirty_day',accessExpiresAt:'2099-01-01T00:00:00Z'}});
  if (!paid) return r.fulfill({ status: 403, json: { message: 'Complete edition required' } });
  const type = u.searchParams.get('type');
  const rows = type === 'theory' ? theories.filter((item: { accessTier?: string }) => item.accessTier === 'complete')
    : type === 'technique' ? techniques.filter((item: { id: string }) => lockedTechniqueIds.has(item.id))
    : type === 'learning' ? paidLearning : [];
  return r.fulfill({ json: { items: rows.map((item: { id?: string; tagId?: string }) => ({ content_type: type, content_id: item.tagId ?? item.id, payload: item })) } });
 });
 await page.route('**/rest/v1/**',r=>{
  const u=new URL(r.request().url());
  if(u.pathname.endsWith('/profiles'))return r.fulfill({json:{role:'user',display_name:'検証利用者'}});
  if(u.pathname.endsWith('/feature_articles')){
   const select=u.searchParams.get('select')??'*';if(select!=='*')metadata.push(select);
   return r.fulfill({json:items.filter((f:any)=>f.status==='published')});
  }
  return r.fulfill({status:503,json:{message:'bundled fallback'}});
 });
 return metadata;
}

for(const width of [320,390,1440])test(`処世術・特集・理論を相互にたどれ、本文の追加取得を伴わない（${width}px）`,async({page})=>{
 await page.setViewportSize({width,height:1000});const metadata=await mock(page);
 await page.goto('/card/master336-004');
 await page.getByRole('tab',{name:'関連知識'}).click();
 const related=page.getByTestId('related-features');await expect(related.getByRole('link',{name:/押さえておくべき5つ/})).toBeVisible();
 await related.scrollIntoViewIfNeeded();await page.screenshot({path:test.info().outputPath(`technique-to-feature-${width}.png`)});
 await related.getByRole('link',{name:/押さえておくべき5つ/}).click();
 await expect(page.getByTestId('feature-body')).toBeVisible();
 await page.getByRole('link',{name:/心理的安全性/}).click();
 await expect(page.getByTestId('theory-title')).toHaveText('心理的安全性');
 await expect(page.getByTestId('related-features').getByRole('link',{name:/押さえておくべき5つ/})).toBeVisible();
 expect(metadata).toHaveLength(1);expect(metadata[0]).not.toMatch(/\*|body|lead|source_references/);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
});

test('年齢の特集と社会的時計の接続は完全版でも往復できる',async({page})=>{
 await mock(page,true);await page.goto('/theory/kb_909');await expect(page.getByTestId('theory-title')).toHaveText('社会的時計');
 await page.getByTestId('related-features').getByRole('link',{name:/なぜ私たちは、年齢に焦るのか/}).click();
 await expect(page.getByTestId('feature-body')).toContainText('社会的時計');
 await page.getByRole('link',{name:/社会的時計/}).click();
 await expect(page.getByTestId('theory-title').filter({visible:true})).toHaveCount(1);
 await expect(page.getByTestId('theory-title').filter({visible:true})).toHaveText('社会的時計');
});

test('完全版の関連知識は定義の一文を表示し、完全版理論へ遷移できる', async ({ page }) => {
  await mock(page, true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/card/master336-009');
  await page.getByRole('tab', { name: '関連知識' }).click();
  const primary = page.getByTestId('primary-theories');
  await expect(primary).toContainText('自分のことを適度に話すと、相手も自分のことを話しやすくなること。');
  await expect(primary).not.toContainText('最近困っていることを少し話すと');
  const method = page.getByTestId('supplementary-theories').getByRole('link', { name: 'アクティブリスニングを開く' });
  await expect(method).toHaveAttribute('href', '/theory/kb_412');
  await expect(method).toHaveText('01アクティブリスニング相づちや要約、質問を使い、相手の話を確かめながら聴く方法。›');
  const techniques = page.getByTestId('related-techniques');
  const techniqueRows = techniques.getByRole('link');
  await expect(techniqueRows).toHaveCount(4);
  await expect(page.getByRole('heading', { name: '関連する処世術' }).locator('..').getByText('全 4 件', { exact: true })).toBeVisible();
  await expect(page.getByText('あわせて身につけたい実践知')).toBeVisible();
  for (const [index, row] of (await techniqueRows.all()).entries()) {
    const label = (await row.getAttribute('aria-label'))!;
    const title = label.replace(/を開く$/, '');
    const number = String(index + 1).padStart(2, '0');
    await expect(row).toHaveText(`${number}${title}›`);
  }
  await page.screenshot({ path: test.info().outputPath('related-knowledge-complete-390.png') });
  await method.click();
  await expect(page.getByTestId('theory-title').filter({ visible: true })).toHaveText('アクティブリスニング', { timeout: 15_000 });
});

test('理論詳細の関連知識には相手の定義を表示し、関係の読み方を表示しない', async ({ page }) => {
  await mock(page, true);
  const rationale = '注意の捕捉とカクテルパーティー効果は説明対象・手法を区別しながら読める。';
  await page.route('**/rest/v1/theory_relations?**', route => route.fulfill({ json: [{
    source_id: 'kb_968', target_id: 'kb_017', relation_type: 'related', review_status: 'confirmed', rationale, priority: 0,
  }] }));
  await page.goto('/theory/kb_968');
  await expect(page.getByTestId('theory-title').filter({ visible: true })).toHaveText('注意の捕捉');
  const definition = '騒がしい中でも、自分の名前など関心のある情報に気づけること。';
  const row = page.getByTestId('theory-related-theories').getByRole('link', { name: 'カクテルパーティー効果を開く' });
  await expect(row).toHaveAttribute('href', '/theory/kb_017');
  await expect(row).toHaveText(`01カクテルパーティー効果${definition}›`);
  await page.getByRole('button', { name: '知識のつながりを見る' }).click();
  await page.getByRole('button', { name: '関連知識を選択：カクテルパーティー効果' }).click();
  const selection = page.getByTestId('knowledge-graph-selection');
  await expect(selection).toContainText(definition);
  await expect(selection).not.toContainText(/区別しながら読める|複数の会話がある場/);
});

test('未指定の特集を関連として補充せず、完全版の本文も無料ページへ出さない',async({page})=>{
 const items=articles.map((f:any)=>({...f,related_feature_ids:[]}));await mock(page,false,items);
 await page.goto('/features/five-guidelines');await expect(page.getByTestId('feature-body')).toBeVisible();
 await expect(page.getByRole('heading',{name:'あわせて読みたい',exact:true})).toHaveCount(0);
 await page.goto('/theory/kb_909');await expect(page.getByTestId('theory-title')).toHaveCount(0);await expect(page.getByTestId('related-features')).toHaveCount(0);
 await expect(page.getByText(theories.find((t:any)=>t.tagId==='kb_909').summary,{exact:true})).toHaveCount(0);
});

