import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';

const siteUrl = 'https://shoseijutsuroku.com';
const defaultTitle = '処世術禄｜人生・仕事・人間関係のための処世術';
const defaultDescription = '人生をうまく生きるための対人術・仕事術・人生術を、心理学・行動科学・経験則から学べる処世術の辞典。';
const personaTitles: Record<string, [string, string]> = {
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

const noindexPrefixes = ['/auth', '/upgrade', '/settings', '/library', '/my-os', '/onboarding', '/welcome', '/collection', '/goal', '/learn', '/card'];

function getMeta(pathname: string): [string, string, boolean] {
  if (pathname === '/') return [defaultTitle, defaultDescription, true];
  if (pathname === '/personas') return ['26人物像一覧｜処世術禄', '対人術・仕事術・人生術の3領域、26人物像から処世術を選べます。', true];
  if (pathname === '/theories') return ['630理論一覧｜処世術禄', '心理学・行動科学・組織経営・戦略・古典・格言から理論を検索できます。', true];
  const personaName = decodeURIComponent(pathname.split('/').pop() ?? '');
  if (pathname.startsWith('/subcategory/') && personaTitles[personaName]) return [...personaTitles[personaName], true];
  if (pathname === '/category/interpersonal') return ['対人術｜処世術禄', '関係を築き、会話し、集団の中で自然に立ち回るための処世術を学べます。', true];
  if (pathname === '/category/work') return ['仕事術｜処世術禄', '評価、合意、実行を成果につなげるための仕事の処世術を学べます。', true];
  if (pathname === '/category/life') return ['人生術｜処世術禄', '判断軸を持ち、不安やつまずきを越えて生きるための人生術を学べます。', true];
  return [`${defaultTitle}`, defaultDescription, !noindexPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))];
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

export function SeoMeta() {
  const pathname = usePathname();

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const [title, description, indexable] = getMeta(pathname || '/');
    const canonical = `${siteUrl}${pathname === '/' ? '/' : encodeURI(pathname)}`;
    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', indexable ? 'index,follow,max-image-preview:large' : 'noindex,nofollow');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:image', `${siteUrl}/og.png`);
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', `${siteUrl}/og.png`);
    let link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'canonical';
      document.head.appendChild(link);
    }
    link.href = canonical;
  }, [pathname]);

  return null;
}
