import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const guestKey='@shoseijutsu-roku/state/v1';
async function backup(page:Page){const event=page.waitForEvent('download');await page.getByRole('button',{name:'バックアップをダウンロード',exact:true}).click();const file=await event;return JSON.parse(await readFile((await file.path())!,'utf8'));}
test.beforeEach(async({page})=>{
 await page.route('**/rest/v1/**',r=>r.request().url().includes('/profiles')?r.fulfill({json:{role:'user',display_name:'検証利用者'}}):r.fulfill({status:503,json:{}}));
 await page.route('**/functions/v1/**',r=>r.fulfill({json:{access:'none',items:[]}}));
});
test('JSON backup, merge, replacement and undo preserve actual personal records',async({page})=>{
 await page.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({savedIds:['master336-001'],notes:{'master336-001':'現在の記録'},personalPrinciple:'大切な言葉'}));},guestKey);
 await page.goto('/settings/data');
 const original=await backup(page);expect(original.data.personalPrinciple).toBe('大切な言葉');
 const incoming={...original,data:{...original.data,savedIds:['future-content-id'],notes:{'master336-001':'追加する記録'},personalPrinciple:'復元した言葉'}};
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
 test.setTimeout(60000);
 let id='00000000-0000-4000-8000-000000000071';
 const user=()=>({id,aud:'authenticated',role:'authenticated',email:'quality@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'});
 const session=()=>({access_token:'eyJhbGciOiJIUzI1NiJ9.'+Buffer.from(JSON.stringify({sub:id,role:'authenticated',exp:4102444800})).toString('base64url')+'.test',refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user:user()});
 const authKey=`sb-${new URL(process.env.EXPO_PUBLIC_SUPABASE_URL??'https://example.supabase.co').hostname.split('.')[0]}-auth-token`;
 await page.route('**/auth/v1/**',r=>r.fulfill({json:user()}));
 await page.addInitScript(({authKey,session,guestKey})=>{if(sessionStorage.getItem('quality-account-ready'))return;sessionStorage.setItem('quality-account-ready','1');localStorage.setItem(authKey,JSON.stringify(session));localStorage.setItem(guestKey,JSON.stringify({personalPrinciple:'ゲストだけの記録',savedIds:['guest-id']}));localStorage.setItem('@shoseijutsu-roku/state/v2/user/'+session.user.id,JSON.stringify({personalPrinciple:'Aだけの記録',savedIds:['account-a-id']}));},{authKey,session:session(),guestKey});
 await page.goto('/settings/data');expect((await backup(page)).data.savedIds).toEqual(['account-a-id']);
 id='00000000-0000-4000-8000-000000000072';
 await page.evaluate(({authKey,session})=>localStorage.setItem(authKey,JSON.stringify(session)),{authKey,session:session()});await page.reload();
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toBeVisible({timeout:15000});
 expect((await backup(page)).data.savedIds).toEqual([]);
 await page.getByRole('button',{name:'記録を引き継ぐ',exact:true}).click();
 await expect(page.getByRole('button',{name:'記録を引き継ぐ',exact:true})).toHaveCount(0);
 expect((await backup(page)).data.savedIds).toEqual(['guest-id']);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).savedIds,'@shoseijutsu-roku/state/v2/user/00000000-0000-4000-8000-000000000071')).toEqual(['account-a-id']);
 expect(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!).savedIds,guestKey)).toEqual(['guest-id']);
 let cloud:any=null,uploads=0;
 await page.route('**/rest/v1/personal_backups**',async r=>{
  const method=r.request().method();
  if(method==='POST'||method==='PATCH'){uploads++;const body=r.request().postDataJSON();expect(body.data.data.savedIds).toEqual(['guest-id']);expect(JSON.stringify(body)).not.toContain('account-a-id');cloud={...body,user_id:id,updated_at:'2026-10-29T10:00:00Z'};return r.fulfill({json:cloud});}
  if(method==='DELETE'){cloud=null;return r.fulfill({json:[{user_id:id}]});}
  return r.fulfill({json:cloud});
 });
 await page.getByRole('button',{name:'クラウドへバックアップ',exact:true}).click();
 await page.getByRole('button',{name:'送信して保存する',exact:true}).click();
 await expect(page.getByTestId('personal-backup-message')).toContainText('クラウドにバックアップしました');expect(uploads).toBe(1);
 await page.getByRole('button',{name:'クラウドから読み込む',exact:true}).click();
 await expect(page.getByTestId('personal-backup-input')).toHaveValue(/guest-id/);
 cloud.updated_at='2026-10-29T11:00:00Z';
 await page.getByRole('button',{name:'クラウドへバックアップ',exact:true}).click();
 await page.getByRole('button',{name:'送信して保存する',exact:true}).click();
 await expect(page.getByTestId('personal-backup-message')).toContainText('別の端末で更新されています');expect(uploads).toBe(1);
 await page.getByRole('button',{name:'キャンセル',exact:true}).click();
 await page.getByRole('button',{name:'クラウドのバックアップを削除',exact:true}).click();
 await page.getByRole('button',{name:'削除を確定する',exact:true}).click();
 await expect(page.getByTestId('personal-backup-message')).toContainText('クラウドのバックアップを削除しました');expect(cloud).toBeNull();
});
test('unlimited practice survives one minute and incorrect answers enter the review list',async({page})=>{
 await page.goto('/learn');await page.getByRole('switch',{name:'時間制限なしで練習する'}).check();
 await page.clock.install();await page.goto('/learn/case-01?retry=1');
 await expect(page.getByTestId('learning-countdown')).toContainText('時間制限なし');
 await page.clock.runFor(65000);await expect(page.getByText('時間切れ',{exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:/^A /}).click();await expect(page.getByText('おしい！',{exact:true})).toBeVisible();
 await page.getByTestId('book-header-back').click();await expect(page.getByTestId('learning-review-list')).toContainText('あとで復習');
 await page.screenshot({path:test.info().outputPath('learning-practice-mobile.png'),fullPage:true});
});
