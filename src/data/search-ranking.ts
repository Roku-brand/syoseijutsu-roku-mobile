import { SEARCH_VOCABULARY } from './search-vocabulary';
import { SEARCH_TOPIC_CONNECTIONS } from './search-topic-connections';

export type SearchDocument = {
  knowledgeId?: string;
  title: string;
  aliases?: readonly string[];
  /** Related lookup terms, deliberately weaker than names and aliases. */
  keywords?: readonly string[];
  tags?: readonly string[];
  summary?: string;
  context?: readonly string[];
  body?: string;
};
type SearchTerm = { text: string; variants: readonly string[]; relatedIds?: readonly string[] };
type VocabularyEntry = { label: string; forms: string[] };

/** NFKC handles width and compatibility forms; kana folding handles readings.
 * Keep spaces/punctuation for token boundaries, especially English and IDs.
 */
export function normalizeSearchText(value: string) {
  return value.normalize('NFKC').toLowerCase().replace(/[ァ-ヶ]/g, character => String.fromCharCode(character.charCodeAt(0) - 0x60))
    .replace(/[‐‑‒–—−]/g, '-').replace(/[・･]/g, '').replace(/([a-z])-(?=[a-z])/g, '$1 ').replace(/\s+/g, ' ').trim();
}
const vocabulary: VocabularyEntry[] = SEARCH_VOCABULARY.map(([label, ...variants]) => ({
  label: normalizeSearchText(label), forms: [...new Set([label, ...variants].map(normalizeSearchText))],
}));
const byForm = new Map(vocabulary.flatMap(entry => entry.forms.map(form => [form, entry] as const)));
const topicConnections = new Map(Object.entries(SEARCH_TOPIC_CONNECTIONS).map(([label, ids]) => [normalizeSearchText(label), ids]));
const termForEntry = (entry: VocabularyEntry): SearchTerm => ({ text: entry.label, variants: entry.forms, relatedIds: topicConnections.get(entry.label) });
const phrases = [...byForm.keys()].sort((a, b) => b.length - a.length);
const connectors = /^(?:[\s、。？！?!「」『』（）()・：:]|について|を知りたい|が知りたい|を教えて|教えてください|教えて|をやめたい|を減らしたい|を改善したい|を良くしたい|をよくしたい|になりたい|どうすれば|どうしたら|どうやって|したい|するには|したらいい|する方法|の方法|方法|やり方|について知りたい|とは何か|とは|ください|です|ます|の|を|が|に|で|と|は|へ|も)+$/;
const goalPhrase = /^(?:を|が|の)?(?:減らす|なくす|解消する|改善する|高める|良くする|よくする|身につける|うまくなる|克服する|やめる|直す)(?:方法|には|にはどうすればいい)?$/;
const englishCharacter = (character?: string) => Boolean(character && /[a-z0-9]/.test(character));

function phraseBoundary(text: string, start: number, phrase: string) {
  return !(englishCharacter(phrase[0]) && englishCharacter(text[start - 1]))
    && !(englishCharacter(phrase.at(-1)) && englishCharacter(text[start + phrase.length]));
}

/** Longest known phrases stay atomic ("mere exposure effect", "最適化の罠").
 * Unknown words remain required terms; we never silently drop an unfamiliar
 * noun just because another part of a query matches a popular keyword.
 */
export function prepareSearchQuery(query: string): SearchTerm[] {
  const source = normalizeSearchText(query);
  if (!source || source.length > 256) return [];
  const exact = byForm.get(source);
  if (exact) return [termForEntry(exact)];
  const terms: SearchTerm[] = [];
  let pending = '';
  const flush = () => {
    for (const rawWord of pending.split(/[\s、。？！?!「」『』（）()]+/).filter(Boolean)) {
      const word = rawWord.replace(/(?:について知りたい|について教えて|について|とは何か|とは|を知りたい|が知りたい|を教えてください|を教えて)$/, '');
      if (!word) continue;
      if (!connectors.test(word) && !goalPhrase.test(word)) terms.push({ text: word, variants: [word] });
    }
    pending = '';
  };
  for (let index = 0; index < source.length;) {
    const phrase = phrases.find(form => source.startsWith(form, index) && phraseBoundary(source, index, form)
      && (form.length > 1 || source.length === 1 || /[\sがをのにはでと、。]/.test(source[index + 1] ?? '')));
    if (phrase) {
      if (pending.length === 1 && !connectors.test(pending)) {
        pending += phrase;
        index += phrase.length;
        continue;
      }
      flush();
      const entry = byForm.get(phrase)!;
      terms.push(termForEntry(entry));
      index += phrase.length;
    } else pending += source[index++];
  }
  flush();
  return [...new Map(terms.map(term => [term.text, term])).values()];
}

function includesTerm(text: string, term: string, exactOnly = false) {
  if (text === term) return true;
  // A single character such as 運 must not match 運用/運ぶ; short Latin
  // fragments must not match inside another word ("art" in "start").
  if (exactOnly) return false;
  if (term.length === 1) {
    return [...text].some((character, index) => character === term
      && (!index || /[\s「『（(、。]/.test(text[index - 1]))
      && (index === text.length - 1 || /[\sがをのにはでと、。]/.test(text[index + 1])));
  }
  let from = text.indexOf(term);
  while (from !== -1) {
    if (phraseBoundary(text, from, term)) return true;
    from = text.indexOf(term, from + term.length);
  }
  return false;
}
function bestMatch(text: string, term: SearchTerm, weight: number, exactOnly = false) {
  if (includesTerm(text, term.text, exactOnly)) return weight + (text === term.text ? weight * 0.25 : 0);
  return term.variants.some(variant => includesTerm(text, variant, exactOnly)) ? weight * 0.85 : 0;
}
function plainBody(value: string) {
  return value.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, '');
}

export function scoreSearchDocument(document: SearchDocument, query: string, terms = prepareSearchQuery(query)) {
  if (!terms.length) return 0;
  const title = normalizeSearchText(document.title);
  const normalizedQuery = normalizeSearchText(query);
  if (title === normalizedQuery) return 1000;
  if (document.aliases?.some(alias => normalizeSearchText(alias) === normalizedQuery)) return 900;
  const body = plainBody(document.body ?? '');
  // The opening sentence establishes a card's context. A single incidental
  // mention later in the explanation does not carry the same weight.
  const opening = body.trim().split(/[\n。！？!?]/)[0].slice(0, 160);
  const fields: Array<[string, number, boolean?]> = [
    [title, 120],
    ...(document.aliases ?? []).map(value => [normalizeSearchText(value), 100] as [string, number]),
    ...(document.tags ?? []).map(value => [normalizeSearchText(value), 85, true] as [string, number, boolean]),
    ...(document.keywords ?? []).map(value => [normalizeSearchText(value), 25] as [string, number]),
    [normalizeSearchText(document.summary ?? ''), 35],
    ...(document.context ?? []).map(value => [normalizeSearchText(value), 15] as [string, number]),
    [normalizeSearchText(opening), 20],
    [normalizeSearchText(body), 8],
  ];
  let total = 0;
  const relatedMatch = (term: SearchTerm) => Boolean(document.knowledgeId && term.relatedIds?.includes(document.knowledgeId));
  for (const term of terms) {
    const score = Math.max(relatedMatch(term) ? 24 : 0, ...fields.map(([value, weight, exactOnly]) => bestMatch(value, term, weight, exactOnly)));
    if (!score) return 0;
    if (score <= 10 && byForm.has(term.text)) {
      const body = fields.at(-1)![0];
      const occurrences = new Set(term.variants.flatMap(variant => {
        const positions: number[] = [];
        for (let from = body.indexOf(variant); from !== -1; from = body.indexOf(variant, from + variant.length)) {
          if (phraseBoundary(body, from, variant)) positions.push(from);
        }
        return positions;
      }));
      const headingMatch = (document.body ?? '').split('\n').some(line => /^#{1,6}\s/.test(line)
        && bestMatch(normalizeSearchText(line), term, 1) > 0);
      if (occurrences.size < 2 && !headingMatch) return 0;
    }
    total += score;
  }
  // Body-only multiword matches must occur together, not in unrelated
  // paragraphs at opposite ends of a long feature article.
  if (terms.length > 1 && terms.every(term => !relatedMatch(term) && fields.slice(0, -2).every(([value, weight, exactOnly]) => !bestMatch(value, term, weight, exactOnly)))) {
    const body = fields.at(-1)![0];
    const starts = terms.flatMap(term => term.variants.flatMap(variant => {
      const positions: number[] = [];
      for (let from = body.indexOf(variant); from !== -1; from = body.indexOf(variant, from + variant.length)) positions.push(from);
      return positions;
    }));
    if (!starts.some(start => terms.every(term => term.variants.some(variant => includesTerm(body.slice(start, start + 240), variant))))) return 0;
  }
  const nameMatch = terms.every(term => [title, ...(document.aliases ?? []).map(normalizeSearchText)]
    .some(value => bestMatch(value, term, 1) > 0));
  return (document.knowledgeId && nameMatch ? 600 : 0) + Math.min(250, total / terms.length);
}

export function rankSearchItems<T>(items: readonly T[], document: (item: T) => SearchDocument, query: string) {
  const terms = prepareSearchQuery(query);
  if (!terms.length) return [];
  return items.map((item, index) => ({ item, index, score: scoreSearchDocument(document(item), query, terms) }))
    .filter(match => match.score > 0).sort((a, b) => b.score - a.score || a.index - b.index).map(match => match.item);
}

/** Conservative fallback for new CMS cards without manually stored tags.
 * Only the title/essence may propose a label, never incidental body words.
 */
export function suggestSearchTags(text: string) {
  const source = normalizeSearchText(text);
  return vocabulary.filter(entry => entry.forms.some(form => form.length > 1 && includesTerm(source, form)))
    .map(entry => SEARCH_VOCABULARY.find(([label]) => normalizeSearchText(label) === entry.label)![0]).slice(0, 3);
}
