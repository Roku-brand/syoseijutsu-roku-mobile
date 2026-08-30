import type { TheoryCard, TheoryProvenance } from './types';

/**
 * 無料公開中の理論だけに、公開ビルドで参照できる出典情報を持たせる。
 * 完全版の出典情報は、購入後に取得する理論ペイロードに含めることで、
 * 有料タイトルや補足情報を静的なJavaScriptへ載せない。
 */
const provenanceByTitle: Record<string, TheoryProvenance> = {
  初頭効果: { status: '確認済み', attribution: 'ソロモン・アッシュ（Solomon E. Asch）', works: ['Forming Impressions of Personality (1946)'] },
  単純接触効果: { status: '確認済み', attribution: 'ロバート・ザイアンス（Robert B. Zajonc）', works: ['Attitudinal Effects of Mere Exposure (1968)'] },
  類似性魅力効果: { status: '一部確認', attribution: 'ドン・バーン（Donn Byrne）ほか', works: ['The Attraction Paradigm (1971)'], note: '類似性と魅力の関係を扱う研究群を、アプリ上の理解のために要約した名称です。' },
  好意の返報性: { status: '一部確認', attribution: '複数の社会心理学研究', works: ['The norm of reciprocity (Alvin W. Gouldner, 1960)'], note: '「好意の返報性」という日本語の呼称自体は、複数の研究知見をまとめた説明的な名称です。' },
  自己開示の返報性: { status: '一部確認', attribution: 'シドニー・ジュラード（Sidney M. Jourard）ほか', works: ['Self-Disclosure: An Experimental Analysis of the Transparent Self (1971)', 'Sharing of Intimate Information in Interpersonal Relationships (Derlega & Chaikin, 1977)'] },
  社会的浸透理論: { status: '確認済み', attribution: 'アーウィン・アルトマン／ダルマス・テイラー（Irwin Altman & Dalmas A. Taylor）', works: ['Social Penetration: The Development of Interpersonal Relationships (1973)'] },
  不確実性低減理論: { status: '確認済み', attribution: 'チャールズ・バーガー／リチャード・カラブリーズ（Charles R. Berger & Richard J. Calabrese）', works: ['Some Explorations in Initial Interaction and Beyond: Toward a Theory of Interpersonal Communication (1975)'] },
  ラポールの三要素モデル: { status: '確認済み', attribution: 'リンダ・ティックル＝デグネン／ロバート・ローゼンタール（Linda Tickle-Degnen & Robert Rosenthal）', works: ['The Nature of Rapport and Its Nonverbal Correlates (1990)'] },
};

const unknownProvenance: TheoryProvenance = {
  status: '出典不明',
  note: '現時点で、特定の提唱者・研究・著作を確実に確認できていません。',
};

export function getTheoryProvenance(
  theory: Pick<TheoryCard, 'title' | 'provenance'>,
): TheoryProvenance {
  if (theory.provenance) return theory.provenance;
  if (provenanceByTitle[theory.title]) return provenanceByTitle[theory.title];
  return unknownProvenance;
}
