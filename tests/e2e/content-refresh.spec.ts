import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

async function advanceToRevisionCheck(page: Page) {
  const response = page.waitForResponse(row => row.url().includes('/rest/v1/content_revision'));
  await page.clock.fastForward(10*60*1000);
  await (await response).finished();
  // Let the client's response microtasks settle before jumping ten more
  // minutes; otherwise the fake clock can abort a still-arriving response.
  await page.evaluate(() => Promise.resolve());
}

async function mockCatalog(page: Page, complete = false) {
  let revision = 1;
  let offline = false;
  let revisionOffline = false;
  let publicAttempts = 0;
  let secureReads = 0;
  let publicReads = 0;
  let revisionReads = 0;
  const technique = () => ({ id:'master336-001', persona_id:'印象がいい人', category:'interpersonal', title:`更新タイトル${revision}`, essence:`更新原理${revision}。`, explanation:`更新解説${revision}。`, practices:[`更新実践${revision}`], examples:[], cautions:[], theory_ids:[], primary_theory_ids:[], status:'published', display_order:1, access_tier:complete ? 'complete' : 'free' });
  const theory = JSON.parse(fs.readFileSync('src/data/generated/theories.json','utf8')).find((row: {accessTier?:string})=>row.accessTier==='complete');
  await page.route('**/rest/v1/**',route=>{
    const url=route.request().url();
    if(url.includes('/profiles')) return route.fulfill({json:{role:'user',display_name:'更新確認'}});
    if(url.includes('/public_techniques')) publicAttempts++;
    if(url.includes('/content_revision') && revisionOffline) return route.fulfill({status:503,json:{message:'revision offline'}});
    if(offline) return route.fulfill({status:503,json:{message:'offline'}});
    if(url.includes('/content_revision')) {revisionReads++;return route.fulfill({json:{revision}});}
    if(url.includes('/public_techniques')) {publicReads++;return route.fulfill({json:[complete ? {...technique(),essence:'',explanation:'',practices:[]} : technique()]});}
    if(url.includes('/personas')) return route.fulfill({json:[{name:'印象がいい人',category:'interpersonal',access_tier:complete ? 'complete' : 'free'}]});
    if(url.includes('/content_categories')) return route.fulfill({json:[{kind:'technique',id:'interpersonal',title:'対人術',display_order:1},{kind:'theory',id:theory.categoryId,title:theory.categoryTitle,display_order:1}]});
    if(url.includes('/public_theories')) return route.fulfill({json:complete ? [{id:theory.tagId,title:theory.title,summary:'',category_id:theory.categoryId,category_title:theory.categoryTitle,access_tier:'complete',status:'published'}] : []});
    return route.fulfill({json:[]});
  });
  if(complete){
    const user={id:'00000000-0000-4000-8000-000000000009',aud:'authenticated',role:'authenticated',email:'refresh@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
    const jwt=Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:4102444800})).toString('base64url');
    const session={access_token:`eyJhbGciOiJIUzI1NiJ9.${jwt}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user};
    const project=new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
    await page.addInitScript(({key,session})=>localStorage.setItem(key,JSON.stringify(session)),{key:`sb-${project}-auth-token`,session});
    await page.route('**/auth/v1/**',route=>route.fulfill({json:user}));
    await page.route('**/functions/v1/**',route=>{
      const url=new URL(route.request().url());
      if(url.pathname.endsWith('/access')) return route.fulfill({json:{access:'active',accessType:'thirty_day',accessExpiresAt:'2099-01-01T00:00:00Z'}});
      if(offline) return route.fulfill({status:503,json:{message:'offline'}});
      const kind=url.searchParams.get('type');
      if(kind==='technique') secureReads++;
      const row=technique();
      const payload=kind==='theory' ? {...theory,summary:`更新概要${revision}。`} : kind==='technique' ? {...row,categoryKey:row.category,categoryName:'対人術',subcategory:row.persona_id,accessTier:'complete',practicalActions:{todayActions:row.practices,examples:[],cautions:[]}} : {id:'refresh-learning',number:999,title:'更新確認',theoryTagIds:[]};
      return route.fulfill({json:{items:[{payload}]}});
    });
  }
  return {edit:()=>{revision++;},setOffline:(value:boolean)=>{offline=value;},setRevisionOffline:(value:boolean)=>{revisionOffline=value;},publicAttempts:()=>publicAttempts,secureReads:()=>secureReads,publicReads:()=>publicReads,revisionReads:()=>revisionReads};
}

test('通信失敗の帯を表示せず、リビジョン取得に失敗していても裏で自動復旧する', async ({ page }) => {
  await page.clock.install();
  const db = await mockCatalog(page);
  db.setOffline(true);
  db.setRevisionOffline(true);
  await page.goto('/card/master336-001');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(db.publicAttempts).toBeGreaterThan(0);
  await page.waitForTimeout(100);
  await expect(page.getByTestId('data-status-banner')).toHaveCount(0);
  await expect(page.getByText('保存済みの内容を表示しています。', { exact: false })).toHaveCount(0);
  const failedReads = db.publicAttempts();
  db.setOffline(false);
  await page.clock.fastForward(15_000);
  await expect.poll(db.publicAttempts).toBeGreaterThan(failedReads);
  await expect(page.getByRole('heading', { name: '更新タイトル1', level: 1 })).toBeVisible();
  await expect(page.getByText('更新解説1。', { exact: true })).toBeVisible();
  await expect(page.getByTestId('data-status-banner')).toHaveCount(0);
});

test('失敗時の再試行間隔を延ばし、非表示中は止めて接続復帰で即時再取得する', async ({ page }) => {
  await page.clock.install();
  const db = await mockCatalog(page);
  db.setOffline(true);
  await page.goto('/card/master336-001');
  await expect.poll(db.publicAttempts).toBeGreaterThan(0);
  await page.waitForTimeout(100);
  const initial = db.publicAttempts();
  await page.clock.fastForward(15_000);
  await expect.poll(db.publicAttempts).toBeGreaterThan(initial);
  await page.waitForTimeout(100);
  const firstRetry = db.publicAttempts();
  await page.clock.fastForward(20_000);
  expect(db.publicAttempts()).toBe(firstRetry);
  await page.clock.fastForward(15_000);
  await expect.poll(db.publicAttempts).toBeGreaterThan(firstRetry);
  await page.waitForTimeout(100);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const hiddenReads = db.publicAttempts();
  await page.clock.fastForward(300_000);
  expect(db.publicAttempts()).toBe(hiddenReads);
  db.setOffline(false);
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('online'));
  });
  await expect(page.getByText('更新解説1。', { exact: true })).toBeVisible();
  await expect(page.getByTestId('data-status-banner')).toHaveCount(0);
});

test('開いたままの無料本文は変更時だけ更新し、接続復帰でも再取得する',async({page})=>{
  await page.clock.install();
  const db=await mockCatalog(page);
  await page.goto('/card/master336-001');
  await expect(page.getByText('更新解説1。',{exact:true})).toBeVisible();
  const initialReads=db.publicReads();
  const initialRevisionReads=db.revisionReads();
  await advanceToRevisionCheck(page);
  await expect.poll(db.revisionReads).toBeGreaterThan(initialRevisionReads);
  expect(db.publicReads()).toBe(initialReads);
  db.edit();
  await advanceToRevisionCheck(page);
  await expect(page.getByRole('heading',{name:'更新タイトル2',level:1})).toBeVisible();
  await expect(page.getByText('更新解説2。',{exact:true})).toBeVisible();
  db.setOffline(true);db.edit();
  await advanceToRevisionCheck(page);
  await expect(page.getByText('更新解説2。',{exact:true})).toBeVisible();
  db.setOffline(false);
  await page.clock.fastForward(60*1000);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect(page.getByText('更新解説3。',{exact:true})).toBeVisible();
});

test('完全版の本文も再取得し、公開用の空本文や通信失敗で消えない',async({page})=>{
  await page.clock.install();
  const db=await mockCatalog(page,true);
  await page.goto('/card/master336-001');
  await expect(page.getByText('更新解説1。',{exact:true})).toBeVisible();
  const initialReads=db.secureReads();
  const initialPublicReads=db.publicReads();
  await advanceToRevisionCheck(page);
  expect(db.secureReads()).toBe(initialReads);
  expect(db.publicReads()).toBe(initialPublicReads);
  db.edit();
  await advanceToRevisionCheck(page);
  await expect(page.getByText('更新解説2。',{exact:true})).toBeVisible();
  expect(db.secureReads()).toBeGreaterThan(initialReads);
  db.setOffline(true);
  await advanceToRevisionCheck(page);
  await expect(page.getByText('更新解説2。',{exact:true})).toBeVisible();
  db.setOffline(false);db.edit();
  await page.clock.fastForward(60*1000);
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  await expect(page.getByText('更新解説3。',{exact:true})).toBeVisible();
});

test('バックグラウンドの定期通信は止まり、復帰確認は短時間で重複しない',async({page})=>{
  await page.clock.install();
  const db=await mockCatalog(page);
  await page.goto('/card/master336-001');
  await expect(page.getByText('更新解説1。',{exact:true})).toBeVisible();
  const initialReads=db.revisionReads();
  const visibility=async(state:string)=>page.evaluate(value=>{
    Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>value});
    document.dispatchEvent(new Event('visibilitychange'));
  },state);
  await visibility('hidden');
  await page.clock.fastForward(60*60*1000);
  expect(db.revisionReads()).toBe(initialReads);
  db.edit();await visibility('visible');
  await expect(page.getByText('更新解説2。',{exact:true})).toBeVisible();
  const returnedReads=db.revisionReads();
  const returnedPublicReads=db.publicReads();
  for(let i=0;i<3;i++){await visibility('hidden');await visibility('visible');}
  await page.evaluate(()=>window.dispatchEvent(new Event('online')));
  expect(db.revisionReads()).toBe(returnedReads);
  expect(db.publicReads()).toBe(returnedPublicReads);
});
