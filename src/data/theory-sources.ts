import type { TheoryCard, TheoryProvenance } from './types';

/**
 * 理論名と、その理論を説明する際の代表的な一次文献・原典の対応表。
 * すべての理論に単一の発明者がいるとは限らないため、断定できないものは
 * 「一部確認」または「出典不明」として表示する。
 */
const provenanceByTitle: Record<string, TheoryProvenance> = {
  初頭効果: { status: '確認済み', attribution: 'ソロモン・アッシュ（Solomon E. Asch）', works: ['Forming Impressions of Personality (1946)'] },
  単純接触効果: { status: '確認済み', attribution: 'ロバート・ザイアンス（Robert B. Zajonc）', works: ['Attitudinal Effects of Mere Exposure (1968)'] },
  類似性魅力効果: { status: '一部確認', attribution: 'ドン・バーン（Donn Byrne）ほか', works: ['The Attraction Paradigm (1971)'], note: '類似性と魅力の関係を扱う研究群を、アプリ上の理解のために要約した名称です。' },
  好意の返報性: { status: '一部確認', attribution: '複数の社会心理学研究', works: ['The norm of reciprocity (Alvin W. Gouldner, 1960)'], note: '「好意の返報性」という日本語の呼称自体は、複数の研究知見をまとめた説明的な名称です。' },
  自己開示の返報性: { status: '一部確認', attribution: 'シドニー・ジュラード（Sidney M. Jourard）ほか', works: ['Self-Disclosure: An Experimental Analysis of the Transparent Self (1971)', 'Sharing of Intimate Information in Interpersonal Relationships (Derlega & Chaikin, 1977)'] },
  社会的浸透理論: { status: '確認済み', attribution: 'アーウィン・アルトマン／ダルマス・テイラー（Irwin Altman & Dalmas A. Taylor）', works: ['Social Penetration: The Development of Interpersonal Relationships (1973)'] },
  不確実性低減理論: { status: '確認済み', attribution: 'チャールズ・バーガー／リチャード・カラブリーズ（Charles R. Berger & Richard J. Calabrese）', works: ['Some Explorations in Initial Interaction and Beyond: Toward a Developmental Theory of Interpersonal Communication (1975)'] },
  ラポールの三要素モデル: { status: '確認済み', attribution: 'リンダ・ティックル＝デグネン／ロバート・ローゼンタール（Linda Tickle-Degnen & Robert Rosenthal）', works: ['The Nature of Rapport and Its Nonverbal Correlates (1990)'] },
  ジョブ・クラフティング: { status: '確認済み', attribution: 'エイミー・レズネフスキー／ジェーン・ダットン（Amy Wrzesniewski & Jane E. Dutton）', works: ['高次の仕事の再設計としての Job Crafting (2001)'] },
  キャリア資本理論: { status: '確認済み', attribution: 'ロバート・デフィリッピ／マイケル・アーサー（Robert J. DeFillippi & Michael B. Arthur）', works: ['The Boundaryless Career: A Competency-Based Perspective (1994)'] },
  ピーターの法則: { status: '確認済み', attribution: 'ローレンス・J・ピーター／レイモンド・ハル（Laurence J. Peter & Raymond Hull）', works: ['The Peter Principle (1969)'] },
  プロスペクト理論: { status: '確認済み', attribution: 'ダニエル・カーネマン／エイモス・トベルスキー（Daniel Kahneman & Amos Tversky）', works: ['Prospect Theory: An Analysis of Decision under Risk (1979)'] },
  損失回避: { status: '確認済み', attribution: 'ダニエル・カーネマン／エイモス・トベルスキー（Daniel Kahneman & Amos Tversky）', works: ['Prospect Theory: An Analysis of Decision under Risk (1979)', 'Loss Aversion in Riskless Choice: A Reference-Dependent Model (1991)'] },
  現状維持バイアス: { status: '確認済み', attribution: 'ウィリアム・サミュエルソン／リチャード・ゼックハウザー（William Samuelson & Richard Zeckhauser）', works: ['Status Quo Bias in Decision Making (1988)'] },
  心理的柔軟性: { status: '一部確認', attribution: 'スティーヴン・ヘイズ（Steven C. Hayes）ほか', works: ['Acceptance and Commitment Therapy (1999)', 'Psychological Flexibility as a Fundamental Aspect of Health (Kashdan & Rottenberg, 2010)'], note: '単一の実験で発見された法則ではなく、ACTなどで発展した包括的な概念です。' },
  アクセプタンス: { status: '確認済み', attribution: 'スティーヴン・ヘイズ／カーク・ストローサル／ケリー・ウィルソン（Hayes, Strosahl & Wilson）', works: ['Acceptance and Commitment Therapy (1999)'] },
  認知的脱フュージョン: { status: '確認済み', attribution: 'スティーヴン・ヘイズほか（Steven C. Hayes et al.）', works: ['Acceptance and Commitment Therapy (1999)'] },
  脱中心化: { status: '一部確認', attribution: 'ズィンデル・シーガル／マーク・ウィリアムズ／ジョン・ティーズデールほか', works: ['Mindfulness-Based Cognitive Therapy for Depression (2002)'], note: '近接する概念が複数の心理療法・研究領域で用いられています。' },
  マインドフルネス: { status: '一部確認', attribution: 'ジョン・カバット・ジン（Jon Kabat-Zinn）ほか', works: ['Full Catastrophe Living (1990)', 'Mindfulness: A Proposed Operational Definition (Bishop et al., 2004)'], note: '伝統的実践に由来し、現代心理学では複数の定義・測定法があります。' },
  ストレス評価理論: { status: '確認済み', attribution: 'リチャード・ラザルス／スーザン・フォークマン（Richard S. Lazarus & Susan Folkman）', works: ['Stress, Appraisal, and Coping (1984)'] },
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
