// Store artwork uses real app captures. Only the supplied status-bar pixels
// are edited; no app content is generated or reconstructed.
import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { chromium } from '@playwright/test';

const root = path.resolve('store/app-store/v1.0.3');
const source = path.join(root, 'source');
const output = path.join(root, 'iphone-6.5');
await fs.mkdir(output, { recursive: true });
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const data = async file => `data:image/png;base64,${(await fs.readFile(file)).toString('base64')}`;
const original = await sharp(path.join(source, '04-happenstance-user.jpg')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const edited = await sharp(path.join(source, '04-status-edit.png')).resize(original.info.width, original.info.height, { fit: 'fill' }).removeAlpha().raw().toBuffer();
const normalized = Buffer.from(original.data);
const regions = [{ left: 61, top: 21, width: 80, height: 36 }, { left: 503, top: 23, width: 54, height: 33 }];
const mask = new Uint8Array(original.info.width * original.info.height);
for (const r of regions) for (let y = r.top; y < r.top + r.height; y++) for (let x = r.left; x < r.left + r.width; x++) {
  const pixel = y * original.info.width + x;
  const edge = Math.min(x - r.left, r.left + r.width - 1 - x, y - r.top, r.top + r.height - 1 - y);
  const alpha = Math.min(1, edge / 3);
  mask[pixel] = 1;
  for (let c = 0; c < 3; c++) normalized[pixel * 3 + c] = Math.round(original.data[pixel * 3 + c] * (1 - alpha) + edited[pixel * 3 + c] * alpha);
}
let changedPixels = 0, outsideStatusChangedPixels = 0;
for (let p = 0; p < mask.length; p++) if ([0, 1, 2].some(c => normalized[p * 3 + c] !== original.data[p * 3 + c])) { changedPixels++; if (!mask[p]) outsideStatusChangedPixels++; }
if (outsideStatusChangedPixels) throw Error('App screenshot content was changed');
await sharp(normalized, { raw: original.info }).png().toFile(path.join(source, '04-happenstance-normalized.png'));
await fs.writeFile(path.join(root, 'status-edit-proof.json'), JSON.stringify({ source: 'User supplied iPhone screenshot', originalSha256: hash(await fs.readFile(path.join(source, '04-happenstance-user.jpg'))), method: 'Built-in imagegen status edit, isolated patches composited onto original decoded pixels', prompt: 'Change only the top iOS time to 9:41 and battery to fully charged; preserve app content.', time: '9:41', battery: '100%', regions, changedPixels, outsideStatusChangedPixels }, null, 2) + '\n');
if (process.argv.includes('--status-only')) { console.log('Normalized user screenshot; app content unchanged.'); process.exit(0); }

let files = [
  { file: '01-brand.png', type: 'brand', heading: '処世術の専門メディア' },
  { file: '02-home.png', source: '02-home-guest.png', type: 'home', heading: '毎日10分\nすきま時間に読める。', sub: '対人術・仕事術・人生術を、日々の知恵に。' },
  { file: '03-technique.png', source: '03-farewell-guest.png', heading: 'すぐ読める。\n日々に使える。', sub: '人間関係や仕事のヒントを、短いカードで。', label: '処世術', subject: '名残惜しいくらいで去る' },
  { file: '04-theory.png', source: '04-happenstance-normalized.png', heading: '「なぜそうなるか」\nまで、わかる。', sub: '心理学から古典まで。関連する知識もたどれる。', label: '理論', subject: '計画された偶発性理論', account: 'User-supplied signed-in screenshot' },
  { file: '05-feature.png', source: '05-age-guest.png', heading: 'ふかぼり記事を\n多数収録！', sub: '人間関係や人生の問いを、じっくり読み解く。', label: '特集', subject: 'なぜ私たちは、年齢に焦るのか' },
  { file: '06-learn.png', source: '06-learning-guest.png', heading: '読んだ知識を、\n使える理解へ。', sub: '場面に合わせて選び、解説で振り返る。', label: '学ぶ', subject: '助言する？ 聞く？' },
  { file: '07-personalize.png', source: '07-library-guest.png', secondary: '07-personal-guest.png', heading: 'パーソナライズ\n機能充実！', sub: '保存して整理。自分の処世術も作れる。', label: 'マイページ' },
];
if (process.argv.includes('--preview')) {
  const available = await Promise.all(files.map(async item => {
    try { if (item.source) await fs.access(path.join(source, item.source)); if (item.secondary) await fs.access(path.join(source, item.secondary)); return true; }
    catch { return false; }
  }));
  files = files.filter((_, i) => available[i]);
}
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1242, height: 2688 }, deviceScaleFactor: 1 });
  const brand = await data(path.join(source, '01-brand-original.png'));
  // Reuse the original sunset cityscape at its original scale. The two-image
  // introduction remains brand first, current Home screen second.
  const city = await sharp(path.join(source, '01-brand-original.png')).extract({ left: 0, top: 1710, width: 1242, height: 978 }).png().toBuffer();
  const cityData = `data:image/png;base64,${city.toString('base64')}`;
  for (const item of files) {
    const shot = item.source ? await data(path.join(source, item.source)) : '';
    const second = item.secondary ? await data(path.join(source, item.secondary)) : '';
    const heading = item.heading.split('\n').join('<br>');
    const phone = `<div class="phone ${item.secondary ? 'library' : ''}"><img src="${shot}"></div>`;
    const body = item.type === 'brand'
      ? `<img class="brand" src="${brand}"><div class="free">無料公開あり <span>｜</span> 広告なし</div>`
      : `<div class="art ${item.type === 'home' ? 'home' : ''}">${item.type === 'home' ? `<img class="city" src="${cityData}">` : ''}<div class="head"><div class="eyebrow">処世術禄 ${item.label ? `<span>／ ${item.label}</span>` : ''}</div><h1>${heading}</h1><p>${item.sub}</p></div>${phone}${item.secondary ? `<div class="inset-label">自分の処世術も</div><div class="phone inset"><img src="${second}"></div>` : ''}<div class="footer">SHOSEIJUTSU ROKU</div></div>`;
    await page.setContent(`<!doctype html><html lang="ja"><meta charset="utf-8"><style>
      *{box-sizing:border-box}html,body{margin:0;width:1242px;height:2688px;overflow:hidden;color:#171712;background:#faf9f5}body{font-family:"Yu Gothic",Meiryo,sans-serif}.brand{width:1242px;height:2688px;display:block}.free{position:absolute;bottom:104px;left:130px;border:1px solid rgba(238,213,167,.7);background:rgba(20,20,16,.65);color:#fff9e9;border-radius:40px;padding:19px 38px;font-size:34px;letter-spacing:3px}.free span{color:#dfbd7e;margin:0 10px}.art{position:relative;width:100%;height:100%;background:radial-gradient(ellipse at 100% 85%,#ece7dc 0,transparent 58%),#faf9f5}.head{position:absolute;top:105px;left:91px;right:70px;z-index:2}.eyebrow{color:#9b7437;font-size:29px;letter-spacing:5px;font-weight:600;margin-bottom:30px}.eyebrow span{font-size:24px;letter-spacing:3px}h1{font-family:"Yu Mincho","Hiragino Mincho ProN",serif;font-weight:600;font-size:101px;line-height:1.28;letter-spacing:1px;margin:0}p{font-size:35px;line-height:1.6;color:#514c43;margin:27px 0 0;letter-spacing:1px}.phone{position:absolute;top:650px;left:158px;width:926px;padding:13px;border:3px solid #746f66;border-radius:65px;background:#1c1d1b;box-shadow:0 30px 60px #312c242b;overflow:hidden}.phone img{display:block;width:100%;height:auto;border-radius:49px}.footer{position:absolute;bottom:17px;width:100%;text-align:center;letter-spacing:5px;font-size:16px;color:#8e816b}.home{background:#eee9df}.home .city{position:absolute;left:0;bottom:0;width:1242px;height:978px}.home .phone{transform:rotate(-2deg);top:650px;left:155px}.home .head{top:105px}.library{width:820px;left:85px;top:680px}.inset{width:420px;left:749px;top:1660px;border-radius:40px;padding:8px;box-shadow:0 15px 40px #192f2540}.inset img{border-radius:28px}.inset-label{position:absolute;left:763px;top:1580px;font-size:29px;color:#215e50;background:#faf9f5;padding:10px 19px;border:1px solid #b7c9be;border-radius:24px;z-index:3}
      </style><body>${body}</body></html>`);
    await page.evaluate(async () => { await document.fonts.ready; await Promise.all([...document.images].map(img => img.decode())); });
    await page.screenshot({ path: path.join(output, item.file) });
    await sharp(path.join(output, item.file)).removeAlpha().png({ compressionLevel: 9 }).toFile(path.join(output, '.rgb-' + item.file));
    await fs.rename(path.join(output, '.rgb-' + item.file), path.join(output, item.file));
    const md = await sharp(path.join(output, item.file)).metadata();
    if (md.width !== 1242 || md.height !== 2688 || md.hasAlpha) throw Error('Invalid store artwork');
    item.sha256 = hash(await fs.readFile(path.join(output, item.file)));
    if (item.source) item.sourceSha256 = hash(await fs.readFile(path.join(source, item.source)));
    if (item.secondary) item.secondarySha256 = hash(await fs.readFile(path.join(source, item.secondary)));
    item.md5 = crypto.createHash('md5').update(await fs.readFile(path.join(output, item.file))).digest('hex');
    item.account ??= 'Guest / signed out';
    console.log('Composed ' + item.file);
  }
} finally { await browser.close(); }
const tiles = await Promise.all(files.map(async (item, i) => ({ input: await sharp(path.join(output, item.file)).resize(310, 671).png().toBuffer(), left: i * 310, top: 0 })));
await sharp({ create: { width: files.length * 310, height: 671, channels: 3, background: '#faf9f5' } }).composite(tiles).png().toFile(path.join(root, 'overview.png'));
await fs.writeFile(path.join(root, 'manifest.json'), JSON.stringify({ date: '2026-10-17', version: '1.0.3', build: '32', dimensions: [1242, 2688], displayType: 'APP_IPHONE_65', time: '9:41', battery: '100%', capture: 'Latest native app guest captures, except the user-supplied signed-in theory screenshot', files }, null, 2) + '\n');
