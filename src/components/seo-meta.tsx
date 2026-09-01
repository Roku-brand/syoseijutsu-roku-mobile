import { usePathname } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Platform } from 'react-native';
import { categories, techniqueById, theoryById } from '@/data/catalog';
import { guidedTopicBySlug } from '@/data/guided-topics';
import { isLockedTheoryShell } from '@/data/theory-display';

const siteUrl = 'https://shoseijutsuroku.com';
const brand = '処世術禄';
const homeTitle = '処世術禄｜人生をうまく生きる方法を、すべての人へ。';
const homeDescription = '聞いたことがある、で終わらせない。心理学・行動科学などの理論と紐づけ、体系化した処世術を、人生・仕事・人間関係に使える知恵として届けます。';
const image = `${siteUrl}/og.png`;

type PageMeta = {
  title: string;
  description: string;
  indexable: boolean;
  type: 'website' | 'article';
  canonicalPath: string;
  pageType?: 'WebPage' | 'CreativeWork' | 'Article';
  entity?: { headline: string; description: string; about?: string[] };
  crumbs: { name: string; path: string }[];
};

const categoryCopy: Record<string, [string, string]> = {
  interpersonal: ['対人術', '人間関係・会話・印象・信頼を整え、相手と自然に関係を築くための処世術を体系から探せます。'],
  work: ['仕事術', '評価・合意形成・実行・キャリアを成果へつなげる、仕事の処世術を体系から探せます。'],
  life: ['人生術', '意思決定の軸を持ち、不安やつまずきを越えて人生を整える処世術を体系から探せます。'],
};

const fixed: Record<string, [string, string, boolean]> = {
  '/discover': ['処世術を探す', '悩み、人物像、対人術・仕事術・人生術の体系から、今の自分に必要な処世術を探せます。', true],
  '/personas': ['人物像から処世術を探す', '対人術・仕事術・人生術の人物像から、目指したい姿に結びつく処世術を体系的に探せます。', true],
  '/theories': ['心理学・行動科学などの理論一覧', '心理学、行動科学、組織・経営、戦略、古典・思想、経験則を、実践できる処世術とのつながりから探せます。', true],
  '/learn': ['場面から処世術を学ぶ', '人間関係・仕事・人生の具体的な場面から一手を選び、処世術と理論を実践につなげて学べます。', true],
  '/legal/about': ['処世術禄について', '人物像から処世術、理論、実践へつなぐ知識体系「処世術禄」の考え方と運営方針を紹介します。', true],
  '/legal/faq': ['よくある質問', '処世術禄の使い方、無料版と完全版、データの保存や利用環境についてのよくある質問です。', true],
};

const clean = (value = '') => value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const truncate = (value: string, max = 155) => [...clean(value)].length <= max ? clean(value) : `${[...clean(value)].slice(0, max - 1).join('')}…`;
const decode = (value: string) => { try { return decodeURIComponent(value); } catch { return value; } };
const encodePath = (value: string) => {
  const [pathname, query] = value.split('?');
  const encodedPathname = pathname.split('/').map((part) => encodeURIComponent(decode(part))).join('/');
  return query ? `${encodedPathname}?${new URLSearchParams(query).toString()}` : encodedPathname;
};
const canonical = (path: string) => `${siteUrl}${path === '/' ? '/' : encodePath(path)}`;
const crumb = (name: string, path: string) => ({ name, path });

function getMeta(rawPathname: string): PageMeta {
  const pathname = decode(rawPathname.replace(/\/$/, '') || '/');
  const fallback: PageMeta = { title: `${brand}｜人生・仕事・人間関係の処世術`, description: homeDescription, indexable: false, type: 'website', canonicalPath: pathname, crumbs: [crumb('ホーム', '/')] };
  if (pathname === '/') return { ...fallback, title: homeTitle, indexable: true };
  if (pathname === '/catalog') return {
    ...fallback,
    title: `処世術を探す｜${brand}`,
    description: fixed['/discover'][1],
    canonicalPath: '/discover',
    crumbs: [crumb('ホーム', '/'), crumb('処世術を探す', '/discover')],
  };
  if (fixed[pathname]) {
    const [label, description, indexable] = fixed[pathname];
    return { ...fallback, title: `${label}｜${brand}`, description, indexable, crumbs: [crumb('ホーム', '/'), crumb(label, pathname)] };
  }
  const personaMatch = pathname.match(/^\/subcategory\/(interpersonal|work|life)\/(.+)$/);
  if (personaMatch) {
    const category = categories.find((item) => item.key === personaMatch[1]);
    const persona = category?.subcategories.find((item) => item.name === personaMatch[2]);
    const visible = persona?.items.filter((item) => item.status !== 'locked' && item.title !== '完全版の処世術') ?? [];
    if (!persona || visible.length === 0) return fallback;
    const label = categoryCopy[personaMatch[1]][0];
    return { ...fallback, title: `${persona.articleTitle ?? persona.name}になるための処世術｜${brand}`, description: `${persona.name}を形づくる${visible.length}の処世術を、考え方・実践・関連理論から体系的に学べます。`, indexable: true, crumbs: [crumb('探す', '/discover'), crumb(label, `/personas?category=${personaMatch[1]}`), crumb(persona.name, pathname)] };
  }
  const cardMatch = pathname.match(/^\/card\/([^/]+)$/);
  if (cardMatch) {
    const item = techniqueById.get(cardMatch[1]);
    if (!item || item.status === 'locked' || item.title === '完全版の処世術') return fallback;
    const description = truncate(`${item.essence ?? item.subtitle ?? item.explanation ?? ''} ${item.subcategory}に役立つ原理、実践、注意点、関連理論を解説します。`);
    return { ...fallback, title: `${item.title}｜${item.subcategory}の処世術｜${brand}`, description, indexable: true, type: 'article', pageType: 'CreativeWork', entity: { headline: item.title, description, about: [item.categoryName, item.subcategory, ...(item.tags ?? [])] }, crumbs: [crumb('探す', '/discover'), crumb(item.categoryName, `/personas?category=${item.categoryKey}`), crumb(item.subcategory, `/subcategory/${item.categoryKey}/${item.subcategory}`), crumb(item.title, pathname)] };
  }
  const theoryMatch = pathname.match(/^\/theory\/([^/]+)$/);
  if (theoryMatch) {
    const item = theoryById.get(theoryMatch[1]);
    if (!item || isLockedTheoryShell(item)) return fallback;
    return { ...fallback, title: `${item.title}とは？意味と処世術への活かし方｜${brand}`, description: truncate(`${item.summary} 関連する処世術と実践へのつながりを紹介します。`), indexable: true, type: 'article', pageType: 'Article', entity: { headline: item.title, description: item.summary, about: [item.categoryTitle] }, crumbs: [crumb('探す', '/discover'), crumb('理論', '/theories'), crumb(item.categoryTitle, `/theories?category=${item.categoryId}`), crumb(item.title, pathname)] };
  }
  const topicMatch = pathname.match(/^\/topic\/([^/]+)$/);
  if (topicMatch) {
    const topic = guidedTopicBySlug.get(topicMatch[1]);
    if (!topic) return fallback;
    return { ...fallback, title: `${topic.label}になるための方法｜${brand}`, description: topic.description, indexable: true, crumbs: [crumb('ホーム', '/'), crumb('処世術を探す', '/discover'), crumb(topic.label, pathname)] };
  }
  return fallback;
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

function setJsonLd(meta: PageMeta) {
  const url = canonical(meta.canonicalPath);
  const graph: Record<string, unknown>[] = [
    { '@type': 'WebSite', '@id': `${siteUrl}/#website`, url: `${siteUrl}/`, name: brand, alternateName: homeTitle, inLanguage: 'ja', publisher: { '@id': `${siteUrl}/#organization` } },
    { '@type': 'Organization', '@id': `${siteUrl}/#organization`, name: brand, url: `${siteUrl}/`, logo: { '@type': 'ImageObject', url: `${siteUrl}/pwa-icon-512.png`, width: 512, height: 512 } },
    { '@type': meta.pageType ?? 'WebPage', '@id': `${url}#webpage`, url, name: meta.title, description: meta.description, inLanguage: 'ja', isPartOf: { '@id': `${siteUrl}/#website` }, breadcrumb: { '@id': `${url}#breadcrumb` } },
    { '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`, itemListElement: meta.crumbs.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.name, item: canonical(item.path) })) },
  ];
  if (meta.entity && meta.pageType === 'CreativeWork') graph.push({ '@type': 'CreativeWork', '@id': `${url}#creativework`, headline: meta.entity.headline, description: meta.entity.description, inLanguage: 'ja', about: meta.entity.about, isPartOf: { '@id': `${siteUrl}/#website` } });
  if (meta.entity && meta.pageType === 'Article') graph.push({ '@type': 'Article', '@id': `${url}#article`, headline: meta.entity.headline, description: meta.entity.description, inLanguage: 'ja', about: meta.entity.about, mainEntityOfPage: { '@id': `${url}#webpage` }, publisher: { '@id': `${siteUrl}/#organization` } });
  let element = document.head.querySelector<HTMLScriptElement>('script[data-seo-jsonld]');
  if (!element) {
    element = document.createElement('script');
    element.type = 'application/ld+json';
    element.dataset.seoJsonld = 'true';
    document.head.appendChild(element);
  }
  element.text = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph });
}

export function SeoMeta() {
  const pathname = usePathname();
  const meta = useMemo(() => getMeta(pathname || '/'), [pathname]);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const url = canonical(meta.canonicalPath);
    document.title = meta.title;
    setMeta('name', 'description', meta.description);
    setMeta('name', 'robots', meta.indexable ? 'index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1' : 'noindex,follow');
    setMeta('property', 'og:locale', 'ja_JP');
    setMeta('property', 'og:type', meta.type);
    setMeta('property', 'og:site_name', brand);
    setMeta('property', 'og:title', meta.title);
    setMeta('property', 'og:description', meta.description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', image);
    setMeta('property', 'og:image:width', '1200');
    setMeta('property', 'og:image:height', '630');
    setMeta('property', 'og:image:alt', `${meta.title}の共有画像`);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', meta.title);
    setMeta('name', 'twitter:description', meta.description);
    setMeta('name', 'twitter:image', image);
    setMeta('name', 'twitter:image:alt', `${meta.title}の共有画像`);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = url;
    setJsonLd(meta);
  }, [meta]);

  return null;
}
