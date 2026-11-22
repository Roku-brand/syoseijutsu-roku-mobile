import retiredIds from '@/data/generated/retired-theory-ids.json';
import { isRetiredTheoryId, RETIRED_THEORY_TITLE } from '@/data/theory-knowledge';
import { TheoryNetwork } from '@/components/theory-network';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { canReadTechnique, canReadTheory } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { DetailSwipe } from '@/components/detail-swipe';
import { PageScroll } from '@/components/page-scroll';
import { LockedPreview } from '@/components/locked-preview';
import { TechniqueTitle } from '@/components/technique-title';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { detailColors, detailStyles } from '@/constants/detail-theme';
import { colors, fonts, radius } from '@/constants/theme';
import { getTechniquesForTheory, getTheoryDisplayId, theories, theoryById } from '@/data/catalog';
import { getTheorySeoCopy, isLockedTheoryShell, normalizeDisplayText } from '@/data/theory-display';
import { getTheoryProvenance } from '@/data/theory-sources';
import type { TheoryCard } from '@/data/types';
import { getTheoryPath } from '@/data/theory-taxonomy';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { recordContentEvent } from '@/lib/content-events';
import { useAppState } from '@/state/app-state';
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
  const introScrollRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  useEffect(() => {
    setInformationOpen(false);
    introScrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [id]);
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';

  useEffect(() => {
    if (theory && canReadTheory(effectiveAccess, theory.tagId)) {
      addHistory(theory.tagId);
      void recordContentEvent('theory', theory.tagId, 'view').catch(() => undefined);
    }
  }, [addHistory, effectiveAccess, theory]);

  if (isRetiredTheoryId(id)) return <Screen style={detailStyles.screen} contentContainerStyle={styles.screenContent}><EmptyState title={RETIRED_THEORY_TITLE} description="この知識は編集方針の見直しにより公開を終了しました。保存・閲覧履歴の記録は保持されています。" /></Screen>;
  if (!theory) {
    return <Screen style={detailStyles.screen} contentContainerStyle={styles.screenContent}><EmptyState title="理論が見つかりません" description="前の画面へ戻り、別の理論を選んでください。" /></Screen>;
  }

  if (!canReadTheory(effectiveAccess, theory.tagId)) return <LockedPreview source="discover_theory" title={normalizeDisplayText(theory.title)} />;

  if (isLockedTheoryShell(theory)) {
    const failed = secureContentStatus === 'error';
    return (
      <Screen style={detailStyles.screen} contentContainerStyle={styles.screenContent}>
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
  const currentIndex = theories.findIndex((item) => item.tagId === theory.tagId);
  const adjacentTheory = (offset: -1 | 1) => {
    const next = theories[(currentIndex + offset + theories.length) % theories.length];
    if (currentIndex < 0 || !next || next.tagId === theory.tagId) return;
    return {
      path: `/theory/${next.tagId}`,
      open: () => router.replace({ pathname: '/theory/[id]', params: { id: next.tagId } }),
      preview: canReadTheory(effectiveAccess, next.tagId) && !isLockedTheoryShell(next) && !isRetiredTheoryId(next.tagId) ? (
        <Screen scroll={false} style={[detailStyles.screen, styles.preview]}>
          <View style={[styles.readingInset, styles.introContent, styles.fixedIntro, styles.preview]}>
            <View style={styles.article}><TheoryHeading theory={next} compact={compact} preview /></View>
          </View>
          <View style={styles.readingInset}><View style={styles.article}><TheorySummary theory={next} preview /></View></View>
        </Screen>
      ) : null,
    };
  };
  const previous = adjacentTheory(-1);
  const next = adjacentTheory(1);

  return (
    <Screen scroll={false} style={detailStyles.screen}>
      <ScrollView ref={introScrollRef} testID="theory-fixed-intro" style={styles.fixedIntro}
        contentContainerStyle={[styles.readingInset, styles.introContent]} showsVerticalScrollIndicator={false} bounces={false} overScrollMode="never">
        <DetailSwipe style={styles.article} previous={previous} next={next}>
          <TheoryHeading theory={theory} compact={compact} />
        </DetailSwipe>
      </ScrollView>
      <PageScroll rememberOnTabSwitch ref={scrollRef} testID="theory-detail-scroll" style={styles.scrollingBody}
        contentContainerStyle={[styles.readingInset, styles.bodyContent]} keyboardShouldPersistTaps="handled">
        <DetailSwipe style={styles.article} previous={previous} next={next}>
          <TheorySummary theory={theory} />

          <View style={styles.sections}>
            <RelatedContentSection
              title="関連する処世術"
              testID="theory-related-techniques"
              items={related.map((card) => ({
                key: card.id,
                title: card.title,
                locked: !canReadTechnique(effectiveAccess, card.id),
                href: { pathname: '/card/[id]', params: { id: card.id } },
              }))}
            />

            <TheoryNetwork theory={theory} />

            <RelatedFeatures kind="theory" id={theory.tagId} />

            <View testID="theory-information">
              <Pressable accessibilityRole="button" aria-expanded={informationOpen} accessibilityLabel="出典・理論情報" onPress={() => setInformationOpen(value => !value)} style={styles.informationToggle}>
                <View accessibilityElementsHidden importantForAccessibility="no" style={detailStyles.sectionMark} />
                <AppText variant="serif" style={styles.informationTitle}>出典・理論情報</AppText>
                <AppText accessibilityElementsHidden style={styles.informationIndicator}>{informationOpen ? '−' : '＋'}</AppText>
              </Pressable>
              {informationOpen ? <TheoryInformation theory={theory} compact={compact} /> : null}
            </View>
          </View>
        </DetailSwipe>
      </PageScroll>
    </Screen>
  );
}

function TheoryHeading({ theory, compact, preview = false }: { theory: TheoryCard; compact: boolean; preview?: boolean }) {
  const title = theory.quotation ? `「${theory.quotation.translationText}」` : normalizeDisplayText(theory.title);
  const titleLength = [...title.replace(/\s/g, '')].length;
  const titleFontSize = compact
    ? titleLength <= 12 ? 31 : titleLength <= 18 ? 27 : 23
    : titleLength <= 12 ? 42 : titleLength <= 18 ? 36 : 31;
  return <View>
    <View testID={preview ? undefined : 'theory-meta'} style={detailStyles.numberRow}>
      <AppText style={detailStyles.number}>{getTheoryDisplayId(theory)}</AppText>
      <AppText style={detailStyles.metadata}>{getTheoryPath(theory)}</AppText>
    </View>
    <TechniqueTitle
      testID={preview ? undefined : 'theory-title'}
      title={title}
      minimumFontSize={20}
      accessibilityRole="header"
      aria-level={1}
      style={[detailStyles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.4) }]}
    />
    {theory.quotation ? <View testID={preview ? undefined : 'quotation-attribution'} style={styles.attribution}>
      <AppText variant="serif" style={styles.author}>— {theory.quotation.author}</AppText>
      <AppText style={styles.work}>{theory.quotation.work}　{theory.quotation.locator}</AppText>
    </View> : null}
    <View style={detailStyles.rule} />
  </View>;
}

function TheorySummary({ theory, preview = false }: { theory: TheoryCard; preview?: boolean }) {
  const summary = formatTheorySummary(theory.quotation?.contextNote ?? theory.summary);
  const seoCopy = getTheorySeoCopy(theory);
  const image = theory.imagePath ? contentImageUrl(theory.imagePath) : null;
  return <>
    {image ? <Image source={{ uri: image }} contentFit="cover" style={{ width: '100%', aspectRatio: 1.8, borderRadius: 10, marginTop: 18 }} accessibilityLabel={`${theory.title}の画像`} /> : null}
    <View testID={preview ? undefined : 'theory-summary'} style={detailStyles.summaryCard}>
      <AppText accessibilityRole="header" aria-level={2} variant="serif" style={detailStyles.summaryLabel}>
        {theory.quotation ? '言葉の背景' : seoCopy.summaryHeading}
      </AppText>
      <AppText variant="serif" style={detailStyles.summaryText}>{summary}</AppText>
    </View>
  </>;
}

function formatTheorySummary(value: string) {
  const normalized = normalizeDisplayText(value);
  const firstSentence = normalized.match(/^(?:「[^」]*」|『[^』]*』|（[^）]*）|[^「『（。！？!?])+[。！？!?]+/)?.[0];
  const splitAt = firstSentence?.length ?? normalized.indexOf('\n');
  if (splitAt === -1) return normalized;
  const remaining = normalized.slice(splitAt).trimStart();
  return remaining ? `${normalized.slice(0, splitAt)}\n\n${remaining}` : normalized;
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

const styles = StyleSheet.create({
  preview: { overflow: 'hidden' },
  screenContent: { width: '100%', maxWidth: 1480, alignSelf: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 132 },
  readingInset: { width: '100%', maxWidth: 1480, alignSelf: 'center', paddingHorizontal: 22 },
  introContent: { paddingTop: 12 },
  fixedIntro: { flexGrow: 0, flexShrink: 1, maxHeight: '45%' },
  scrollingBody: { flex: 1, minHeight: 0 },
  bodyContent: { paddingBottom: 132 },
  article: { width: '100%', maxWidth: 820, alignSelf: 'center' },
  attribution: { gap: 6, marginTop: 18 },
  author: { color: colors.ink, fontSize: 17, lineHeight: 28 },
  work: { color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  sections: { marginTop: 24, gap: 24 },
  informationToggle: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: 1, borderTopColor: detailColors.rule },
  informationIndicator: { color: colors.goldDeep, fontSize: 20 },
  informationTitle: { flex: 1, paddingVertical: 12, color: colors.ink, fontSize: 19, lineHeight: 28, fontWeight: '700', letterSpacing: 0.4 },
  informationBody: { borderWidth: 1, borderColor: detailColors.rule, borderRadius: radius.md, backgroundColor: detailColors.surface, overflow: 'hidden' },
  informationRow: { minHeight: 58, flexDirection: 'row', alignItems: 'stretch', borderBottomWidth: 1, borderBottomColor: detailColors.rule },
  informationRowCompact: { flexDirection: 'column' },
  informationLabel: { width: 170, paddingHorizontal: 22, paddingVertical: 17, borderRightWidth: 1, borderRightColor: detailColors.rule, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '700' },
  informationLabelCompact: { width: '100%', paddingHorizontal: 16, paddingVertical: 10, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: detailColors.rule },
  informationValue: { flex: 1, paddingHorizontal: 20, paddingVertical: 17, color: colors.inkSoft, fontSize: 13, lineHeight: 22 },
  sourceLinks: { flex: 1, minWidth: 0, paddingHorizontal: 20, paddingVertical: 17, gap: 12 },
  sourceLink: { color: colors.goldDeep, fontSize: 13, lineHeight: 22, textDecorationLine: 'underline', flexShrink: 1 },
  sourceExplanation: { paddingHorizontal: 20, paddingVertical: 14, color: colors.inkSoft, fontSize: 12, lineHeight: 20 },
  pressed: { opacity: 0.58 },
  retryButton: { alignSelf: 'center', minHeight: 46, marginTop: 18, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: detailColors.rule, borderRadius: radius.pill },
  retryButtonText: { color: colors.goldDeep, fontSize: 13, lineHeight: 19, fontWeight: '700' },
});
