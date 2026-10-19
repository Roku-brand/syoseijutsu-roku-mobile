import { expect, test, type Page } from '@playwright/test';

async function account(page: Page, waitForProfile?: Promise<void>) {
  const user={id:'00000000-0000-4000-8000-000000000021',aud:'authenticated',role:'authenticated',email:'profile-qa@example.invalid',app_metadata:{},user_metadata:{},created_at:'2026-01-01T00:00:00Z'};
  const payload=Buffer.from(JSON.stringify({sub:user.id,role:'authenticated',exp:4102444800})).toString('base64url');
  const session={access_token:`eyJhbGciOiJIUzI1NiJ9.${payload}.test`,refresh_token:'test-refresh',token_type:'bearer',expires_at:4102444800,expires_in:3600,user};
  const project=new URL(process.env.EXPO_PUBLIC_SUPABASE_URL??'https://example.supabase.co').hostname.split('.')[0];
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:`sb-${project}-auth-token`,value:session});
  let savedName='元の名前';
  let failNext=false;
  const writes: Record<string, unknown>[]=[];
  await page.route('**/auth/v1/**',route=>route.fulfill({json:user}));
  await page.route('**/rest/v1/**',async route=>{
    if(!route.request().url().includes('/profiles')) return route.fulfill({json:route.request().url().includes('/content_revision')?{revision:1}:[]});
    if(route.request().method()==='POST') {
      writes.push(route.request().postDataJSON());
      if(failNext) {failNext=false;return route.fulfill({status:503,json:{message:'一時的な通信エラー'}});}
      savedName=String(writes.at(-1)!.display_name);
      return route.fulfill({status:201,body:''});
    }
    await waitForProfile;
    return route.fulfill({json:{role:'user',display_name:savedName,avatar_url:null}});
  });
  await page.route('**/functions/v1/**',route=>route.fulfill({json:{access:'free'}}));
  return {writes,failNext:()=>{failNext=true;}};
}

for(const width of [320,375,430]) test(`表示名はキーボード相当の高さでも隠れず、拡大を招く小さな文字を使わない ${width}px`,async({page})=>{
  await account(page);
  await page.setViewportSize({width,height:844});
  await page.goto('/my-os');
  await expect(page.getByTestId('profile-principle-card').getByRole('button',{name:'設定を開く',exact:true})).toHaveCount(0);
  await page.getByRole('button',{name:'プロフィールを編集',exact:true}).last().click();
  const input=page.getByRole('textbox',{name:'表示名',exact:true});
  await expect(input).toHaveValue('元の名前');
  await input.tap();
  await page.setViewportSize({width,height:390});
  await expect.poll(async()=>{
    const rect=await input.boundingBox();
    return rect!==null&&rect.y>=0&&rect.y+rect.height<=390;
  }).toBe(true);
  expect(await input.evaluate(el=>parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(16);
  expect(await page.locator('meta[name="viewport"]').getAttribute('content')).not.toMatch(/maximum-scale|user-scalable=no/);
  await page.screenshot({path:test.info().outputPath(`profile-compact-${width}.png`)});
});

test('遅いプロフィール取得や日本語変換で入力を巻き戻さず、保存エラー後も再試行できる',async({page})=>{
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>{release=resolve;});
  const state=await account(page,pending);
  await page.goto('/settings/profile');
  const input=page.getByRole('textbox',{name:'表示名',exact:true});
  await input.fill('学びの記録');
  await input.dispatchEvent('compositionstart',{data:''});
  await input.fill('学びの記録・つばさ');
  release();
  await input.dispatchEvent('compositionend',{data:'つばさ'});
  await expect(input).toHaveValue('学びの記録・つばさ');
  state.failNext();
  await page.getByRole('button',{name:'プロフィールを保存',exact:true}).click();
  await expect(page.getByText('一時的な通信エラー',{exact:true})).toBeVisible();
  await expect(input).toHaveValue('学びの記録・つばさ');
  await page.getByRole('button',{name:'プロフィールを保存',exact:true}).click();
  await expect(page.getByText('プロフィールを保存しました。',{exact:true})).toBeVisible();
  expect(state.writes.at(-1)).toMatchObject({display_name:'学びの記録・つばさ'});
  await page.reload();
  await expect(input).toHaveValue('学びの記録・つばさ');
  await input.fill('あ'.repeat(25));
  await page.getByRole('button',{name:'プロフィールを保存',exact:true}).click();
  await expect(page.getByText('表示名は24文字以内にしてください。',{exact:true})).toBeVisible();
  expect(state.writes).toHaveLength(2);
});
