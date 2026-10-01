import { expect, test, type Page } from '@playwright/test';
import fs from 'node:fs';

const originals = JSON.parse(fs.readFileSync('docs/content/practical-wisdom-originals.json', 'utf8')) as { tagId:string; displayId:number; title:string; summary:string; provenance:object; accessTier:string; categoryId:string; categoryTitle:string }[];

async function mockCompleteAccount(page: Page, owner = false, publicReads = false) {
  const user = { id:'00000000-0000-4000-8000-000000000003', aud:'authenticated', role:'authenticated', email:'wisdom-test@example.invalid', app_metadata:{}, user_metadata:{}, created_at:'2026-01-01T00:00:00Z' };
  const payload = Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:4102444800})).toString('base64url');
  const session = {access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user};
  const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({key,value}) => localStorage.setItem(key,JSON.stringify(value)), {key:`sb-${project}-auth-token`,value:session});
  await page.route('**/auth/v1/**', route => route.fulfill({json:user}));
  // Return failures for public catalogue requests to exercise the bundled catalogue.
  await page.route('**/rest/v1/**', route => {
    const url = route.request().url();
    if (url.includes('/profiles')) return route.fulfill({json:{role:owner ? 'owner' : 'user',display_name:'検証利用者'}});
    if (owner && url.includes('/theories')) return route.fulfill({json:originals.map(item=>({id:item.tagId,title:item.title,summary:item.summary,category_id:item.categoryId,category_title:item.categoryTitle,display_id:item.displayId,display_order:item.displayId,status:'published',provenance:item.provenance,access_tier:item.accessTier,aliases:[],related_theory_ids:[],updated_at:'2026-10-02T00:00:00Z'}))});
    if (owner && url.includes('/content_categories')) return route.fulfill({json:[{kind:'theory',id:'practical-wisdom',title:'実践知',display_order:5}]});
    if (owner) return route.fulfill({json:[]});
    if (publicReads && url.includes('/theories')) return route.fulfill({json:originals.map(item=>({id:item.tagId,title:item.title,summary:item.accessTier==='free'?item.summary:null,category_id:item.categoryId,category_title:item.categoryTitle,display_id:item.displayId,display_order:item.displayId,status:'published',provenance:item.accessTier==='free'?item.provenance:null,access_tier:item.accessTier,aliases:[],related_theory_ids:[]}))});
    if (publicReads && url.includes('/content_categories')) return route.fulfill({json:[{kind:'theory',id:'practical-wisdom',title:'実践知',display_order:5}]});
    if (publicReads) return route.fulfill({json:[]});
    return route.fulfill({status:400,json:{message:'Use bundled catalogue'}});
  });
  await page.route('**/functions/v1/**', route => {
    if (route.request().url().includes('/access')) return route.fulfill({json:{access:'active',accessType:'thirty_day',accessExpiresAt:'2099-01-01T00:00:00Z'}});
    const type = new URL(route.request().url()).searchParams.get('type');
    return route.fulfill({json:{items:type === 'theory' ? originals.filter(item=>item.accessTier==='complete').map(item=>({content_type:'theory',content_id:item.tagId,payload:item})) : []}});
  });
}

test('実践知は指定39件だけをA-001〜A-039として表示する', async ({page}) => {
  await page.goto('/theories?category=practical-wisdom');
  await expect(page.getByText('39件',{exact:true})).toBeVisible();
  const rows = page.getByTestId('theory-index-row-card');
  await expect(rows).toHaveCount(39);
  for (const original of originals) {
    await expect(rows.nth(original.displayId-1)).toContainText(`A-${String(original.displayId).padStart(3,'0')}`);
    await expect(rows.nth(original.displayId-1)).toContainText(original.title.slice(1,-1));
  }
  await expect(page.getByText(/A-04[0-8]/)).toHaveCount(0);
  await page.screenshot({path:test.info().outputPath('practical-wisdom-39.png'),fullPage:true});
});

test('CMSは新39件を読み込み、実践知の原文・概要・オリジナル出典を編集できる', async ({page}) => {
  await page.setViewportSize({width:1440,height:1000});
  await mockCompleteAccount(page,true);
  await page.goto('/owner/content?kind=theory');
  await expect(page.getByText('39件',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:originals[0].title}).first().click();
  await expect(page.getByRole('textbox',{name:'理論名',exact:true})).toHaveValue(originals[0].title);
  await page.getByRole('button',{name:'本文',exact:true}).click();
  await expect(page.getByRole('textbox',{name:'概要・本文',exact:true})).toHaveValue(originals[0].summary);
  await page.getByRole('button',{name:'補足メモ',exact:true}).click();
  await expect(page.getByText('出典：処世術禄オリジナル',{exact:true})).toBeVisible();
  await expect(page.getByRole('textbox',{name:'提唱者・著者',exact:true})).toHaveValue('処世術禄');
  await expect(page.getByRole('textbox',{name:'参照先URL 1',exact:true})).toHaveCount(0);
  await page.screenshot({path:test.info().outputPath('cms-original-provenance.png'),fullPage:true});
});

test('無料の実践知詳細にオリジナル出典を表示する', async ({page}) => {
  await page.goto(`/theory/${originals[0].tagId}`);
  await expect(page.getByTestId('theory-summary')).toContainText(originals[0].summary.split('。')[0]);
  await expect(page.getByTestId('theory-information')).toContainText('処世術禄オリジナル');
  await expect(page.getByTestId('theory-information')).toContainText('オリジナル');
  await expect(page.getByTestId('theory-information')).not.toContainText('書誌確認済み');
});

test('完全版の新39件の詳細を表示でき、概要とオリジナル出典を保持する', async ({page}) => {
  test.setTimeout(180_000);
  await mockCompleteAccount(page,false,true);
  for (const original of originals) {
    await page.goto(`/theory/${original.tagId}`);
    await expect(page.getByTestId('theory-title')).toContainText(original.title.slice(1,-1));
    await expect(page.getByTestId('theory-summary')).toContainText(original.summary.split('。')[0]);
    await expect(page.getByTestId('theory-information')).toContainText('処世術禄オリジナル');
  }
  await page.screenshot({path:test.info().outputPath('original-detail-a039.png'),fullPage:true});
});

test('公開APIや他の完全版データを取得できなくても取得済みの実践知本文を表示する', async ({page}) => {
  await mockCompleteAccount(page);
  const original=originals[10];
  await page.goto(`/theory/${original.tagId}`);
  await expect(page.getByTestId('theory-title')).toContainText(original.title.slice(1,-1));
  await expect(page.getByTestId('theory-summary')).toContainText(original.summary.split('。')[0]);
});
