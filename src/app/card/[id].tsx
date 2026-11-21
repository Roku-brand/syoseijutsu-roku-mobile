import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { PageScroll } from '@/components/page-scroll';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { DetailSwipe } from '@/components/detail-swipe';
import { detailColors, detailStyles } from '@/constants/detail-theme';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getRelatedCards,
  getTechniqueDisplayId,
  techniqueById,
  techniqueCards,
  theoryById,
} from '@/data/catalog';
import { practiceGuidance } from '@/data/search';
import { getRelatedTheoryDefinition } from '@/data/theory-display';
import { mergedTechniqueIds, resolveTechniqueId } from '@/data/technique-identity';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { canReadTechnique, canReadTheory } from '@/access/access-config';
import { LockedPreview } from '@/components/locked-preview';
import { recordContentEvent } from '@/lib/content-events';
import { RelatedContentSection } from '@/components/related-content-list';
import { RelatedFeatures } from '@/components/related-features';
import { techniqueRoute, theoryRoute, upgradeRoute } from '@/navigation/app-routes';
import { contentImageUrl } from '@/lib/content-media';
import { TechniqueTitle } from '@/components/technique-title';
import type { TechniqueCard } from '@/data/types';

const detailTabs = [{ key: 'explanation', label: '解説' }, { key: 'practice', label: '実践' }, { key: 'related', label: '関連知識' }] as const;
type DetailTab = (typeof detailTabs)[number]['key'];

export function generateStaticParams() {
  return [...techniqueById.keys(), ...mergedTechniqueIds].map((id) => ({ id }));
}

export default function CardDetailScreen() {
  'use no memo';
  const router = useRouter();
  const [tab, setTab] = useState<DetailTab>('explanation');
  const introScrollRef = useRef<ScrollView>(null);
  const scrollRef = useRef<ScrollView>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const { id } = useLocalSearchParams<{ id: string }>();
  const canonicalId = resolveTechniqueId(id);
  const { addHistory } = useAppState();
  const { accessState, catalogRevision } = useAccess();
  const card = useMemo(() => canonicalId === id ? techniqueById.get(id) : undefined, [catalogRevision, canonicalId, id]);
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';

  useEffect(() => {
    if (card && canReadTechnique(effectiveAccess, card.id)) {
      addHistory(card.id);
      void recordContentEvent('technique', card.id, 'view').catch(() => undefined);
    }
  }, [addHistory, card, effectiveAccess]);

  useEffect(() => {
    setTab('explanation');
    introScrollRef.current?.scrollTo({ y: 0, animated: false });
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  }, [id]);

  const selectTab = (next: typeof tab) => {
    if (next === tab) return;
    fade.setValue(0);
    setTab(next);
    Animated.timing(fade, { toValue: 1, duration: 200, useNativeDriver: Platform.OS !== 'web' }).start();
  };

  const related = useMemo(() => (card ? getRelatedCards(card, 4) : []), [card, catalogRevision]);
  if (canonicalId !== id) return <Redirect href={techniqueRoute(canonicalId)} />;

  if (card && !canReadTechnique(effectiveAccess, card.id)) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <LockedPreview title={card.subcategory} description="この分類の処世術は完全版で読むことができます。無料版では実タイトルと本文を配信していません。" count={1} source="discover_technique" />
      </Screen>
    );
  }

  if (!card) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <EmptyState
          title="処世術が見つかりません"
          description="コンテンツが更新された可能性があります。前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  const fallbackGuidance = practiceGuidance[card.categoryKey] ?? practiceGuidance.interpersonal!;
  const guidance = card.practicalActions ?? {
    todayActions: fallbackGuidance.actions,
    examples: [],
    cautions: fallbackGuidance.cautions,
  };
  const relatedTheories = (card.theoryTagIds ?? [])
    .map((theoryId) => theoryById.get(theoryId))
    .filter((theory): theory is NonNullable<typeof theory> => Boolean(theory));
  const primaryTheoryIds = new Set(card.primaryTheoryIds ?? card.theoryTagIds ?? []);
  const primaryTheories = relatedTheories.filter((theory) => primaryTheoryIds.has(theory.tagId));
  const supplementaryTheories = relatedTheories.filter((theory) => !primaryTheoryIds.has(theory.tagId));
  const toTheoryItem = (theory: (typeof relatedTheories)[number]) => {
    const readable = canReadTheory(effectiveAccess, theory.tagId);
    return {
      key: theory.tagId,
      title: theory.title,
      supportingText: readable ? getRelatedTheoryDefinition(theory) : undefined,
      href: readable ? theoryRoute(theory.tagId) : upgradeRoute('discover_theory'),
    };
  };
  const explanation = splitExplanation(card.explanation, card.subtitle);
  const essence = card.essence ?? explanation.lead;
  const currentIndex = techniqueCards.findIndex(item => item.id === card.id);
  const adjacentCard = (offset: -1 | 1) => {
    const next = techniqueCards[(currentIndex + offset + techniqueCards.length) % techniqueCards.length];
    if (currentIndex < 0 || !next || next.id === card.id) return;
    return {
      path: `/card/${next.id}`,
      open: () => router.replace({ pathname: '/card/[id]', params: { id: next.id } }),
      preview: canReadTechnique(effectiveAccess, next.id) ? <TechniquePagePreview card={next} /> : null,
    };
  };
  const previous = adjacentCard(-1);
  const next = adjacentCard(1);

  return (
    <Screen scroll={false} style={detailStyles.screen}>
      <ScrollView
        ref={introScrollRef}
        style={styles.fixedIntro}
        contentContainerStyle={[styles.readingInset, styles.introContent]}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <DetailSwipe style={styles.article} previous={previous} next={next}>
          <TechniqueHeading card={card} />
        </DetailSwipe>
      </ScrollView>
      <PageScroll
        rememberOnTabSwitch
        ref={scrollRef}
        style={styles.scrollingBody}
        contentContainerStyle={[styles.readingInset, styles.bodyContent]}
        keyboardShouldPersistTaps="handled"
        testID="technique-detail-scroll"
      >
        <DetailSwipe style={styles.article} previous={previous} next={next}>
          <TechniqueEssence card={card} essence={essence} />
          <TechniqueTabs tab={tab} onSelect={selectTab} />
          <Animated.View style={{ opacity: fade }}>
          {tab === 'explanation' && <TechniqueExplanation paragraphs={explanation.body} />}

          {tab === 'practice' && <>
          <ArticleSection title="今日からできる実践">
            <View style={styles.practiceArea}>
              <View style={styles.practiceList}>
                {guidance.todayActions.map((item, index) => (
                  <View key={`${item}-${index}`} style={[styles.checkRow, index === guidance.todayActions.length - 1 && styles.checkRowLast]}>
                    <View style={styles.checkMark}>
                      <AppText style={styles.checkText}>{index + 1}</AppText>
                    </View>
                    <AppText style={styles.practiceText}>{item}</AppText>
                  </View>
                ))}
              </View>

            </View>
          </ArticleSection>

          {guidance.examples.length > 0 && (
            <ArticleSection title="具体例">
              <View style={styles.exampleList}>
                {guidance.examples.map((item) => (
                  <View key={item} style={styles.exampleCard}>
                    <AppText style={styles.exampleText}>{item}</AppText>
                  </View>
                ))}
              </View>
            </ArticleSection>
          )}

          <ArticleSection title="注意点">
            <View style={styles.cautionList}>
              {guidance.cautions.map((item) => (
                <View key={item} style={styles.cautionCard}>
                  <AppText accessibilityElementsHidden style={styles.cautionIcon}>!</AppText>
                  <AppText style={styles.cautionText}>{item}</AppText>
                </View>
              ))}
            </View>
          </ArticleSection>

          </>}

          {tab === 'related' && <>
          <View style={styles.relatedContent}>
            {relatedTheories.length > 0 && (
              <View testID="related-theories" style={styles.relatedSections}>
                <RelatedContentSection
                  title="主要理論"
                  description="理解の入口となる代表的な理論"
                  testID="primary-theories"
                  items={primaryTheories.map(toTheoryItem)}
                />
                <RelatedContentSection
                  title="あわせて読む理論"
                  description="実践を補う知識や、別の視点を与える思想・言葉"
                  testID="supplementary-theories"
                  items={supplementaryTheories.map(toTheoryItem)}
                />
              </View>
            )}

            <RelatedFeatures kind="technique" id={card.id} />

            <RelatedContentSection
              title="関連する処世術"
              description="あわせて身につけたい実践知"
              testID="related-techniques"
              items={related.map((relatedCard) => ({ key: relatedCard.id, title: relatedCard.title, href: { pathname: '/card/[id]', params: { id: relatedCard.id } } }))}
            />
          </View>

          {!!card.tags?.length && (
            <ArticleSection title="タグ">
              <View style={styles.bottomTags}>
                {card.tags.map((tag) => (
                  <View key={tag} style={styles.bottomTag}>
                    <AppText style={styles.bottomTagText}>{tag}</AppText>
                  </View>
                ))}
              </View>
            </ArticleSection>
          )}
          </>}
          </Animated.View>
        </DetailSwipe>
      </PageScroll>
    </Screen>
  );
}

function TechniquePagePreview({ card }: { card: TechniqueCard }) {
  const explanation = splitExplanation(card.explanation, card.subtitle);
  return (
    <Screen scroll={false} style={[detailStyles.screen, styles.preview]}>
      <View style={[styles.readingInset, styles.introContent]}>
        <View style={styles.article}><TechniqueHeading card={card} preview /></View>
      </View>
      <View style={[styles.readingInset, styles.bodyContent]}>
        <View style={styles.article}>
          <TechniqueEssence card={card} essence={card.essence ?? explanation.lead} preview />
          <TechniqueTabs tab="explanation" />
          <TechniqueExplanation paragraphs={explanation.body} />
        </View>
      </View>
    </Screen>
  );
}

function TechniqueHeading({ card, preview = false }: { card: TechniqueCard; preview?: boolean }) {
  const personaName = card.subcategory.trim();
  return <>
    <View testID={preview ? undefined : 'technique-detail-number'} style={detailStyles.numberRow}>
      <AppText style={detailStyles.number}>{getTechniqueDisplayId(card)}</AppText>
      {card.importance ? <AppText testID={preview ? undefined : 'technique-detail-importance'} style={detailStyles.number}>{'★'.repeat(card.importance)}</AppText> : null}
      {personaName ? <AppText testID={preview ? undefined : 'technique-detail-persona'} style={detailStyles.metadata}>{personaName}</AppText> : null}
    </View>
    <TechniqueTitle testID={preview ? undefined : 'technique-detail-title'} title={card.title} minimumFontSize={20} accessibilityRole="header" aria-level={1} style={detailStyles.title} />
    <View style={detailStyles.rule} />
  </>;
}

function TechniqueEssence({ card, essence, preview = false }: { card: TechniqueCard; essence: string; preview?: boolean }) {
  const image = card.imagePath ? contentImageUrl(card.imagePath) : null;
  return <>
    {image ? <Image source={{ uri: image }} contentFit="cover" style={{ width: '100%', aspectRatio: 1.8, borderRadius: 10, marginTop: 18 }} accessibilityLabel={`${card.title}の画像`} /> : null}
    <View style={[detailStyles.summaryCard, styles.summaryLayout]}>
      <View style={styles.bulbMark} testID={preview ? undefined : 'technique-essence-marker'}>
        <View style={styles.bulbGlyph}><View style={styles.bulbGlass} /><View style={styles.bulbStem} /></View>
      </View>
      <View style={styles.summaryCopy}>
        <AppText variant="serif" style={[detailStyles.summaryLabel, styles.summaryLabelInset]}>本質</AppText>
        <AppText testID={preview ? undefined : 'technique-essence'} variant="serif" style={detailStyles.summaryText}>{cleanText(essence)}</AppText>
      </View>
    </View>
  </>;
}

function TechniqueTabs({ tab, onSelect }: { tab: DetailTab; onSelect?: (tab: DetailTab) => void }) {
  return (
    <View style={styles.tabs} testID={onSelect ? 'technique-detail-tabs' : undefined}>
      <View style={styles.tabRow} accessibilityRole="tablist">
        {detailTabs.map(item => {
          const active = tab === item.key;
          const style = [styles.tab, active && styles.tabSelected];
          const label = <AppText numberOfLines={1} style={[styles.tabText, active && styles.tabTextSelected]}>{item.label}</AppText>;
          return onSelect
            ? <Pressable key={item.key} accessibilityRole="tab" aria-selected={active} accessibilityState={{ selected: active }} onPress={() => onSelect(item.key)} style={style}>{label}</Pressable>
            : <View key={item.key} style={style}>{label}</View>;
        })}
      </View>
    </View>
  );
}

function TechniqueExplanation({ paragraphs }: { paragraphs: string[] }) {
  return paragraphs.length ? (
    <ArticleSection title="原理と解説">
      <View style={styles.explanation}>
        {paragraphs.map((paragraph, index) => <RichParagraph key={`${paragraph.slice(0, 20)}-${index}`}>{paragraph}</RichParagraph>)}
      </View>
    </ArticleSection>
  ) : null;
}

function splitExplanation(value?: string, subtitle?: string) {
  const paragraphs = (value ?? '')
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const first = paragraphs[0] ?? '';
  const firstIsLead = first.startsWith('**') && first.endsWith('**');

  return {
    lead: cleanText(firstIsLead ? first : subtitle ?? first),
    body: firstIsLead ? paragraphs.slice(1) : paragraphs,
  };
}

function cleanText(value: string) {
  return value.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
}

function RichParagraph({ children }: { children: string }) {
  return (
    <AppText style={styles.explanationText}>
      {children.split(/(\*\*.*?\*\*)/g).map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <AppText key={`${part}-${index}`} style={styles.explanationStrong}>
            {part.slice(2, -2)}
          </AppText>
        ) : (
          part
        ),
      )}
    </AppText>
  );
}

function ArticleSection({
  title,
  mark,
  ruled = false,
  children,
}: {
  title: string;
  mark?: string;
  ruled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.section, ruled && styles.sectionRuled]}>
      <View style={styles.sectionHeading}>
        {mark ? <AppText style={styles.sectionMark}>{mark}</AppText> : <View style={detailStyles.sectionMark} />}
        <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { overflow: 'hidden' },
  readingInset: {
    width: '100%',
    maxWidth: 1420,
    alignSelf: 'center',
    paddingHorizontal: 22,
  },
  screenContent: { paddingTop: 12, paddingBottom: 132 },
  // A long title at large text sizes must leave space to scroll the article.
  fixedIntro: { flexGrow: 0, flexShrink: 1, maxHeight: '45%' },
  introContent: { paddingTop: 12 },
  scrollingBody: { flex: 1, minHeight: 0 },
  bodyContent: { paddingBottom: spacing.xl },
  article: { width: '100%', maxWidth: 1226, alignSelf: 'center' },
  metaRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tagRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  topTag: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderRadius: radius.pill,
    backgroundColor: '#F0ECE4',
  },
  topTagPrimary: { backgroundColor: colors.charcoal },
  topTagText: { color: '#3B3B37', fontSize: 11, lineHeight: 16 },
  topTagTextPrimary: { color: '#FFFDF8' },
  pressed: { opacity: 0.55 },
  summaryLayout: { flexDirection: 'row', alignItems: 'flex-start' },
  bulbMark: {
    position: 'absolute',
    top: 14,
    right: 16,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbGlyph: { width: 14, height: 18, alignItems: 'center' },
  bulbGlass: {
    width: 12,
    height: 12,
    borderWidth: 1.5,
    borderColor: '#D6B962',
    borderRadius: 8,
  },
  bulbStem: {
    width: 6,
    height: 4,
    marginTop: 1,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#D6B962',
  },
  summaryCopy: { width: '100%' },
  summaryLabelInset: { paddingRight: 38 },
  tabs: { width: '100%', marginTop: 24, backgroundColor: detailColors.background, borderBottomWidth: 1, borderBottomColor: '#DED5C7' },
  tabRow: { width: '100%', flexDirection: 'row', flexWrap: 'nowrap' },
  tab: { flex: 1, minWidth: 0, height: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabSelected: { borderBottomColor: '#A47B2F' },
  tabText: { color: '#55534E', fontSize: 14, fontWeight: '600' },
  tabTextSelected: { color: '#9A7127' },
  relatedContent: { paddingTop: 12, gap: 24 },
  relatedSections: { gap: 24 },
  section: { marginTop: 24 },
  sectionRuled: {
    paddingTop: 19,
    borderTopWidth: 1,
    borderTopColor: detailColors.rule,
  },
  sectionHeading: {
    minHeight: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 13,
  },
  sectionMark: { color: colors.goldDeep, fontSize: 18, lineHeight: 23 },
  sectionTitle: {
    color: '#24251F',
    fontSize: 19,
    lineHeight: 27,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  explanation: { gap: 13, paddingHorizontal: 7 },
  explanationText: {
    color: '#252925',
    fontSize: 16,
    lineHeight: 29,
    letterSpacing: 0.15,
  },
  explanationStrong: { color: '#111411', fontWeight: '700' },
  practiceArea: { gap: 15 },
  practiceList: { borderWidth: 1, borderColor: '#DED0BB', borderRadius: radius.md, backgroundColor: detailColors.surface, overflow: 'hidden' },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingHorizontal: 16, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#E9E1D4' },
  checkRowLast: { borderBottomWidth: 0 },
  checkMark: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: 12,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  practiceText: { flex: 1, color: '#20231F', fontSize: 15, lineHeight: 26, fontWeight: '600' },
  exampleList: { gap: 9 },
  exampleCard: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderLeftWidth: 3,
    borderLeftColor: detailColors.accent,
    borderRadius: radius.sm,
    backgroundColor: '#F3EFE6',
  },
  exampleText: { color: '#272923', fontSize: 16, lineHeight: 28 },
  cautionList: { gap: 9 },
  cautionCard: {
    width: '100%',
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#D0C4B1',
    borderRadius: radius.md,
    backgroundColor: detailColors.surface,
  },
  cautionIcon: { color: '#9A824F', fontSize: 14, fontWeight: '700', lineHeight: 25 },
  cautionText: { flex: 1, color: '#272923', fontSize: 14, lineHeight: 25, fontWeight: '600' },
  bottomTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bottomTag: {
    minHeight: 26,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: '#F0ECE4',
  },
  bottomTagText: { color: '#454640', fontSize: 10, lineHeight: 15 },
});


