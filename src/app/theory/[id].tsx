import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { canReadTheory } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { DetailSwipe } from '@/components/detail-swipe';
import { LockedPreview } from '@/components/locked-preview';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { getRelatedTheories, getTechniquesForTheory, getTheoryDisplayId, theories, theoryById } from '@/data/catalog';
import { getTheoryCategoryLabel, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import { getTheoryProvenance } from '@/data/theory-sources';
import type { TheoryCard } from '@/data/types';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { recordContentEvent } from '@/lib/content-events';
import { useAppState } from '@/state/app-state';
import { SeoBreadcrumbs } from '@/components/seo-breadcrumbs';
import { RelatedContentSection } from '@/components/related-content-list';

export function generateStaticParams() {
  return Array.from(theoryById.keys()).map((id) => ({ id }));
}

export default function TheoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width > 0 && width < 700;
  const { accessState, catalogRevision, refreshAccess, secureContentStatus } = useAccess();
  const theory = useMemo(() => theoryById.get(id), [catalogRevision, id]);
  const { addHistory } = useAppState();
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';

  useEffect(() => {
    if (theory && canReadTheory(effectiveAccess, theory.tagId)) {
      addHistory(theory.tagId);
      void recordContentEvent('theory', theory.tagId, 'view').catch(() => undefined);
    }
  }, [addHistory, effectiveAccess, theory]);

  if (!theory) {
    return <Screen contentContainerStyle={styles.screenContent}><EmptyState title="理論が見つかりません" description="前の画面へ戻り、別の理論を選んでください。" /></Screen>;
  }

  if (!canReadTheory(effectiveAccess, theory.tagId)) return <LockedPreview source="discover_theory" />;

  if (isLockedTheoryShell(theory)) {
    const failed = secureContentStatus === 'error';
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <EmptyState
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
  const relatedTheories = getRelatedTheories(theory);
  const titleLength = [...theory.title.replace(/\s/g, '')].length;
  const titleFontSize = compact
    ? titleLength <= 12 ? 31 : titleLength <= 18 ? 27 : 23
    : titleLength <= 12 ? 42 : titleLength <= 18 ? 36 : 31;
  const summary = formatTheorySummary(theory.summary);
  const navigateTheory = (offset: -1 | 1) => {
    const currentIndex = theories.findIndex((item) => item.tagId === theory.tagId);
    const next = theories[(currentIndex + offset + theories.length) % theories.length];
    router.replace({ pathname: '/theory/[id]', params: { id: next.tagId } });
  };

  return (
    <Screen style={styles.screen} contentContainerStyle={[styles.screenContent, compact && styles.screenContentCompact]}>
      <DetailSwipe style={styles.article} onPrevious={() => navigateTheory(-1)} onNext={() => navigateTheory(1)}>
        <SeoBreadcrumbs items={[
          { label: '探す', href: '/discover' },
          { label: '理論', href: '/theories' },
          { label: getTheoryCategoryLabel(theory), href: { pathname: '/theories', params: { category: theory.categoryId } } },
          { label: normalizeDisplayText(theory.title) },
        ]} />
        <View style={styles.titleRegion}>
          <View testID="theory-meta" style={styles.metaRow}>
            <AppText style={styles.number}>{getTheoryDisplayId(theory)}</AppText>
            <View style={styles.categoryTag}><AppText style={styles.categoryTagText}>{getTheoryCategoryLabel(theory)}</AppText></View>
          </View>
          <AppText accessibilityRole="header" aria-level={1} testID="theory-title" variant="serif" style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.4) }]}>
            {normalizeDisplayText(theory.title)}
          </AppText>
        </View>

        <View testID="theory-summary" style={[styles.summaryBlock, compact && styles.summaryBlockCompact]}>
          <View style={styles.summaryHeadingRow}><AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.summaryTitle}>概要</AppText><View style={styles.summaryRule} /></View>
          <AppText style={[styles.summaryText, compact && styles.summaryTextCompact]}>{summary}</AppText>
        </View>

        <RelatedContentSection
          title="関連する処世術"
          testID="theory-related-techniques"
          items={related.map((card) => ({ key: card.id, title: card.title, supportingText: card.essence ?? card.subtitle, href: { pathname: '/card/[id]', params: { id: card.id } } }))}
        />

        <RelatedContentSection
          title="関連する理論"
          testID="theory-related-theories"
          items={relatedTheories.map((relatedTheory) => ({ key: relatedTheory.tagId, title: relatedTheory.title, supportingText: relatedTheory.summary, href: { pathname: '/theory/[id]', params: { id: relatedTheory.tagId } } }))}
        />

        <View testID="theory-information" style={styles.informationSection}>
          <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.informationTitle}>理論情報</AppText>
          <TheoryInformation theory={theory} compact={compact} />
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
    ['提唱者', provenance.attribution],
    ['著作・研究', provenance.works?.join('\n')],
    ['注記', provenance.note],
  ];
  return (
    <View style={styles.informationBody}>
      {rows.map(([label, value], index) => (
        <View key={label} style={[styles.informationRow, compact && styles.informationRowCompact, index === rows.length - 1 && styles.informationRowLast]}>
          <AppText style={[styles.informationLabel, compact && styles.informationLabelCompact]}>{label}</AppText>
          <AppText style={styles.informationValue}>{value || '—'}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.paper },
  screenContent: { width: '100%', maxWidth: 1480, alignSelf: 'center', paddingHorizontal: 34, paddingTop: 24, paddingBottom: 132 },
  screenContentCompact: { paddingHorizontal: 16, paddingTop: 18 },
  article: { width: '100%', maxWidth: 1326, alignSelf: 'center' },
  titleRegion: { paddingHorizontal: 18, paddingTop: 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12 },
  number: { color: '#575248', fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, letterSpacing: 1.4 },
  categoryTag: { paddingHorizontal: 13, paddingVertical: 5, borderWidth: 1, borderColor: '#D4C19D', borderRadius: radius.pill, backgroundColor: '#F5EFE4' },
  categoryTagText: { color: '#4B4439', fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  title: { marginTop: 10, color: '#11120F', fontFamily: fonts.serif, fontWeight: '700', letterSpacing: 1.2 },
  summaryBlock: { marginTop: 18, paddingHorizontal: 30, paddingVertical: 22, borderWidth: 1, borderColor: '#C99A42', borderRadius: radius.sm, backgroundColor: 'rgba(255,253,248,0.72)' },
  summaryBlockCompact: { paddingHorizontal: 18, paddingVertical: 18 },
  summaryHeadingRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryTitle: { color: '#9C6E1D', fontSize: 17, lineHeight: 24, fontWeight: '700', letterSpacing: 1.2 },
  summaryRule: { width: 48, height: 1, backgroundColor: '#C99A42' },
  summaryText: { marginTop: 12, color: '#22231F', fontFamily: fonts.serif, fontSize: 17, lineHeight: 31, letterSpacing: 0.25 },
  summaryTextCompact: { fontSize: 15, lineHeight: 28 },
  informationSection: { marginTop: 34 },
  informationTitle: { marginBottom: 10, paddingHorizontal: 16, color: '#A37420', fontSize: 20, lineHeight: 29, fontWeight: '700', letterSpacing: 0.7 },
  informationBody: { borderWidth: 1, borderColor: '#D3B77F', borderRadius: radius.sm, backgroundColor: 'rgba(255,253,248,0.62)', overflow: 'hidden' },
  informationRow: { minHeight: 58, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: '#E3D5BF' },
  informationRowCompact: { flexDirection: 'column' },
  informationRowLast: { borderBottomWidth: 0 },
  informationLabel: { width: 170, paddingHorizontal: 22, paddingVertical: 17, borderRightWidth: 1, borderRightColor: '#E3D5BF', color: '#302D27', fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '700' },
  informationLabelCompact: { width: '100%', paddingHorizontal: 16, paddingVertical: 10, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: '#EEE4D4', color: '#8E661E' },
  informationValue: { flex: 1, paddingHorizontal: 20, paddingVertical: 17, color: '#292A26', fontSize: 13, lineHeight: 22 },
  pressed: { opacity: 0.58 },
  retryButton: { alignSelf: 'center', minHeight: 46, marginTop: 18, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  retryButtonText: { color: colors.gold, fontSize: 13, lineHeight: 19, fontWeight: '700' },
});
