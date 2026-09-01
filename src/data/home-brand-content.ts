import homeBrandSource from './generated/home-brand-content.json';
import metadataSource from './generated/metadata.json';
import { categories, techniqueById, theoryById } from './catalog';
import { guidedTopics } from './guided-topics';
import type { TechniqueCard, TheoryCard } from './types';

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

function dateSeed(now: Date) {
  const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash ^= key.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function chooseDaily<T>(items: readonly T[], now: Date) {
  if (!items.length) return undefined;
  return items[dateSeed(now) % items.length];
}

export function getHomeBrandContent(now = new Date()) {
  const techniqueId = chooseDaily(homeBrandSource.todayTechniqueCandidateIds, now);
  const theoryId = chooseDaily(homeBrandSource.theoryCandidateIds, now);
  const personaName = chooseDaily(homeBrandSource.personaCandidateNames, now);
  const technique = techniqueId ? techniqueById.get(techniqueId) : undefined;
  const liveTheory = theoryId ? theoryById.get(theoryId) : undefined;
  const theorySnapshot = homeBrandSource.theorySnapshots.find((item) => item.tagId === theoryId);
  const theory = liveTheory && liveTheory.title !== '完全版の理論' ? liveTheory : theorySnapshot;
  const personaCategory = categories.find((category) => category.subcategories.some((item) => item.name === personaName));
  const persona = personaCategory?.subcategories.find((item) => item.name === personaName);
  const topic = guidedTopics.find((item) => item.tag === personaName);

  return {
    technique,
    theory,
    persona: personaCategory && persona ? {
      categoryKey: personaCategory.key,
      categoryName: personaCategory.name,
      name: persona.name,
      description: topic?.description ?? persona.articleTitle ?? persona.name,
      techniqueCount: persona.items.length,
    } satisfies HomePersona : undefined,
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
    techniques: homeBrandSource.todayTechniqueCandidateIds.map((id) => techniqueById.get(id)).filter(Boolean) as TechniqueCard[],
    personas: homeBrandSource.personaCandidateNames,
    theories: homeBrandSource.theoryCandidateIds.map((id) => theoryById.get(id)).filter(Boolean) as TheoryCard[],
  };
}
