import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const guestKey='@shoseijutsu-roku/state/v1';
async function backup(page: Page) {
 const open = page.getByRole('button', { name: 'ファイルの書き出し・読み込み', exact: true });
 const download = page.getByRole('button', { name: 'バックアップをダウンロード', exact: true });
 await expect(open.or(download)).toBeVisible();
 if (await open.isVisible()) await open.click();
 const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
 return JSON.parse(await readFile((await file.path())!, 'utf8'));
}
test.beforeEach(async({page})=>{
 await page.route('**/rest/v1/**',r=>r.request().url().includes('/profiles')?r.fulfill({json:{role:'user',display_name:'検証利用者'}}):r.fulfill({status:503,json:{}}));
 await page.route('**/functions/v1/**',r=>r.fulfill({json:{access:'none',items:[]}}));
});
test('JSON backup, merge, replacement and undo preserve actual personal records',async({page})=>{
 await page.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({savedIds:['master336-001'],notes:{'master336-001':'現在の記録'},personalPrinciple:'大切な言葉'}));},guestKey);
 await page.goto('/settings/data');
 const original=await backup(page);expect(original.data.personalPrinciple).toBe('大切な言葉');
 const incoming={...original,data:{...original.data,savedIds:['future-content-id'],notes:{'master336-001':'追加する記録'},personalPrinciple:'復元した言葉'}};
 await page.getByRole('button',{name:'テキストから復元する',exact:true}).click();
 await page.getByTestId('personal-backup-input').fill(JSON.stringify(incoming));
 await page.getByRole('button',{name:'記録を復元する',exact:true}).click();
 await expect(page.getByTestId('personal-backup-message')).toContainText('復元しました');
 let data=(await backup(page)).data;expect(data.savedIds).toEqual(['master336-001','future-content-id']);expect(data.notes['master336-001']).toContain('現在の記録');expect(data.notes['master336-001']).toContain('追加する記録');
 await page.getByRole('switch',{name:'現在の記録を置き換える'}).check();
 await page.getByRole('button',{name:'記録を復元する',exact:true}).click();
 await expect(page.getByTestId('personal-backup-message')).toContainText('復元しました');
 data=(await backup(page)).data;expect(data.savedIds).toEqual(['future-content-id']);
 await page.getByRole('button',{name:'復元前に戻す',exact:true}).click();
 await expect(page.getByTestId('personal-backup-message')).toContainText('復元前の記録に戻しました');
 expect((await backup(page)).data.savedIds).toEqual(['master336-001','future-content-id']);
 await page.screenshot({path:test.info().outputPath('backup-mobile.png'),fullPage:true});
});
test('guest import is explicit and account changes cannot expose another account records',async({page})=>{
 test.setTimeout(90000);
 let id='00000000-0000-4000-8000-000000000071';
 const user=()=>({id,aud:'authenticated',role:'authenticated',email:'quality@example.invalid',app_metadata:{},user_metadata:{terms_version:'3.5',privacy_version:'2.2',terms_accepted_at:'2026-11-22T00:00:00Z'},created_at:'2026-01-01T00:00:00Z'});
 const session=()=>({access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:4102444800})).toString('base64url')+'.test',refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user:user()});
 const fixtureUrl = process.env.PLAYWRIGHT_PERSONAL_SYNC_FIXTURE === '1' ? 'https://roku-sync-test.invalid' : undefined;
 const authKey=`sb-${new URL(fixtureUrl ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://example.supabase.co').hostname.split('.')[0]}-auth-token`;
 await page.route('**/auth/v1/**',r=>r.fulfill({json:user()}));
 const server = new Map<string, { revision: number; ack: number; items: Map<string, { key: string; revision: number; value: unknown }> }>();
 await page.route('**/rest/v1/rpc/sync_personal_records', async route => {
  const request = route.request();
  const body = request.postDataJSON();
  const token = request.headers().authorization.split(' ')[1];
  expect(body.p_user).toBe(JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sub);
  const records = server.get(body.p_user) ?? { revision: 0, ack: 0, items: new Map() };
  server.set(body.p_user, records);
  if (body.p_epoch === null) return route.fulfill({ json: { epoch: 1, cursor: 0, ack: 0, reset: true, more: records.revision > 0, items: [] } });
  if (body.p_changes.length && body.p_sequence > records.ack) {
   for (const change of body.p_changes) {
    records.items.set(change.key, { key: change.key, revision: ++records.revision, value: change.deleted ? null : change.value });
   }
   records.ack = body.p_sequence;
  }
  return route.fulfill({ json: { epoch: 1, cursor: records.revision, ack: body.p_changes.length ? records.ack : 0,
   reset: false, more: false, items: [...records.items.values()].filter(item => item.revision > body.p_cursor).sort((a, b) => a.revision - b.revision) } });
 });
 await page.addInitScript(({authKey,session,guestKey})=>{if(sessionStorage.getItem('quality-account-ready'))return;sessionStorage.setItem('quality-account-ready','1');localStorage.setItem(authKey,JSON.stringify(session));localStorage.setItem(guestKey,JSON.stringify({personalPrinciple:'ゲストだけの記録',savedIds:['guest-id']}));localStorage.setItem('@shoseijutsu-roku/state/v2/user/'+session.user.id,JSON.stringify({personalPrinciple:'Aだけの記録',savedIds:['account-a-id']}));},{authKey,session:session(),guestKey});
 await page.goto('/settings/data');expect((await backup(page)).data.savedIds).toEqual(['account-a-id']);
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toBeVisible();
 expect((await backup(page)).data.savedIds).toEqual(['account-a-id']);
 id='00000000-0000-4000-8000-000000000072';
 await page.evaluate(({authKey,session})=>localStorage.setItem(authKey,JSON.stringify(session)),{authKey,session:session()});await page.reload();
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toBeVisible({timeout:15000});
 expect((await backup(page)).data.savedIds).toEqual([]);
 await page.getByRole('button',{name:'記録を引き継ぐ',exact:true}).click();
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toHaveCount(0);
 expect((await backup(page)).data.savedIds).toEqual(['guest-id']);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).savedIds,'@shoseijutsu-roku/state/v2/user/00000000-0000-4000-8000-000000000071')).toEqual(['account-a-id']);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).savedIds,guestKey)).toEqual(['guest-id']);
 await page.reload();
 expect((await backup(page)).data.savedIds).toEqual(['guest-id']);
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toHaveCount(0);
 await expect.poll(() => server.get(id)?.items.get(JSON.stringify(['savedIds','guest-id']))?.value).toBe(true);
 expect(server.get(id)?.items.has(JSON.stringify(['savedIds','account-a-id']))).toBe(false);
 id='00000000-0000-4000-8000-000000000071';
 await page.evaluate(({authKey,session})=>localStorage.setItem(authKey,JSON.stringify(session)),{authKey,session:session()});await page.reload();
 expect((await backup(page)).data.savedIds).toEqual(['account-a-id']);
 await page.getByRole('button',{name:'引き継がない',exact:true}).click();await page.reload();
 expect((await backup(page)).data.savedIds).toEqual(['account-a-id']);
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toHaveCount(0);
});

test('retrying a failed write preserves a removed favorite across reload',async({page})=>{
 await page.addInitScript(key=>{
  if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({savedIds:['master336-001']}));
  const original=Storage.prototype.setItem;
  Storage.prototype.setItem=function(name,value){if(name===key&&(window as any).__failPersonalWrites)throw new DOMException('Storage full','QuotaExceededError');return original.call(this,name,value);};
 },guestKey);
 await page.goto('/card/master336-001');
 await expect(page.getByTestId('technique-detail-title')).toBeVisible();
 await expect(page.getByRole('button',{name:'お気に入りから外す',exact:true}).first()).toBeVisible();
 await page.evaluate(()=>{(window as any).__failPersonalWrites=true;});
 await page.getByRole('button',{name:'お気に入りから外す',exact:true}).first().click();
 await expect(page.getByTestId('data-status-banner')).toContainText('記録を端末に保存できませんでした');
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).savedIds,guestKey)).toEqual(['master336-001']);
 await page.evaluate(()=>{(window as any).__failPersonalWrites=false;});
 await page.getByRole('button',{name:'保存を再試行',exact:true}).click();
 await expect.poll(()=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).savedIds,guestKey)).toEqual([]);
 await page.reload();
 await expect(page.getByTestId('technique-detail-title')).toBeVisible();
 await expect(page.getByRole('button',{name:'お気に入りから外す',exact:true})).toHaveCount(0);
});
test('fixed 60-second practice starts immediately and incorrect answers enter the review list',async({page})=>{
 await page.goto('/learn');await expect(page.getByRole('switch',{name:/時間制限/})).toHaveCount(0);
 await page.clock.install();await page.goto('/learn/case-01?retry=1');
 await expect(page.getByTestId('learning-question-card').getByTestId('learning-seconds')).toHaveText('1:00');
 await expect(page.getByRole('button',{name:/^A /})).toBeEnabled();
 await page.clock.runFor(1000);await expect(page.getByTestId('learning-seconds')).toHaveText('0:59');
 await page.getByRole('button',{name:/^A /}).click();await expect(page.getByText('おしい！',{exact:true})).toBeVisible();
 await page.getByTestId('book-header-back').click();await expect(page.getByTestId('learning-review-list')).toContainText('あとで復習');
 await page.screenshot({path:test.info().outputPath('learning-practice-mobile.png'),fullPage:true});
});
