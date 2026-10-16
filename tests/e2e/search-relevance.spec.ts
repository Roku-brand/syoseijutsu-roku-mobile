import {test,expect} from '@playwright/test';
import fs from 'node:fs';

const terms=['第一印象','挫折','単純接触効果','交渉','先延ばし','最適化の罠'];
const features=JSON.parse(fs.readFileSync('content/features/manifest.json','utf8')).map((row: any,index: number)=>({
  ...row,title:index===0?'交渉の準備をする':'気づきを得る',lead:index===0?'代替案と条件を整える':'別のテーマ',
  body:index===0?'交渉の条件を考える。交渉の準備に時間を使う。':'固有の検索検証語。',status:'published',
  related_technique_ids:[],related_theory_ids:[],related_feature_ids:[],source_references:[],
}));
test.beforeEach(async({page})=>{
  await page.route('**/rest/v1/**',route=>route.fulfill(route.request().url().includes('/feature_articles')?{json:features}:{status:503,json:{}}));
  await page.route('**/functions/v1/**',route=>route.fulfill({status:503,json:{}}));
});

for(const width of [320,390,1440])test(`six popular searches are complete, readable and open relevant results at ${width}px`,async({page})=>{
  await page.setViewportSize({width,height:950});
  await page.goto('/discover');
  const popular=page.getByTestId('discover-popular');
  await expect(popular.getByRole('button')).toHaveText(terms);
  for(const term of terms){
    const text=popular.getByText(term,{exact:true});
    expect(await text.evaluate(node=>node.scrollWidth<=node.clientWidth+1)).toBe(true);
  }
  await page.screenshot({path:test.info().outputPath(`popular-searches-${width}.png`),fullPage:true,scale:'css'});
  for(const term of terms){
    await popular.getByRole('button',{name:term+'を検索',exact:true}).click();
    expect(new URL(page.url()).searchParams.get('q')).toBe(term);
    await expect(page.getByTestId('search-page-results')).not.toContainText('一致するものはありません');
    if(['単純接触効果','最適化の罠'].includes(term)){
      await expect(page.getByRole('tab',{name:'理論',exact:true})).toHaveAttribute('aria-selected','true');
      await expect(page.getByTestId('search-page-results').getByText(term,{exact:true})).toBeVisible();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.goto('/discover');
  }
});

test('same theory is found by a natural phrase, kana, width and English alias',async({page})=>{
  for(const query of ['単純接触効果','ザイアンス効果','ざいあんす効果','ＭＥＲＥ－ＥＸＰＯＳＵＲＥ　ＥＦＦＥＣＴ']){
    await page.goto('/search?mode=theories&q='+encodeURIComponent(query));
    await expect(page.getByTestId('search-page-results').getByText('単純接触効果',{exact:true})).toBeVisible();
  }
  await page.goto('/search?mode=techniques&q='+encodeURIComponent('第一印象を良くしたい'));
  await expect(page.getByRole('button',{name:'清潔感を意識するを開く',exact:true}).first()).toBeVisible();
});

test('literal title ranks first and weak full-text associations do not become synonyms',async({page})=>{
  await page.goto('/search?mode=theories&q='+encodeURIComponent('最適化の罠'));
  const results=page.getByTestId('search-page-results');
  await expect(results.getByText('最適化の罠',{exact:true})).toBeVisible();
  await page.goto('/search?mode=techniques&q='+encodeURIComponent('交渉'));
  await expect(results.getByRole('button',{name:'沈黙を恐れないを開く',exact:true})).toHaveCount(0);
  await page.getByRole('tab',{name:'特集',exact:true}).click();
  await expect(results.getByTestId('feature-card').first()).toContainText('交渉の準備をする');
  await page.goto('/search?mode=techniques&q='+encodeURIComponent('固有の検索検証語'));
  await expect(results).toContainText('一致するものはありません');
  await results.getByRole('button',{name:/特集の\d+件を見る/}).click();
  await expect(page.getByRole('tab',{name:'特集',exact:true})).toHaveAttribute('aria-selected','true');
  await expect(results.getByTestId('feature-card')).toHaveCount(features.length-1);
});
