import retiredIds from '@/data/generated/retired-theory-ids.json';
import { isRetiredTheoryId, RETIRED_THEORY_TITLE } from '@/data/theory-knowledge';
import { TheoryNetwork } from '@/components/theory-network';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { canReadTheory } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { DetailSwipe } from '@/components/detail-swipe';
import { LockedPreview } from '@/components/locked-preview';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { catalogTheme, colors, fonts, radius } from '@/constants/theme';
import { getTechniquesForTheory, getTheoryDisplayId, theories, theoryById } from '@/data/catalog';
import { getTheoryCategoryLabel, getTheorySeoCopy, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import { getTheoryProvenance } from '@/data/theory-sources';
import type { TheoryCard } from '@/data/types';
import { getTheoryPath } from '@/data/theory-taxonomy';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { recordContentEvent } from '@/lib/content-events';
import { useAppState } from '@/state/app-state';
import { SeoBreadcrumbs } from '@/components/seo-breadcrumbs';
import { RelatedContentSection } from '@/components/related-content-list';
import { RelatedFeatures } from '@/components/related-features';
import { contentImageUrl } from '@/lib/content-media';

export function generateStaticParams() {
  return [...theoryById.keys(), ...retiredIds].map((id) => ({ id }));
}

export default function TheoryDetailScreen() {
  'use no memo';
  // The catalogue is updated outside React. Preserve catalogRevision in the
  // explicit useMemo below; compiler inference otherwise drops that dependency.
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width > 0 && width < 700;
  const { accessState, catalogRevision, refreshAccess, secureContentStatus } = useAccess();
  const theory = useMemo(() => theoryById.get(id), [catalogRevision, id]);
  const { addHistory } = useAppState();
  const [informationOpen, setInformationOpen] = useState(false);
  useEffect(() => { setInformationOpen(false); }, [id]);
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';

  useEffect(() => {
    if (theory && canReadTheory(effectiveAccess, theory.tagId)) {
      addHistory(theory.tagId);
      void recordContentEvent('theory', theory.tagId, 'view').catch(() => undefined);
    }
  }, [addHistory, effectiveAccess, theory]);

  if (isRetiredTheoryId(id)) return <Screen contentContainerStyle={styles.screenContent}><EmptyState tone="theory" title={RETIRED_THEORY_TITLE} description="この知識は編集方針の見直しにより公開を終了しました。保存・閲覧履歴の記録は保持されています。" /></Screen>;
  if (!theory) {
    return <Screen contentContainerStyle={styles.screenContent}><EmptyState tone="theory" title="理論が見つかりません" description="前の画面へ戻り、別の理論を選んでください。" /></Screen>;
  }

  if (!canReadTheory(effectiveAccess, theory.tagId)) return <LockedPreview source="discover_theory" />;

  if (isLockedTheoryShell(theory)) {
    const failed = secureContentStatus === 'error';
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <EmptyState tone="theory"
          mark="理"
          title={failed ? '理論を読み込めませんでした' : '理論を読み込んでいます'}
          description={failed ? '完全版データを確認できませんでした。通信を確認して、もう一度お試しください。' : '完全版の理論を確認しています。しばらくお待ちください。'}
        />
        {failed ? (
          <Pressable accessibilityRole="button" accessibilityLabel="理論データを再読み込み" onPress={() => void refreshAccess()} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
            <AppText style={styles.retryButtonText}>もう一度読み込む</AppText>
          </Pressable>
        ) : null}
      </Screen>
    );
  }

  const related = getTechniquesForTheory(theory);
  const titleLength = [...(theory.quotation?.translationText ?? theory.title).replace(/\s/g, '')].length;
  const titleFontSize = compact
    ? titleLength <= 12 ? 31 : titleLength <= 18 ? 27 : 23
    : titleLength <= 12 ? 42 : titleLength <= 18 ? 36 : 31;
  const summary = formatTheorySummary(theory.quotation?.contextNote ?? theory.summary);
  const seoCopy = getTheorySeoCopy(theory);
  const navigateTheory = (offset: -1 | 1) => {
    const currentIndex = theories.findIndex((item) => item.tagId === theory.tagId);
    const next = theories[(currentIndex + offset + theories.length) % theories.length];
    router.replace({ pathname: '/theory/[id]', params: { id: next.tagId } });
  };

  return (
    <Screen style={styles.screen} contentContainerStyle={[styles.screenContent, compact && styles.screenContentCompact]}>
      <DetailSwipe style={styles.article} onPrevious={() => navigateTheory(-1)} onNext={() => navigateTheory(1)}>
        <SeoBreadcrumbs tone="theory" items={[
          { label: '探す', href: '/discover' },
          { label: '理論', href: '/theories' },
          { label: getTheoryCategoryLabel(theory), href: { pathname: '/theories', params: { category: theory.categoryId } } },
          { label: normalizeDisplayText(theory.title) },
        ]} />
        <View style={[styles.titleRegion, !compact && styles.readingWidth]}>
          <View testID="theory-meta" style={styles.metaRow}>
            <AppText style={styles.number}>{getTheoryDisplayId(theory)}</AppText>
            <View style={styles.categoryTag}><AppText style={styles.categoryTagText}>{getTheoryPath(theory)}</AppText></View>
          </View>
          <AppText accessibilityRole="header" aria-level={1} testID="theory-title" variant="serif" style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.4) }]}>
            {theory.quotation ? `「${theory.quotation.translationText}」` : normalizeDisplayText(theory.title)}
          </AppText>
          {theory.quotation ? <View testID="quotation-attribution" style={{ gap: 6, marginTop: 18 }}>
            <AppText style={{ color: blue.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 28 }}>— {theory.quotation.author}</AppText>
            <AppText style={{ color: blue.text, fontSize: 12, lineHeight: 20 }}>{theory.quotation.work}　{theory.quotation.locator}</AppText>
          </View> : null}
        </View>

        {theory.imagePath && contentImageUrl(theory.imagePath) ? <Image source={{ uri: contentImageUrl(theory.imagePath)! }} contentFit="cover" style={{ width: '100%', aspectRatio: 1.8, borderRadius: 10, marginTop: 18 }} accessibilityLabel={`${theory.title}の画像`} /> : null}

        <View testID="theory-summary" style={[styles.summaryBlock, compact && styles.summaryBlockCompact, !compact && styles.readingWidth]}>
          <View style={styles.summaryHeadingRow}><AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.summaryTitle}>{theory.quotation ? '言葉の背景' : seoCopy.summaryHeading}</AppText><View style={styles.summaryRule} /></View>
          <AppText style={[styles.summaryText, compact && styles.summaryTextCompact]}>{summary}</AppText>
        </View>

        <RelatedContentSection tone="theory"
          title="この考え方を実生活でどう使う？"
          testID="theory-related-techniques"
          items={related.map((card) => ({ key: card.id, title: card.title, supportingText: `${card.subcategory}｜${card.essence ?? card.subtitle ?? ''}`, href: { pathname: '/card/[id]', params: { id: card.id } } }))}
        />

        <TheoryNetwork theory={theory} />

        <RelatedFeatures kind="theory" id={theory.tagId} />

        <View testID="theory-information" style={[styles.informationSection, !compact && styles.readingWidth]}>
          <Pressable accessibilityRole="button" aria-expanded={informationOpen} accessibilityLabel="出典・理論情報" onPress={() => setInformationOpen(value => !value)} style={styles.informationToggle}><AppText variant="serif" style={styles.informationTitle}>出典・理論情報</AppText><AppText style={styles.informationIndicator}>{informationOpen ? '−' : '＋'}</AppText></Pressable>
          {informationOpen ? <TheoryInformation theory={theory} compact={compact} /> : null}
        </View>
      </DetailSwipe>
    </Screen>
  );
}

function formatTheorySummary(value: string) {
  const normalized = normalizeDisplayText(value);
  if (!normalized || normalized.includes('\n')) return normalized;
  const sentenceEnd = normalized.search(/[。！？!?]/);
  if (sentenceEnd === -1 || sentenceEnd >= normalized.length - 1) return normalized;
  return `${normalized.slice(0, sentenceEnd + 1)}\n${normalized.slice(sentenceEnd + 1).trimStart()}`;
}

function TheoryInformation({ theory, compact }: { theory: TheoryCard; compact: boolean }) {
  const provenance = getTheoryProvenance(theory);
  const rows = [
    ['出典状態', provenance.status],
    ['提唱者・著者', provenance.attribution],
    ...(provenance.period ? [['発表・刊行時期', provenance.period]] : []),
    ['著作・研究', provenance.works?.join('\n')],
    ['注記', provenance.note],
  ];
  return (
    <View style={styles.informationBody}>
      {rows.map(([label, value]) => (
        <View key={label} style={[styles.informationRow, compact && styles.informationRowCompact]}>
          <AppText style={[styles.informationLabel, compact && styles.informationLabelCompact]}>{label}</AppText>
          <AppText style={styles.informationValue}>{value || '—'}</AppText>
        </View>
      ))}
      {!!provenance.sources?.length && (
        <View style={[styles.informationRow, compact && styles.informationRowCompact]}>
          <AppText style={[styles.informationLabel, compact && styles.informationLabelCompact]}>出典を読む</AppText>
          <View style={styles.sourceLinks}>
            {provenance.sources.filter((source) => /^https:\/\//.test(source.url)).map((source) => (
              <Link key={source.url} href={source.url as `https://${string}`} target="_blank" rel="noopener noreferrer" style={styles.sourceLink}>
                {source.title}
              </Link>
            ))}
          </View>
        </View>
      )}
      {<AppText style={styles.sourceExplanation}>「書誌確認済み」は著者・文献・刊行情報を照合した状態です。出典状態は、効果の強さや再現性を示す評価ではありません。</AppText>}
    </View>
  );
}

const blue = catalogTheme.theory;
const styles = StyleSheet.create({
  screen: { backgroundColor: colors.paper },
  screenContent: { width: '100%', maxWidth: 1480, alignSelf: 'center', paddingHorizontal: 34, paddingTop: 24, paddingBottom: 132 },
  screenContentCompact: { paddingHorizontal: 16, paddingTop: 18 },
  article: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  titleRegion: { paddingHorizontal: 0, paddingTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  number: { color: blue.text, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, letterSpacing: 1.4 },
  categoryTag: { paddingHorizontal: 13, paddingVertical: 5, borderWidth: 1, borderColor: blue.border, borderRadius: radius.pill, backgroundColor: blue.inactive },
  categoryTagText: { color: blue.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  title: { marginTop: 10, color: blue.ink, fontFamily: fonts.serif, fontWeight: '700', letterSpacing: 1.2 },
  summaryBlock: { marginTop: 18, paddingHorizontal: 30, paddingVertical: 22, borderWidth: 1, borderColor: blue.border, borderRadius: radius.sm, backgroundColor: blue.surface },
  summaryBlockCompact: { paddingHorizontal: 18, paddingVertical: 18 },
  readingWidth: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  summaryHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryTitle: { color: blue.ink, fontSize: 17, lineHeight: 24, fontWeight: '700', letterSpacing: 1.2 },
  summaryRule: { width: 48, height: 1, backgroundColor: blue.border },
  summaryText: { marginTop: 12, color: blue.text, fontFamily: fonts.serif, fontSize: 17, lineHeight: 31, letterSpacing: 0.25 },
  summaryTextCompact: { fontSize: 17, lineHeight: 32 },
  informationToggle: { minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: blue.border },
  informationIndicator: { color: blue.ink, fontSize: 20 },
  informationSection: { marginTop: 34 },
  informationTitle: { paddingVertical: 12, color: blue.ink, fontSize: 20, lineHeight: 29, fontWeight: '700', letterSpacing: 0.7 },
  informationBody: { borderWidth: 1, borderColor: blue.border, borderRadius: radius.sm, backgroundColor: blue.surface, overflow: 'hidden' },
  informationRow: { minHeight: 58, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: blue.border },
  informationRowCompact: { flexDirection: 'column' },
  informationRowLast: { borderBottomWidth: 0 },
  informationLabel: { width: 170, paddingHorizontal: 22, paddingVertical: 17, borderRightWidth: 1, borderRightColor: blue.border, color: blue.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '700' },
  informationLabelCompact: { width: '100%', paddingHorizontal: 16, paddingVertical: 10, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: blue.border, color: blue.ink },
  informationValue: { flex: 1, paddingHorizontal: 20, paddingVertical: 17, color: blue.text, fontSize: 13, lineHeight: 22 },
  sourceLinks: { flex: 1, minWidth: 0, paddingHorizontal: 20, paddingVertical: 17, gap: 12 },
  sourceLink: { color: blue.ink, fontSize: 13, lineHeight: 22, textDecorationLine: 'underline', flexShrink: 1 },
  sourceExplanation: { paddingHorizontal: 20, paddingVertical: 14, color: blue.text, fontSize: 12, lineHeight: 20 },
  pressed: { opacity: 0.58 },
  retryButton: { alignSelf: 'center', minHeight: 46, marginTop: 18, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: blue.border, borderRadius: radius.pill },
  retryButtonText: { color: blue.ink, fontSize: 13, lineHeight: 19, fontWeight: '700' },
});
