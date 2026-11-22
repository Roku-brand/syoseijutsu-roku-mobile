import type { TheoryCard } from './types';

/**
 * 外部データやJSX属性から渡る表示文を、画面向けの文字列へ整える。
 * literalな「\\n」も実際の改行へ戻し、行頭・行末の空白を取り除く。
 */
export function normalizeDisplayText(value?: string | null): string {
  return (value ?? '')
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\n')
    .replace(/\r\n?/g, '\n')
    .replace(/\u00a0/g, ' ')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export function getTheoryCategoryLabel(theory: Pick<{ categoryId: string; categoryTitle: string }, 'categoryId' | 'categoryTitle'>): string {
  return normalizeDisplayText(theory.categoryTitle);
}

export function getTheorySeoCopy(theory: { title: string; summary: string; categoryId: string; provenance?: {status: string} }) {
  const summary = normalizeDisplayText(theory.summary).replace(/\n+/g, ' ');
  if (theory.categoryId === 'practical-wisdom') {
    return { title: `${theory.title}の意味・使い方`, description: `${summary} 日々の行動や判断につなげる実践知を紹介します。`, summaryHeading: '考え方・使い方' };
  }
  if (theory.categoryId === 'classics-thought') {
    return {
      title: `${theory.title}の意味・現代語訳と現代での活かし方`,
      description: `${summary} 意味や背景を、現代の判断と処世術へのつながりから読み解きます。`,
      summaryHeading: '意味・現代での捉え方',
    };
  }
  return {
    title: `${theory.title}とは？意味・具体例と実生活への活かし方`,
    description: `${summary} 理論の意味と、日常・仕事・人間関係で使える処世術へのつながりを紹介します。`,
    summaryHeading: `${theory.title}とは`,
  };
}

/** 表紙・一覧用に、理論の意味を説明する最初の1文だけを返す。 */
export function getTheoryCoverSummary(summary: string): string {
  const text = normalizeDisplayText(summary).replace(/\n+/g, ' ').replace(/[ \t]{2,}/g, ' ').trim();
  if (!text) return '';
  const sentenceEnd = text.search(/[。！？!?]/);
  return sentenceEnd === -1 ? text : text.slice(0, sentenceEnd + 1);
}

/** 概要の冒頭から、具体例を除いた最初の一文を取り出す。 */
export function getRelatedDefinition(summary?: string | null): string {
  const opening = normalizeDisplayText(summary).split('\n', 1)[0] ?? '';
  if (/^(例えば|たとえば|例として)[、,\s]/.test(opening)) return '';

  // 引用句や括弧内の句点では文を終えない。
  return opening.match(/^(?:「[^」]*」|『[^』]*』|（[^）]*）|[^「『（。！？!?])+[。！？!?]+/)?.[0]
    ?? (/[。！？!?]/.test(opening) ? '' : opening);
}

/** 格言の文脈注記は定義として扱わない。 */
export function getRelatedTheoryDefinition(theory: Pick<TheoryCard, 'summary' | 'quotation'>): string {
  return theory.quotation ? '' : getRelatedDefinition(theory.summary);
}

/** 格言の補足は解説ではなく、確認済みの著者・発言者を表示する。 */
export function getTheoryCardSupplement(theory: Pick<TheoryCard, 'summary' | 'knowledgeType' | 'quotation' | 'quotationAuthor'>): string {
  if (theory.quotation || theory.knowledgeType === 'aphorism') {
    const author = normalizeDisplayText(theory.quotation?.author || theory.quotationAuthor);
    return author ? `ー${author}` : '';
  }
  return getTheoryCoverSummary(theory.summary);
}

export function getTheoryUpgradeTitle(theory: TheoryCard, displayId: string): string {
  if (theory.quotation || theory.knowledgeType === 'aphorism') {
    const author = normalizeDisplayText(theory.quotationAuthor || theory.quotation?.author);
    return `${displayId}・${author ? `${author}の格言` : '格言'}`;
  }
  return normalizeDisplayText(theory.title);
}

/**
 * 無料版バンドルには、タイトルだけを公開して本文を含めないシェルが存在する。
 * 完全版利用者には、完全版カタログの同期完了まで読み込み状態として扱う。
 */
export function isLockedTheoryShell(theory: Pick<{ title: string; summary: string; status?: string }, 'title' | 'summary' | 'status'>): boolean {
  return theory.status === 'locked'
    || (normalizeDisplayText(theory.title) === '完全版の理論' && !normalizeDisplayText(theory.summary));
}
