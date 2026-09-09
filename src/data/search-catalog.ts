import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '@/access/access-config';
import { getTheoryDisplayId, techniqueCards, theories } from '@/data/catalog';
import { getTechniqueSearchText } from '@/data/technique-tags';
import { getTheoryCategoryLabel } from '@/data/theory-counts';
import { isLockedTheoryShell } from '@/data/theory-display';

export type BrowseMode = 'techniques' | 'theories';

const searchAliases: Record<string, string[]> = {
  友達: ['友達', '人間関係', '関係'],
  出世: ['出世', '評価', '昇進', 'キャリア'],
  進路: ['進路', '選択', 'キャリア', '方向性'],
  転職: ['転職', 'キャリア', '仕事'],
  自己肯定感: ['自己肯定感', '自信', '自己評価'],
  リーダーシップ: ['リーダーシップ', 'リーダー', '集団'],
  習慣: ['習慣', '継続', '行動'],
  交渉: ['交渉', '合意', '説得'],
};

function matchesKeyword(source: string, keyword: string) {
  return (searchAliases[keyword] ?? [keyword]).some((term) => source.includes(term.toLocaleLowerCase()));
}

export function getSearchKeywords(query: string) {
  return query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
}

export function getSearchResults(query: string, isPaid: boolean) {
  const keywords = getSearchKeywords(query);
  const techniqueMatches = !keywords.length ? [] : techniqueCards
    .filter((card) => isPaid || FREE_TECHNIQUE_IDS.has(card.id))
    .filter((card) => keywords.every((keyword) => matchesKeyword(getTechniqueSearchText(card).toLocaleLowerCase(), keyword)));
  const theoryMatches = !keywords.length ? [] : theories
    .filter((theory) => isPaid || FREE_THEORY_ID_SET.has(theory.tagId) || isLockedTheoryShell(theory))
    .filter((theory) => {
      const source = [
        theory.tagId,
        getTheoryDisplayId(theory),
        theory.title,
        theory.aliases?.join(' '),
        theory.summary,
        theory.categoryTitle,
        getTheoryCategoryLabel(theory.categoryId),
      ].filter(Boolean).join(' ').toLocaleLowerCase();
      return keywords.every((keyword) => matchesKeyword(source, keyword));
    });
  return { keywords, techniqueMatches, theoryMatches };
}
