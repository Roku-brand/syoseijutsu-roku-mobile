import {test,expect,type Locator} from '@playwright/test';
import fs from 'node:fs';
const theories=JSON.parse(fs.readFileSync('src/data/generated/theories.json','utf8'));
const reelStops=(scroll:Locator)=>scroll.evaluate(el=>[...new Set([0,...Array.from(el.querySelectorAll<HTMLElement>('[data-testid="theory-subcategory-tab"]'),tab=>Math.max(0,Math.min(tab.offsetLeft-2,el.scrollWidth-el.clientWidth))),el.scrollWidth-el.clientWidth])].sort((a,b)=>a-b));
const atStop=(scroll:Locator,stop:number)=>expect.poll(async()=>Math.abs((await scroll.evaluate(el=>el.scrollLeft))-stop)).toBeLessThanOrEqual(2);

for(const width of [320,393,768,1440])test(`内部分類リールの横移動・URL・復元・件数・フォーカス ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/theories');
  await page.getByRole('button',{name:'心理学で理論を絞り込む',exact:true}).click();
  const growth=page.getByRole('button',{name:'自己理解・成長で内部分類を絞り込む',exact:true});
  const track=page.getByTestId('theory-subcategory-scroll');
  // Press an edge tab without moving the track before pointer-up.
  const edgeOffset=await growth.evaluate(el=>{
    const previous=el.previousElementSibling as HTMLElement,viewport=el.parentElement!.parentElement!;
    const offset=Math.min(previous.offsetLeft-2,viewport.scrollWidth-viewport.clientWidth);
    viewport.scrollLeft=offset;return offset;
  });
  await expect.poll(async()=>Math.abs((await track.evaluate(el=>el.scrollLeft))-edgeOffset)).toBeLessThanOrEqual(2);
  const beforePress=(await growth.boundingBox())!;
  const viewport=(await track.boundingBox())!;
  const pressLeft=Math.max(viewport.x,beforePress.x),pressRight=Math.min(viewport.x+viewport.width,beforePress.x+beforePress.width);
  expect(pressRight-pressLeft).toBeGreaterThan(5);
  await page.mouse.move((pressLeft+pressRight)/2,beforePress.y+beforePress.height/2);
  await page.mouse.down();
  await page.evaluate(()=>new Promise<void>(resolve=>{ requestAnimationFrame(()=>resolve()); }));
  const duringPress=(await growth.boundingBox())!;
  await page.mouse.up();
  expect(Math.abs(duringPress.x-beforePress.x)).toBeLessThanOrEqual(2);
  await expect(page).toHaveURL(/subcategory=psychology-s/);
  await expect(page.getByTestId('theory-index-row-card')).toHaveCount(theories.filter((t:{subcategoryId:string})=>t.subcategoryId==='psychology-s').length);
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

for(const width of [768,1440])test(`PCの移動ボタンは端まで1項目ずつ往復する ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/theories?category=psychology');
  const scroll=page.getByTestId('theory-subcategory-scroll');
  const next=page.getByRole('button',{name:'次の内部分類を表示',exact:true});
  await expect(next).toBeVisible();
  const stops=await reelStops(scroll);
  const previous=page.getByRole('button',{name:'前の内部分類を表示',exact:true});
  await expect(previous).toBeDisabled();
  for(const stop of stops.slice(1)){
    await next.click();
    await atStop(scroll,stop);
  }
  await expect(next).toBeDisabled();
  for(const stop of stops.slice(0,-1).reverse()){
    await previous.click();
    await atStop(scroll,stop);
  }
  await expect(previous).toBeDisabled();
  // Moving the reel alone must not change the filter.
  expect(new URL(page.url()).searchParams.get('subcategory')).toBeNull();
});

for(const width of [320,393,768,1440])test(`長いスワイプとトラックパッドの慣性も1項目で止まる ${width}px`,async({page,context})=>{
  await page.setViewportSize({width,height:900});
  await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/theories?category=psychology');
  await expect(page.locator('#roku-launch')).toBeHidden();
  await page.evaluate(()=>document.fonts.ready);
  const scroll=page.getByTestId('theory-subcategory-scroll');
  const stops=await reelStops(scroll),box=(await scroll.boundingBox())!;
  const session=await context.newCDPSession(page);
  const y=box.y+box.height/2,left=box.x+30,right=box.x+box.width-30;
  const swipe=async(x1:number,y1:number,x2:number,y2:number,cancel=false)=>{
    const offsets:number[]=[];
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x1,y:y1}]});
    for(let i=1;i<=10;i++){
      await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x1+(x2-x1)*i/10,y:y1+(y2-y1)*i/10}]});
      await page.evaluate(()=>new Promise<void>(resolve=>{ requestAnimationFrame(()=>resolve()); }));
      offsets.push(await scroll.evaluate(el=>el.scrollLeft));
    }
    await session.send('Input.dispatchTouchEvent',{type:cancel?'touchCancel':'touchEnd',touchPoints:[]});
    return offsets;
  };
  for(let i=1;i<=3;i++){
    const offsets=await swipe(right,y,left,y);
    await atStop(scroll,stops[i]);
    expect(Math.max(...offsets)).toBeLessThanOrEqual(stops[i]+2);
  }
  for(let i=2;i>=0;i--){
    const offsets=await swipe(left,y,right,y);
    await atStop(scroll,stops[i]);
    expect(Math.min(...offsets)).toBeGreaterThanOrEqual(stops[i]-2);
  }
  await swipe(right,y,right-22,y);await atStop(scroll,0);
  await swipe(right,y,left,y,true);await atStop(scroll,0);
  // A wheel burst, including its decaying tail, advances just one item.
  await page.mouse.move((left+right)/2,y);
  for(const delta of [900,500,120,20]){
    await page.mouse.wheel(delta,0);
    await page.waitForTimeout(40);
  }
  await atStop(scroll,stops[1]);
  await page.waitForTimeout(220);
  await page.mouse.wheel(900,0);await atStop(scroll,stops[2]);
  await page.waitForTimeout(220);
  await page.mouse.wheel(-900,0);await atStop(scroll,stops[1]);
  await page.waitForTimeout(220);
  await page.keyboard.down('Shift');await page.mouse.wheel(0,900);await page.keyboard.up('Shift');
  await atStop(scroll,stops[2]);
  expect(new URL(page.url()).searchParams.get('subcategory')).toBeNull();
  await expect(page.getByRole('button',{name:'すべてで内部分類を絞り込む',exact:true})).toHaveAttribute('aria-selected','true');
  // A vertical gesture starting on the reel must scroll the surrounding page.
  await scroll.evaluate(el=>{for(let p=el.parentElement;p;p=p.parentElement)if(p.scrollHeight>p.clientHeight+50&&['auto','scroll'].includes(getComputedStyle(p).overflowY)){p.dataset.qaVertical='true';break;}});
  const vertical=page.locator('[data-qa-vertical]');
  const before=await vertical.evaluate(el=>el.scrollTop);
  await swipe((left+right)/2,y,(left+right)/2,y-140);
  await expect.poll(()=>vertical.evaluate(el=>el.scrollTop)).toBeGreaterThan(before+40);
  await atStop(scroll,stops[2]);
  await expect(page).toHaveURL(/\/theories\?category=psychology$/);
});

test('完全版の新規本文は匿名に出ない',async({page})=>{
  await page.route('**/rest/v1/**',r=>r.fulfill({status:503,json:{}}));
  await page.goto('/theory/kb_957');
  await expect(page).toHaveURL(/upgrade/);
  await expect(page.getByTestId('theory-summary')).toHaveCount(0);
});
