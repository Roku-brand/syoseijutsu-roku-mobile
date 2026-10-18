import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const theories=JSON.parse(fs.readFileSync('src/data/generated/theories.json','utf8'));

for(const width of [320,393,768,1440])test(`内部分類リールの横移動・URL・復元・件数・フォーカス ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/theories?category=psychology&subcategory=psychology-life');
  const tabs=page.getByTestId('theory-subcategory-tab');
  await expect(tabs).toHaveCount(9);
  const scroll=page.getByTestId('theory-subcategory-scroll');
  const selected=page.getByRole('button',{name:'発達・人生の時間軸で内部分類を絞り込む',exact:true});
  await expect(selected).toHaveAttribute('aria-selected','true');
  await expect.poll(async()=>selected.evaluate(el=>{
    const viewport=el.parentElement!.parentElement!.getBoundingClientRect(),box=el.getBoundingClientRect();return box.left>=viewport.left-2&&box.right<=viewport.right+2;
  })).toBe(true);
  const positions=await tabs.evaluateAll(nodes=>nodes.map(el=>Math.round(el.getBoundingClientRect().y)));
  expect(new Set(positions).size).toBe(1);
  for(const tab of await tabs.all())expect(await tab.evaluate(el=>el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(48);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await selected.focus();await expect(selected).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/subcategory=psychology-n/);
  const count=theories.filter((t:{subcategoryId:string})=>t.subcategoryId==='psychology-n').length;
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(count);
  await page.reload();
  await expect(page.getByRole('button',{name:'脳・学習の基盤で内部分類を絞り込む',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(page.locator('#roku-launch')).toBeHidden();
  await page.screenshot({path:test.info().outputPath(`reel-${width}.png`)});
  const before=await scroll.evaluate(el=>el.scrollLeft);
  const box=await scroll.boundingBox();await page.mouse.move(box!.x+box!.width/2,box!.y+20);await page.mouse.wheel(-900,0);
  await expect.poll(()=>scroll.evaluate(el=>el.scrollLeft)).toBeLessThan(before);
  await page.getByRole('button',{name:'行動科学で理論を絞り込む',exact:true}).click();
  expect(new URL(page.url()).searchParams.get('subcategory')).toBeNull();
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(146);
  await page.goto('/theories?category=classics-thought');
  if(width>=1440)await expect(page.getByRole('button',{name:'次の内部分類を表示',exact:true})).toHaveCount(0);
});

test('PCの移動ボタンは連続して操作でき、完全版の新規本文は匿名に出ない',async({page})=>{
  await page.setViewportSize({width:1440,height:900});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/theories?category=psychology');
  const scroll=page.getByTestId('theory-subcategory-scroll');
  const next=page.getByRole('button',{name:'次の内部分類を表示',exact:true});
  await next.click();await expect.poll(()=>scroll.evaluate(el=>el.scrollLeft)).toBeGreaterThan(100);
  await page.getByRole('button',{name:'前の内部分類を表示',exact:true}).click();
  await expect.poll(()=>scroll.evaluate(el=>el.scrollLeft)).toBeLessThan(10);
  await page.goto('/theory/kb_957');
  await expect(page).toHaveURL(/upgrade/);
  await expect(page.getByTestId('theory-summary')).toHaveCount(0);
});
