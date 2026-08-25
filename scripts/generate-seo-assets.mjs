import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const siteUrl = 'https://shoseijutsuroku.com';
const brand = '処世術禄';
const defaultDescription = '人生をうまく生きるための対人術・仕事術・人生術を、心理学・行動科学・経験則から学べる処世術の辞典。';

const personaMeta = {
  '印象がいい人': ['印象がいい人｜処世術禄', '初対面や日常の関わりで、自然に好印象を残すための処世術を学べます。'],
  '会話がうまい人': ['会話がうまい人｜処世術禄', '話題選び、質問、伝え方を整えて、相手と気持ちよく話すための処世術を学べます。'],
  '聞き上手な人': ['聞き上手な人｜処世術禄', '相手の話を引き出し、安心して話せる関係をつくる聞き方の処世術を学べます。'],
  '信頼される人': ['信頼される人｜処世術禄', '約束、誠実さ、伝え方を整えて、長く信頼されるための処世術を学べます。'],
  '面白い人': ['面白い人｜処世術禄', '場に合う視点と話し方で、相手に楽しい印象を残すための処世術を学べます。'],
  '軽く扱われない人': ['軽く扱われない人｜処世術禄', '境界線と伝え方を整えて、無理なく尊重されるための処世術を学べます。'],
  '頭がいい人': ['頭がいい人｜処世術禄', '考えを整理し、判断の質と伝える力を高めるための仕事術を学べます。'],
  '仕事ができる人': ['仕事ができる人｜処世術禄', '段取り、優先順位、周囲との連携を整えて成果につなげる仕事術を学べます。'],
  '不安に強い人': ['不安に強い人｜処世術禄', '不安を分解し、状況に飲まれず次の一歩を選ぶための人生術を学べます。'],
  '後悔しない人': ['後悔しない人｜処世術禄', '大切な判断の軸を持ち、納得できる選択をするための人生術を学べます。'],
  '立ち直れる人': ['立ち直れる人｜処世術禄', '失敗や停滞から立て直し、次の行動へ進むための人生術を学べます。'],
};

const categoryMeta = {
  interpersonal: ['対人術｜処世術禄', '関係を築き、会話し、集団の中で自然に立ち回るための処世術を学べます。'],
  work: ['仕事術｜処世術禄', '評価、合意、実行を成果につなげるための仕事の処世術を学べます。'],
  life: ['人生術｜処世術禄', '判断軸を持ち、不安やつまずきを越えて生きるための人生術を学べます。'],
};

const topicMeta = {
  'good-impression': ['印象がいい人になる方法｜処世術禄', '第一印象と日々の振る舞いを整え、自然に好印象を残す方法を学べます。'],
  'good-conversation': ['会話がうまい人になる方法｜処世術禄', '質問、相づち、話題の広げ方から会話の基本を学べます。'],
  'build-trust': ['信頼される人になる方法｜処世術禄', '小さな約束と伝え方から、長く信頼される関係をつくる方法を学べます。'],
  'handle-anxiety': ['不安に強くなる方法｜処世術禄', '不安を整理し、考えすぎから行動へ移るための方法を学べます。'],
  'recover-from-setbacks': ['立ち直る方法｜処世術禄', 'つまずきを振り返り、現実的に立て直すための方法を学べます。'],
  'produce-results': ['仕事ができる人の進め方｜処世術禄', '優先順位と段取りを整え、仕事を成果まで進める方法を学べます。'],
};

const relatedByPersona = {
  '印象がいい人': ['会話がうまい人', '聞き上手な人'], '会話がうまい人': ['聞き上手な人', '信頼される人'],
  '聞き上手な人': ['会話がうまい人', '信頼される人'], '信頼される人': ['聞き上手な人', '印象がいい人'],
  '面白い人': ['会話がうまい人', '印象がいい人'], '軽く扱われない人': ['信頼される人', '印象がいい人'],
  '頭がいい人': ['仕事ができる人'], '仕事ができる人': ['頭がいい人'],
  '不安に強い人': ['後悔しない人', '立ち直れる人'], '後悔しない人': ['不安に強い人', '立ち直れる人'],
  '立ち直れる人': ['不安に強い人', '後悔しない人'],
};

const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const routeForFile = (file) => {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  return `/${relative.replace(/\.html$/, '')}`;
};
const canonicalFor = (route) => `${siteUrl}${route === '/' ? '/' : encodeURI(route)}`;

function metadata(route) {
  if (route === '/') return ['処世術禄｜人生・仕事・人間関係のための処世術', defaultDescription, true];
  const persona = route.match(/^\/subcategory\/(interpersonal|work|life)\/(.+)$/);
  if (persona && personaMeta[persona[2]]) return [...personaMeta[persona[2]], true];
  const category = route.match(/^\/category\/(interpersonal|work|life)$/);
  if (category) return [...categoryMeta[category[1]], true];
  const topic = route.match(/^\/topic\/([^/]+)$/);
  if (topic && topicMeta[topic[1]]) return [...topicMeta[topic[1]], true];
  return [`${brand}｜人生・仕事・人間関係の処世術`, defaultDescription, false];
}

function fallback(route, title, description) {
  const persona = route.match(/^\/subcategory\/(interpersonal|work|life)\/(.+)$/);
  const heading = persona ? persona[2] : title.replace(/｜処世術禄$/, '');
  const links = persona ? (relatedByPersona[heading] ?? []).map((name) =>
    `<li><a href="/subcategory/${persona[1]}/${encodeURI(name)}">${escapeHtml(name)}の処世術</a></li>`).join('')
    : '<li><a href="/category/interpersonal">対人術</a></li><li><a href="/category/work">仕事術</a></li><li><a href="/category/life">人生術</a></li>';
  return `<noscript><article><h1>${escapeHtml(heading)}</h1><p>${escapeHtml(description)}</p><h2>関連する処世術</h2><ul>${links}</ul><p><a href="/">処世術禄アプリを使う</a>：人生をうまく生きる方法を、何度でも使える知恵に。</p></article></noscript>`;
}

async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}

const files = await collectHtml(dist);
for (const file of files) {
  const route = routeForFile(file);
  const [title, description, indexable] = metadata(route);
  const canonical = canonicalFor(route);
  let html = await readFile(file, 'utf8');
  html = html.replace(/<title[^>]*>.*?<\/title>/is, `<title>${escapeHtml(title)}</title>`);
  html = html.replace(/<meta name="description"[^>]*>/i, '').replace(/<meta name="robots"[^>]*>/i, '').replace(/<link rel="canonical"[^>]*>/i, '');
  const head = `<meta name="description" content="${escapeHtml(description)}"/><meta name="robots" content="${indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow'}"/><link rel="canonical" href="${escapeHtml(canonical)}"/><meta property="og:type" content="website"/><meta property="og:site_name" content="${brand}"/><meta property="og:title" content="${escapeHtml(title)}"/><meta property="og:description" content="${escapeHtml(description)}"/><meta property="og:url" content="${escapeHtml(canonical)}"/><meta property="og:image" content="${siteUrl}/og.png"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${escapeHtml(title)}"/><meta name="twitter:description" content="${escapeHtml(description)}"/><meta name="twitter:image" content="${siteUrl}/og.png"/>`;
  html = html.replace('</head>', `${head}</head>`).replace('</body>', `${fallback(route, title, description)}</body>`);
  await writeFile(file, html);
}

await writeFile(path.join(dist, 'robots.txt'), await readFile(path.join(root, 'public/robots.txt')));
await writeFile(path.join(dist, 'sitemap.xml'), await readFile(path.join(root, 'public/sitemap.xml')));
console.log(`SEO assets generated for ${files.length} static HTML routes.`);
