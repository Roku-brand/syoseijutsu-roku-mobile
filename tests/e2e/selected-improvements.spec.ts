import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
const guestKey='@shoseijutsu-roku/state/v1';
const nav=(page:Page,label:string)=>page.getByTestId('persistent-bottom-navigation').getByRole('link',{name:new RegExp('^'+label)});
const scrollTop=(page:Page)=>page.evaluate(()=>Math.max(0,...Array.from(document.querySelectorAll('*')).filter(el=>el.clientHeight>200 && ['auto','scroll'].includes(getComputedStyle(el).overflowY)).map(el=>el.scrollTop)));
test.beforeEach(async({page})=>{
 await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
 await page.route('**/functions/v1/**',r=>r.fulfill({json:{access:'none',items:[]}}));
});

test('reading retains its originating tab through history; direct links belong to discover',async({page})=>{
 await page.goto('/card/master336-001');await expect(nav(page,'探す')).toHaveAttribute('aria-current','page');
 await nav(page,'ホーム').click();await page.getByTestId('home-recommendation-card').click();
 await expect(page).toHaveURL(/\/(card|theory)\//);await expect(nav(page,'ホーム')).toHaveAttribute('aria-current','page');
 const readerURL=page.url();
 await page.getByRole('link',{name:'探すへ移動',exact:true}).click();await expect(page).toHaveURL(/\/discover$/);
 await expect(nav(page,'探す')).toHaveAttribute('aria-current','page');
 await page.goBack();await expect(page).toHaveURL(readerURL);await expect(nav(page,'ホーム')).toHaveAttribute('aria-current','page');
 await page.goForward();await expect(page).toHaveURL(/\/discover$/);await expect(nav(page,'探す')).toHaveAttribute('aria-current','page');
 await page.goto('/techniques');await page.getByTestId('technique-index-row').first().click();
 await expect(nav(page,'探す')).toHaveAttribute('aria-current','page');
});

test('favorite and learning links retain MyPage and Learn context',async({page})=>{
 await page.addInitScript(key=>localStorage.setItem(key,JSON.stringify({savedIds:['master336-001']})),guestKey);
 await page.goto('/my-os');await page.getByRole('button',{name:'対人術のお気に入り 1件',exact:true}).click();
 await page.getByTestId('personal-content-technique').first().click();
 await expect(page).toHaveURL(/\/card\//);await expect(nav(page,'マイページ')).toHaveAttribute('aria-current','page');
 await nav(page,'学ぶ').click();await page.getByTestId('learning-challenge-1').click();await page.getByTestId('learning-start').click();
 await page.getByRole('button',{name:/^B /}).click();
 await page.getByRole('link',{name:/関連する基礎知識、/}).first().click();
 await expect(page).toHaveURL(/\/card\//);await expect(nav(page,'学ぶ')).toHaveAttribute('aria-current','page');
});

test('a case waits for explicit start and offers unlimited practice within the case',async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.clock.install();await page.goto('/learn/case-01?retry=1');
 await expect(page.getByTestId('learning-start')).toBeEnabled();await page.clock.runFor(65000);
 await page.getByTestId('learning-countdown').scrollIntoViewIfNeeded();
 await page.screenshot({path:'release-evidence/selected-improvements/case-before-start-320.png'});
 await expect(page.getByTestId('learning-seconds')).toHaveText('60 秒');await expect(page.getByRole('button',{name:/^A /})).toBeDisabled();
 await page.getByRole('switch',{name:'このケースを時間制限なしで練習する'}).check();
 await page.getByTestId('learning-start').click();await page.clock.runFor(65000);
 await expect(page.getByText('時間切れ',{exact:true})).toHaveCount(0);await expect(page.getByRole('button',{name:/^A /})).toBeEnabled();
 await page.getByRole('button',{name:/^B /}).click();await expect(page.getByText('正解！',{exact:true})).toBeVisible();
 await page.reload();
 await expect(page.getByTestId('learning-start')).toHaveAccessibleName('練習をはじめる');
});

test('file import previews counts without changing records; export dates survive reload',async({page})=>{
 await page.addInitScript(key=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify({savedIds:['master336-001']}));},guestKey);
 await page.goto('/settings/data');await expect(page.getByTestId('personal-backup-status')).toContainText('お気に入り 1件');
 await page.screenshot({path:'release-evidence/selected-improvements/backup-status-mobile.png'});
 const event=page.waitForEvent('download');await page.getByRole('button',{name:'バックアップをダウンロード',exact:true}).click();
 const download=await event;const original=JSON.parse(await readFile((await download.path())!,'utf8'));
 await expect(page.getByTestId('personal-backup-status')).not.toContainText('端末への最終書き出し：まだありません');
 await page.reload();await expect(page.getByTestId('personal-backup-status')).not.toContainText('端末への最終書き出し：まだありません');
 const incoming={...original,data:{...original.data,savedIds:['imported-id','second-id']}};
 const chooser=page.waitForEvent('filechooser');await page.getByRole('button',{name:'バックアップファイルを選ぶ',exact:true}).click();
 await (await chooser).setFiles({name:'記録.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(incoming))});
 await expect(page.getByTestId('personal-backup-preview')).toContainText('お気に入り 2件');
 await expect(page.getByTestId('personal-backup-status')).toContainText('お気に入り 1件');
 await page.getByRole('button',{name:'記録を復元する',exact:true}).click();
 await expect(page.getByTestId('personal-backup-status')).toContainText('お気に入り 3件');
 await page.screenshot({path:'release-evidence/selected-improvements/backup-mobile.png',fullPage:true});
 const invalid=page.waitForEvent('filechooser');await page.getByRole('button',{name:'バックアップファイルを選ぶ',exact:true}).click();
 await (await invalid).setFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{}')});
 await expect(page.getByTestId('personal-backup-message')).not.toContainText('ファイルを読み込みました');
 await expect(page.getByTestId('personal-backup-status')).toContainText('お気に入り 3件');
});

for(const kind of ['technique','theory'])test(`${kind} footer turns pages, retains filters and returns to top`,async({page})=>{
 const route=kind==='theory'?'/theories':'/techniques';
 await page.goto(route);const footer=page.getByTestId(`${kind}-index-footer`);const top=page.getByTestId(`${kind}-index-pagination`);
 await footer.getByRole('button',{name:'次のページ',exact:true}).click();
 await expect(top.getByRole('button',{name:/ページ選択：2\//})).toBeVisible();await expect.poll(()=>scrollTop(page)).toBe(0);
 await expect(page.getByTestId(kind==='theory'?'theory-index-row-card':'technique-index-row')).toHaveCount(100);
 await footer.getByRole('button',{name:'一覧の先頭へ戻る',exact:true}).click();await expect.poll(()=>scrollTop(page)).toBe(0);
 if(kind==='technique'){
  await page.getByRole('button',{name:'対人術で処世術を絞り込む',exact:true}).click();
  await footer.getByRole('button',{name:'次のページ',exact:true}).click();
  await expect(page).toHaveURL(/category=interpersonal/);await expect(page).toHaveURL(/page=2/);
 }
});

test('small learning rows wrap and settings remains distinct from MyPage',async({page})=>{
 await page.setViewportSize({width:320,height:568});await page.goto('/learn');
 // Inspect every visible case row rather than relying on one editorial title.
 const rows=page.getByTestId('learning-stage-1').getByRole('button',{name:/を開く$/});
 await rows.first().scrollIntoViewIfNeeded();
 for(let i=0;i<Math.min(await rows.count(),9);i++){const box=await rows.nth(i).boundingBox();expect(box!.height).toBeGreaterThanOrEqual(44);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'release-evidence/selected-improvements/learn-320.png'});
 await nav(page,'ホーム').click();const settings=page.getByTestId('settings-header-action');await expect(settings).toHaveAccessibleName('設定を開く');
 await expect(settings).toContainText('\ue8b8');await settings.click();await expect(page).toHaveURL(/\/settings$/);
 await expect(nav(page,'マイページ')).toHaveAttribute('aria-current','page');
 await page.getByRole('button',{name:/記録のバックアップ・復元/}).click();await expect(page).toHaveURL(/\/settings\/data$/);
 await nav(page,'マイページ').click();await expect(page).toHaveURL(/\/my-os$/);
});

test('shuffle labels contrast with every category fill',async({page})=>{
 await page.goto('/');
 for(const key of ['all','interpersonal','work','life']){
  if(key!=='all'){await page.getByTestId('home-deck-filter').click();await page.getByTestId('home-deck-filter-'+key).click();}
  const contrast=await page.getByTestId('home-discovery-refresh').evaluate(el=>{
   const lum=(value:string)=>{const nums=value.match(/[\d.]+/g)!.slice(0,3).map(Number).map(n=>{const c=n/255;return c<=.04045?c/12.92:((c+.055)/1.055)**2.4;});return nums[0]*.2126+nums[1]*.7152+nums[2]*.0722;};
   const bg=lum(getComputedStyle(el).backgroundColor),fg=lum(getComputedStyle(el.querySelector('[dir]')??el.lastElementChild!).color);
   return (Math.max(bg,fg)+.05)/(Math.min(bg,fg)+.05);
  });expect(contrast).toBeGreaterThanOrEqual(4.5);
 }
});
