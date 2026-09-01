import homeBrandSource from './generated/home-brand-content.json';
import metadataSource from './generated/metadata.json';
import { categories, categoryOrder, techniqueById, theoryById } from './catalog';
import { guidedTopics } from './guided-topics';
import type { CategoryKey, TechniqueCard, TheoryCard } from './types';

export type HomeTheoryMapItem = {
  tagId: string;
  title: string;
  categoryId: string;
  categoryTitle: string;
};

export type HomePersona = {
  categoryKey: TechniqueCard['categoryKey'];
  categoryName: string;
  name: string;
  description: string;
  techniqueCount: number;
};

type DailyCandidateGroup = {
  techniqueIds: readonly string[];
  personaNames: readonly string[];
  theoryIds: readonly string[];
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TOKYO_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAILY_DOMAINS = categoryOrder as readonly CategoryKey[];

function positiveModulo(value: number, length: number) {
  return ((value % length) + length) % length;
}

/** A monotonically increasing calendar-day key at midnight in Japan. */
export function getHomeDayKey(now = new Date()) {
  const tokyo = new Date(now.getTime() + TOKYO_OFFSET_MS);
  return Math.floor(Date.UTC(tokyo.getUTCFullYear(), tokyo.getUTCMonth(), tokyo.getUTCDate()) / DAY_MS);
}

function chooseResolved<T>(items: readonly string[], index: number, resolve: (id: string) => T | undefined) {
  for (let offset = 0; offset < items.length; offset += 1) {
    const item = resolve(items[positiveModulo(index + offset, items.length)]);
    if (item) return item;
  }
  return undefined;
}

function candidateGroup(domain: CategoryKey) {
  return homeBrandSource.dailyCandidates[domain] as DailyCandidateGroup;
}

function resolvePersona(domain: CategoryKey, name: string) {
  const category = categories.find((item) => item.key === domain);
  const persona = category?.subcategories.find((item) => item.name === name);
  if (!category || !persona) return undefined;
  const topic = guidedTopics.find((item) => item.tag === persona.name);
  const readableCount = persona.items.filter((item) => item.status !== 'locked' && item.title !== '完全版の処世術').length;
  return {
    categoryKey: category.key,
    categoryName: category.name,
    name: persona.name,
    description: topic?.description ?? `${persona.articleTitle ?? persona.name}を形づくる、${category.name}の実践知。`,
    techniqueCount: readableCount || persona.items.length,
  } satisfies HomePersona;
}

export function getHomeBrandContent(now = new Date()) {
  const dayKey = getHomeDayKey(now);
  const domainOffset = positiveModulo(dayKey, DAILY_DOMAINS.length);
  const cycle = Math.floor(dayKey / DAILY_DOMAINS.length);
  // Each day the first three slides cover all three domains. Their roles rotate
  // daily, so every slide changes domain without allowing interpersonal content
  // to monopolize the reel.
  const techniqueDomain = DAILY_DOMAINS[domainOffset];
  const personaDomain = DAILY_DOMAINS[(domainOffset + 1) % DAILY_DOMAINS.length];
  const theoryDomain = DAILY_DOMAINS[(domainOffset + 2) % DAILY_DOMAINS.length];
  const techniqueCandidates = candidateGroup(techniqueDomain);
  const personaCandidates = candidateGroup(personaDomain);
  const theoryCandidates = candidateGroup(theoryDomain);

  const technique = chooseResolved(techniqueCandidates.techniqueIds, cycle, (id) => techniqueById.get(id))
    ?? homeBrandSource.fallbackTechniqueSnapshots[techniqueDomain] as TechniqueCard;
  const persona = chooseResolved(personaCandidates.personaNames, cycle, (name) => resolvePersona(personaDomain, name))
    ?? homeBrandSource.fallbackPersonaSnapshots[personaDomain] as HomePersona;
  const theory = chooseResolved(theoryCandidates.theoryIds, cycle, (id) => {
    const live = theoryById.get(id);
    if (live && live.title !== '完全版の理論') return live;
    return homeBrandSource.theorySnapshots.find((item) => item.tagId === id) as TheoryCard | undefined;
  }) ?? homeBrandSource.theorySnapshots[0] as TheoryCard;

  return {
    dayKey,
    domains: { technique: techniqueDomain, persona: personaDomain, theory: theoryDomain },
    technique,
    theory,
    persona,
    techniqueTheoryMap: homeBrandSource.techniqueTheoryMap,
    counts: {
      domains: categories.length,
      domainNames: categories.map((category) => category.name),
      personas: metadataSource.personaCount,
      techniques: metadataSource.techniqueCount,
      theories: metadataSource.theoryCount,
    },
  };
}

export function resolveHomeTheoryMapLinks(): HomeTheoryMapItem[] {
  return homeBrandSource.techniqueTheoryMap.theories.map((snapshot) => {
    const live = theoryById.get(snapshot.tagId);
    return live && live.title !== '完全版の理論'
      ? { tagId: live.tagId, title: live.title, categoryId: live.categoryId, categoryTitle: live.categoryTitle }
      : snapshot;
  });
}

export function getHomeContentCandidates() {
  return {
    techniques: DAILY_DOMAINS.flatMap((domain) => candidateGroup(domain).techniqueIds)
      .map((id) => techniqueById.get(id)).filter(Boolean) as TechniqueCard[],
    personas: DAILY_DOMAINS.flatMap((domain) => candidateGroup(domain).personaNames),
    theories: DAILY_DOMAINS.flatMap((domain) => candidateGroup(domain).theoryIds)
      .map((id) => theoryById.get(id)).filter(Boolean) as TheoryCard[],
  };
}
