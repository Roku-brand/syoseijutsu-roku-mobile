import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const siteUrl = 'https://shoseijutsuroku.com';
const brand = '処世術禄';
const homeTitle = '処世術禄｜人生をうまく生きる方法を、すべての人へ。';
const homeDescription = '聞いたことがある、で終わらせない。心理学・行動科学などの理論と紐づけ、体系化した処世術を、人生・仕事・人間関係に使える知恵として届けます。';
const image = `${siteUrl}/og.png`;

const techniqueSource = JSON.parse(await readFile(path.join(root, 'src/data/generated/techniques.public.json'), 'utf8'));
const theories = JSON.parse(await readFile(path.join(root, 'src/data/generated/theories.public.json'), 'utf8'));
const categories = techniqueSource.categories;
const techniques = categories.flatMap((category) => category.subcategories.flatMap((persona) => persona.items.map((item) => ({
  ...item, categoryKey: category.key, categoryName: category.name, persona: persona.name,
}))));
const techniqueById = new Map(techniques.map((item) => [item.id, item]));
const theoryById = new Map(theories.map((item) => [item.tagId, item]));
const isPublicTechnique = (item) => Boolean(item && item.status !== 'locked' && item.title !== '完全版の処世術' && item.explanation);
const isPublicTheory = (item) => Boolean(item && item.title !== '完全版の理論' && item.summary);

const categoryCopy = {
  interpersonal: ['対人術', '人間関係・会話・印象・信頼を整え、相手と自然に関係を築くための処世術を体系から探せます。'],
  work: ['仕事術', '評価・合意形成・実行・キャリアを成果へつなげる、仕事の処世術を体系から探せます。'],
  life: ['人生術', '意思決定の軸を持ち、不安やつまずきを越えて人生を整える処世術を体系から探せます。'],
};
const topicCopy = {
  'good-impression': ['印象がいい人になる方法', '第一印象、親しみやすさ、感じのよさを整える処世術を、関連する理論とともに学べます。'],
  'good-conversation': ['会話がうまい人になる方法', '会話を始め、深め、心地よく終えるための処世術を、場面に沿って学べます。'],
  'build-trust': ['信頼を築く方法', '小さな行動から長く残る信頼を築くための処世術を、関連する理論とともに学べます。'],
  'maintain-relationships': ['人間関係を長続きさせる方法', '近づきすぎず離れすぎず、人間関係を守り育てるための処世術を学べます。'],
  'avoid-exhaustion': ['人間関係で消耗しない方法', '境界線を保ち、不要な摩耗を避けながら関係を整えるための処世術を学べます。'],
  'read-people': ['人を見極める方法', '言葉だけでなく行動と利害から相手を見るための処世術を学べます。'],
  'navigate-groups': ['集団でうまく立ち回る方法', '場の空気、立場、役割を読みながら集団で動くための処世術を学べます。'],
  'command-respect': ['軽く扱われないための方法', '攻撃的にならず、境界線と伝え方で尊重されるための処世術を学べます。'],
  'move-groups': ['集団を動かす方法', '目的・役割・意思決定を整え、チームを前へ進める処世術を学べます。'],
  'work-well': ['仕事ができる人の進め方', '成果、段取り、信頼を仕事の評価へつなぐための処世術を学べます。'],
  'advance-career': ['キャリアを前へ進める方法', '実力を機会と役割へ変え、キャリアを前へ進めるための処世術を学べます。'],
  'negotiate-well': ['交渉をうまく進める方法', '条件、代替案、相手の利害を読み、納得できる合意をつくる処世術を学べます。'],
  'build-consensus': ['合意形成をうまく進める方法', '対立をほどき、関係者が動ける着地点をつくる処世術を学べます。'],
  'get-started': ['迷わず始める方法', '迷いや準備過多を越えて、最初の一歩を出すための処世術を学べます。'],
  'keep-going': ['行動を続ける方法', '意志の強さだけに頼らず、行動を続ける仕組みをつくる処世術を学べます。'],
  'produce-results': ['成果を出す方法', '努力を分散させず、仕事を結果へ結びつけるための処世術を学べます。'],
  'fulfill-life': ['人生を充実させる方法', '日々の選択から、自分が納得できる人生をつくるための処世術を学べます。'],
  'design-life': ['人生設計を整える方法', '長い時間軸で進路と選択肢を整え、納得できる人生を選ぶ処世術を学べます。'],
  'handle-anxiety': ['不安に強くなる方法', '不確実さを抱えたまま、必要な行動を選ぶための処世術を学べます。'],
  'recover-from-setbacks': ['挫折から立ち直る方法', 'つまずきを最終判決にせず、次の一手へつなぐための処世術を学べます。'],
  'make-luck': ['運を機会へ変える方法', '偶然を拾える位置に身を置き、機会へ変えるための処世術を学べます。'],
};

const clean = (value = '') => String(value).replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const truncate = (value, max = 155) => [...clean(value)].length <= max ? clean(value) : `${[...clean(value)].slice(0, max - 1).join('')}…`;
const escape = (value = '') => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
const decode = (value) => { try { return decodeURIComponent(value); } catch { return value; } };
const encodeRoute = (route) => {
  const [pathname, query] = route.split('?');
  const encodedPathname = pathname.split('/').map((part) => encodeURIComponent(decode(part))).join('/');
  return query ? `${encodedPathname}?${new URLSearchParams(query).toString()}` : encodedPathname;
};
const canonical = (route) => `${siteUrl}${route === '/' ? '/' : encodeRoute(route)}`;
const crumb = (name, route) => ({ name, route });
const baseMeta = (route) => ({ route, canonicalRoute: route, title: `${brand}｜人生・仕事・人間関係の処世術`, description: homeDescription, indexable: false, type: 'website', pageType: 'WebPage', crumbs: [crumb('ホーム', '/')] });

function metaFor(rawRoute) {
  const route = decode(rawRoute.replace(/\/$/, '') || '/');
  const base = baseMeta(route);
  if (route === '/') return { ...base, title: homeTitle, indexable: true };
  if (route === '/404' || route === '/+not-found') return { ...base, title: `ページが見つかりません｜${brand}`, description: 'お探しのページは移動または削除された可能性があります。処世術禄のホームから目的の処世術や理論を探せます。' };
  if (route === '/catalog') return { ...base, canonicalRoute: '/discover', title: `処世術を探す｜${brand}`, description: '悩み、人物像、対人術・仕事術・人生術の体系から、今の自分に必要な処世術を探せます。', crumbs: [crumb('ホーム', '/'), crumb('処世術を探す', '/discover')] };
  const fixed = {
    '/discover': ['処世術を探す', '悩み、人物像、対人術・仕事術・人生術の体系から、今の自分に必要な処世術を探せます。'],
    '/personas': ['人物像から処世術を探す', '対人術・仕事術・人生術の人物像から、目指したい姿に結びつく処世術を体系的に探せます。'],
    '/theories': ['心理学・行動科学などの理論一覧', '心理学、行動科学、組織・経営、戦略、古典・思想、経験則を、実践できる処世術とのつながりから探せます。'],
    '/learn': ['場面から処世術を学ぶ', '人間関係・仕事・人生の具体的な場面から一手を選び、処世術と理論を実践につなげて学べます。'],
    '/legal/about': ['処世術禄について', '人物像から処世術、理論、実践へつなぐ知識体系「処世術禄」の考え方と運営方針を紹介します。'],
    '/legal/faq': ['よくある質問', '処世術禄の使い方、無料版と完全版、データの保存や利用環境についてのよくある質問です。'],
  };
  if (fixed[route]) return { ...base, title: `${fixed[route][0]}｜${brand}`, description: fixed[route][1], indexable: true, crumbs: [crumb('ホーム', '/'), crumb(fixed[route][0], route)] };
  const personaMatch = route.match(/^\/subcategory\/(interpersonal|work|life)\/(.+)$/);
  if (personaMatch) {
    const category = categories.find((item) => item.key === personaMatch[1]);
    const persona = category?.subcategories.find((item) => item.name === personaMatch[2]);
    const visible = persona?.items.filter(isPublicTechnique) ?? [];
    if (!persona || visible.length === 0) return base;
    const label = categoryCopy[personaMatch[1]][0];
    return { ...base, title: `${persona.articleTitle ?? persona.name}になるための処世術｜${brand}`, description: `${persona.name}を形づくる${visible.length}の処世術を、考え方・実践・関連理論から体系的に学べます。`, indexable: true, persona, crumbs: [crumb('探す', '/discover'), crumb(label, `/personas?category=${personaMatch[1]}`), crumb(persona.name, route)] };
  }
  const cardMatch = route.match(/^\/card\/([^/]+)$/);
  if (cardMatch) {
    const item = techniqueById.get(cardMatch[1]);
    if (!isPublicTechnique(item)) return base;
    return { ...base, title: `${item.title}｜${item.persona}の処世術｜${brand}`, description: truncate(`${item.essence ?? item.subtitle ?? item.explanation} ${item.persona}に役立つ原理、実践、注意点、関連理論を解説します。`), indexable: true, type: 'article', pageType: 'CreativeWork', item, crumbs: [crumb('探す', '/discover'), crumb(item.categoryName, `/personas?category=${item.categoryKey}`), crumb(item.persona, `/subcategory/${item.categoryKey}/${item.persona}`), crumb(item.title, route)] };
  }
  const theoryMatch = route.match(/^\/theory\/([^/]+)$/);
  if (theoryMatch) {
    const item = theoryById.get(theoryMatch[1]);
    if (!isPublicTheory(item)) return base;
    return { ...base, title: `${item.title}とは？意味と処世術への活かし方｜${brand}`, description: truncate(`${item.summary} 関連する処世術と実践へのつながりを紹介します。`), indexable: true, type: 'article', pageType: 'Article', item, crumbs: [crumb('探す', '/discover'), crumb('理論', '/theories'), crumb(item.categoryTitle, `/theories?category=${item.categoryId}`), crumb(item.title, route)] };
  }
  const topic = route.match(/^\/topic\/([^/]+)$/);
  if (topic && topicCopy[topic[1]]) {
    const [label, description] = topicCopy[topic[1]];
    return { ...base, title: `${label}｜${brand}`, description, indexable: true, crumbs: [crumb('ホーム', '/'), crumb('処世術を探す', '/discover'), crumb(label, route)] };
  }
  return base;
}

function jsonLd(meta) {
  const url = canonical(meta.canonicalRoute);
  const graph = [
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: `${siteUrl}/`, name: brand, alternateName: homeTitle, inLanguage: 'ja', publisher: { '@id': `${siteUrl}/#organization` } },
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: brand, url: `${siteUrl}/`, logo: { '@type': 'ImageObject', url: `${siteUrl}/pwa-icon-512.png`, width: 512, height: 512 } },
    { '@type': meta.pageType, '@id': `${url}#webpage`, url, name: meta.title, description: meta.description, inLanguage: 'ja', isPartOf: { '@id': `${siteUrl}/#website` }, breadcrumb: { '@id': `${url}#breadcrumb` } },
    { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: meta.crumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: canonical(item.route) })) },
  ];
  if (meta.pageType === 'CreativeWork') graph.push({ '@type': 'CreativeWork', '@id': `${url}#creativework`, headline: meta.item.title, description: meta.description, inLanguage: 'ja', about: [meta.item.categoryName, meta.item.persona, ...(meta.item.tags ?? [])], isPartOf: { '@id': `${siteUrl}/#website` } });
  if (meta.pageType === 'Article') graph.push({ '@type': 'Article', '@id': `${url}#article`, headline: meta.item.title, description: meta.item.summary, inLanguage: 'ja', mainEntityOfPage: { '@id': `${url}#webpage` }, publisher: { '@id': `${siteUrl}/#organization` } });
  return JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replaceAll('<', '\\u003c');
}

function head(meta) {
  const url = canonical(meta.canonicalRoute);
  const robots = meta.indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow';
  return `<title>${escape(meta.title)}</title><meta name="description" content="${escape(meta.description)}"/><meta name="robots" content="${robots}"/><link rel="canonical" href="${escape(url)}"/><meta property="og:locale" content="ja_JP"/><meta property="og:type" content="${meta.type}"/><meta property="og:site_name" content="${brand}"/><meta property="og:title" content="${escape(meta.title)}"/><meta property="og:description" content="${escape(meta.description)}"/><meta property="og:url" content="${escape(url)}"/><meta property="og:image" content="${image}"/><meta property="og:image:width" content="1200"/><meta property="og:image:height" content="630"/><meta property="og:image:alt" content="${escape(`${meta.title}の共有画像`)}"/><meta name="twitter:card" content="summary_large_image"/><meta name="twitter:title" content="${escape(meta.title)}"/><meta name="twitter:description" content="${escape(meta.description)}"/><meta name="twitter:image" content="${image}"/><meta name="twitter:image:alt" content="${escape(`${meta.title}の共有画像`)}"/><script type="application/ld+json" data-seo-jsonld="true">${jsonLd(meta)}</script>`;
}

const breadcrumbs = (meta) => `<nav aria-label="パンくずリスト"><ol>${meta.crumbs.map((item, index) => `<li>${index < meta.crumbs.length - 1 ? `<a href="${encodeRoute(item.route)}">${escape(item.name)}</a>` : `<span aria-current="page">${escape(item.name)}</span>`}</li>`).join('')}</ol></nav>`;
function staticContent(meta) {
  if (!meta.indexable) return meta.route === '/404' || meta.route === '/+not-found' ? '<noscript><main><article><h1>ページが見つかりません</h1><p>URLをご確認いただくか、<a href="/">処世術禄のホーム</a>へ戻ってください。</p></article></main></noscript>' : '';
  let body = `<p>${escape(meta.description)}</p>`;
  if (meta.pageType === 'CreativeWork') {
    const paragraphs = String(meta.item.explanation).split(/\n\s*\n/).map(clean).filter(Boolean);
    body = `<section><h2>本質</h2><p>${escape(clean(meta.item.essence ?? meta.item.subtitle ?? paragraphs[0]))}</p></section><section><h2>原理と解説</h2>${paragraphs.map((text) => `<p>${escape(text)}</p>`).join('')}</section>`;
    const related = (meta.item.relatedTheoryIds ?? meta.item.theoryTagIds ?? []).map((id) => theoryById.get(id)).filter(isPublicTheory);
    if (related.length) body += `<section><h2>関連する理論</h2><ul>${related.map((item) => `<li><a href="/theory/${encodeURIComponent(item.tagId)}">${escape(item.title)}</a></li>`).join('')}</ul></section>`;
  } else if (meta.pageType === 'Article') {
    const related = techniques.filter((item) => isPublicTechnique(item) && (item.relatedTheoryIds ?? item.theoryTagIds ?? []).includes(meta.item.tagId)).slice(0, 8);
    body = `<section><h2>概要</h2><p>${escape(meta.item.summary)}</p></section>${related.length ? `<section><h2>この理論に関連する処世術</h2><ul>${related.map((item) => `<li><a href="/card/${encodeURIComponent(item.id)}">${escape(item.title)}</a></li>`).join('')}</ul></section>` : ''}`;
  } else if (meta.persona) {
    body += `<section><h2>この人物像を形づくる処世術</h2><ul>${meta.persona.items.filter(isPublicTechnique).map((item) => `<li><a href="/card/${encodeURIComponent(item.id)}">${escape(item.title)}</a></li>`).join('')}</ul></section>`;
  } else body += '<section><h2>体系から探す</h2><ul><li><a href="/personas?category=interpersonal">対人術</a></li><li><a href="/personas?category=work">仕事術</a></li><li><a href="/personas?category=life">人生術</a></li><li><a href="/theories">心理学・行動科学などの理論</a></li><li><a href="/learn">場面から学ぶ</a></li></ul></section>';
  const heading = meta.title.replace(/｜処世術禄.*$/, '').replace(/｜人生を.*$/, '');
  return `<noscript><main>${breadcrumbs(meta)}<article><h1>${escape(heading)}</h1>${body}</article></main></noscript>`;
}

function strip(html) {
  return html.replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '').replace(/<meta\b(?=[^>]*(?:name|property)=["'](?:description|robots|og:[^"']+|twitter:[^"']+)["'])[^>]*>/gi, '').replace(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*>/gi, '').replace(/<script\b(?=[^>]*type=["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<noscript><main[\s\S]*?<\/main><\/noscript>/gi, '');
}
async function htmlFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await htmlFiles(file));
    else if (entry.name.endsWith('.html')) files.push(file);
  }
  return files;
}
function routeFor(file) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -11)}`;
  return `/${relative.replace(/\.html$/, '')}`;
}

const files = await htmlFiles(dist);
const indexable = new Set();
for (const file of files) {
  const route = routeFor(file);
  const meta = metaFor(route);
  let html = strip(await readFile(file, 'utf8'));
  html = html.replace('</head>', `${head(meta)}</head>`).replace('</body>', `${staticContent(meta)}</body>`);
  await writeFile(file, html);
  if (meta.indexable && !route.includes('[')) indexable.add(meta.route);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...indexable].sort((a, b) => a.localeCompare(b, 'ja')).map((route) => `  <url><loc>${escape(canonical(route))}</loc></url>`).join('\n')}\n</urlset>\n`;
await writeFile(path.join(root, 'public/sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'sitemap.xml'), sitemap);
await writeFile(path.join(dist, 'robots.txt'), await readFile(path.join(root, 'public/robots.txt')));

// Also emit directory indexes so clean detail URLs work on static hosts that
// do not apply GitHub Pages' extensionless HTML resolution.
for (const route of indexable) {
  if (route === '/') continue;
  try {
    const source = await readFile(path.join(dist, `${route.slice(1)}.html`));
    const directory = path.join(dist, route.slice(1));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, 'index.html'), source);
  } catch { /* Expo may already have emitted a directory index. */ }
}

console.log(`SEO generated for ${files.length} routes; sitemap contains ${indexable.size} indexable URLs.`);
