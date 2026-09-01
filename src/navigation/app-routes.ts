import type { Href } from 'expo-router';

export const APP_ROUTES = {
  home: '/(tabs)',
  discover: '/discover',
  learn: '/learn',
  myPage: '/my-os',
  personas: '/personas',
  library: '/library',
  history: '/history',
  myTechniques: '/my-techniques',
  auth: '/auth',
  profile: '/settings/profile',
  install: '/settings/install',
  upgrade: '/upgrade',
  ownerContent: '/owner/content',
  ownerPreview: '/owner/preview',
  faq: '/legal/faq',
  commerce: '/legal/commerce',
  terms: '/legal/terms',
  privacy: '/legal/privacy',
  about: '/legal/about',
} as const satisfies Record<string, Href>;

export type MainSection = 'main' | 'discover' | 'learn' | 'my-os';

const DISCOVER_PREFIXES = [
  '/discover',
  '/personas',
  '/subcategory/',
  '/topic/',
  '/theory/',
  '/theories',
] as const;

const MY_PAGE_PREFIXES = [
  '/my-os',
  '/library',
  '/history',
  '/my-techniques',
] as const;

export function getMainSection(pathname: string): MainSection {
  if (DISCOVER_PREFIXES.some((prefix) => pathname.includes(prefix))) return 'discover';
  if (pathname.includes('/learn')) return 'learn';
  if (MY_PAGE_PREFIXES.some((prefix) => pathname.includes(prefix))) return 'my-os';
  return 'main';
}

export function signInRoute(): Href {
  return { pathname: '/auth', params: { mode: 'signin' } };
}

export function techniqueRoute(id: string): Href {
  return { pathname: '/card/[id]', params: { id } };
}

export function theoryRoute(id: string): Href {
  return { pathname: '/theory/[id]', params: { id } };
}

export function personaRoute(category: string, name: string): Href {
  return { pathname: '/subcategory/[category]/[name]', params: { category, name } };
}

export function upgradeRoute(source?: string): Href {
  return source
    ? { pathname: '/upgrade', params: { source } }
    : APP_ROUTES.upgrade;
}
