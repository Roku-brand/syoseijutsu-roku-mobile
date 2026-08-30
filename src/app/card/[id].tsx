import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { DetailSwipe } from '@/components/detail-swipe';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getRelatedCards,
  getTechniqueDisplayId,
  getTheoryDisplayId,
  techniqueById,
  techniqueCards,
  theoryById,
} from '@/data/catalog';
import { practiceGuidance } from '@/data/search';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { canReadTechnique } from '@/access/access-config';
import { LockedPreview } from '@/components/locked-preview';

export function generateStaticParams() {
  return Array.from(techniqueById.keys()).map((id) => ({ id }));
}

export default function CardDetailScreen() {
  'use no memo';
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addHistory } = useAppState();
  const { accessState, catalogRevision } = useAccess();
  const card = useMemo(() => techniqueById.get(id), [catalogRevision, id]);
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';

  useEffect(() => {
    if (id) addHistory(id);
  }, [addHistory, id]);

  const related = useMemo(() => (card ? getRelatedCards(card, 4) : []), [card, catalogRevision]);

  if (card && !canReadTechnique(effectiveAccess, card.id)) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <LockedPreview title={card.subcategory} description="この分類の処世術は完全版で読むことができます。無料版では実タイトルと本文を配信していません。" count={1} source="discover_technique" />
      </Screen>
    );
  }

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

  const fallbackGuidance = practiceGuidance[card.categoryKey];
  const guidance = card.practicalActions ?? {
    todayActions: fallbackGuidance.actions,
    examples: [],
    cautions: fallbackGuidance.cautions,
  };
  const relatedTheories = (card.theoryTagIds ?? [])
    .map((theoryId) => theoryById.get(theoryId))
    .filter((theory): theory is NonNullable<typeof theory> => Boolean(theory));
  const explanation = splitExplanation(card.explanation, card.subtitle);
  const essence = card.essence ?? explanation.lead;
  const titleLength = [...card.title.replace(/\s/g, '')].length;
  const titleFontSize = titleLength <= 18 ? 32 : titleLength <= 24 ? 28 : 23;

  const navigateCard = (offset: -1 | 1) => {
    const currentIndex = techniqueCards.findIndex((item) => item.id === card.id);
    const next =
      techniqueCards[
        (currentIndex + offset + techniqueCards.length) % techniqueCards.length
      ];
    router.replace({ pathname: '/card/[id]', params: { id: next.id } });
  };

  return (
    <Screen
      style={styles.screen}
      contentContainerStyle={styles.screenContent}
    >
      <DetailSwipe
        style={styles.article}
        onPrevious={() => navigateCard(-1)}
        onNext={() => navigateCard(1)}
      >
        <AppText style={styles.number}>{getTechniqueDisplayId(card)}</AppText>
        {card.importance ? <AppText style={styles.number}>{'★'.repeat(card.importance)}</AppText> : null}

        <AppText
          variant="serif"
          style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.46) }]}
        >
          {card.title}
        </AppText>

        <View style={styles.rule} />

        <View style={styles.summaryCard}>
          <View style={styles.bulbMark} testID="technique-essence-marker">
            <View style={styles.bulbGlyph}>
              <View style={styles.bulbGlass} />
              <View style={styles.bulbStem} />
            </View>
          </View>
          <View style={styles.summaryCopy}>
            <AppText variant="serif" style={styles.summaryLabel}>
            本質
            </AppText>
            <AppText
              testID="technique-essence"
              variant="serif"
              style={styles.summaryText}
            >
              {cleanText(essence)}
            </AppText>
          </View>
        </View>

        {!!explanation.body.length && (
          <ArticleSection title="原理と解説">
            <View style={styles.explanation}>
              {explanation.body.map((paragraph, index) => (
                <RichParagraph key={`${paragraph.slice(0, 20)}-${index}`}>
                  {paragraph}
                </RichParagraph>
              ))}
            </View>
          </ArticleSection>
        )}

        <ArticleSection title="今日からできる実践" ruled>
          <View style={styles.practiceArea}>
            <View style={styles.practiceList}>
              {guidance.todayActions.map((item) => (
                <View key={item} style={styles.checkRow}>
                  <View style={styles.checkMark}>
                    <AppText style={styles.checkText}>✓</AppText>
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
                <View style={styles.cautionTitleRow}><AppText variant="serif" style={styles.cautionTitle}>注意点</AppText></View>
                <AppText style={styles.cautionText}>{item}</AppText>
              </View>
            ))}
          </View>
        </ArticleSection>

        {relatedTheories.length > 0 && (
          <ArticleSection title="関連する理論" mark="▱">
            <View testID="related-theories" style={styles.theoryList}>
              {relatedTheories.map((theory) =>
                theory ? (
                  <Pressable
                    key={theory.tagId}
                    accessibilityRole="button"
                    accessibilityLabel={`${theory.title}を開く`}
                    onPress={() =>
                      router.push({
                        pathname: '/theory/[id]',
                        params: { id: theory.tagId },
                      })
                    }
                    style={({ pressed }) => [
                      styles.theoryItem,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.theoryCopy}>
                      <AppText style={styles.theoryId}>{getTheoryDisplayId(theory)}</AppText>
                      <AppText variant="serif" style={styles.theoryTitle}>{theory.title}</AppText>
                    </View>
                    <AppText style={styles.chevron}>›</AppText>
                  </Pressable>
                ) : null,
              )}
            </View>
          </ArticleSection>
        )}

        {related.length > 0 && (
          <ArticleSection title="関連する処世術" mark="▱">
            <View style={styles.relatedGrid}>
              {related.map((relatedCard) => (
                <Pressable
                  key={relatedCard.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${relatedCard.title}を開く`}
                  onPress={() =>
                    router.push({
                      pathname: '/card/[id]',
                      params: { id: relatedCard.id },
                    })
                  }
                  style={({ pressed }) => [
                    styles.relatedItem,
                    pressed && styles.pressed,
                  ]}
                >
                  <AppText style={styles.relatedChevron}>›</AppText>
                  <AppText style={styles.relatedText}>
                    {getTechniqueDisplayId(relatedCard)} {relatedCard.title}
                  </AppText>
                </Pressable>
              ))}
            </View>
          </ArticleSection>
        )}

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
      </DetailSwipe>
    </Screen>
  );
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
        {mark ? <AppText style={styles.sectionMark}>{mark}</AppText> : <View style={styles.goldBar} />}
        <AppText variant="serif" style={styles.sectionTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FBF8F2' },
  screenContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 132,
  },
  article: { width: '100%', maxWidth: 980, alignSelf: 'center' },
  number: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 7,
  },
  title: {
    width: '100%',
    color: '#111311',
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 50,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
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
  rule: { height: 1, marginTop: 18, backgroundColor: '#DFD7CA' },
  summaryCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#D7CFC1',
    borderRadius: radius.md,
    backgroundColor: '#FDFBF7',
  },
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
  summaryLabel: { color: colors.gold, fontSize: 13, lineHeight: 19, marginBottom: 11, paddingRight: 38 },
  summaryText: { color: '#141714', fontSize: 16, lineHeight: 29, fontWeight: '600' },
  section: { marginTop: 24 },
  sectionRuled: {
    paddingTop: 19,
    borderTopWidth: 1,
    borderTopColor: '#DFD7CA',
  },
  sectionHeading: {
    minHeight: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 13,
  },
  goldBar: { width: 4, height: 23, backgroundColor: '#B28B3A' },
  sectionMark: { color: colors.gold, fontSize: 18, lineHeight: 23 },
  sectionTitle: {
    color: '#24251F',
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  explanation: { gap: 13, paddingHorizontal: 7 },
  explanationText: {
    color: '#252925',
    fontSize: 14,
    lineHeight: 25,
    letterSpacing: 0.15,
  },
  explanationStrong: { color: '#111411', fontWeight: '700' },
  practiceArea: { gap: 15 },
  practiceList: { gap: 8, paddingVertical: 4 },
  checkRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  checkMark: {
    width: 18,
    height: 18,
    marginTop: 1,
    borderRadius: 9,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  practiceText: { flex: 1, color: '#20231F', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  exampleList: { gap: 9 },
  exampleCard: {
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderLeftWidth: 3,
    borderLeftColor: '#B28B3A',
    borderRadius: radius.sm,
    backgroundColor: '#F3EFE6',
  },
  exampleText: { color: '#272923', fontSize: 13, lineHeight: 21 },
  cautionList: { gap: 9 },
  cautionCard: {
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#D0C4B1',
    borderRadius: radius.md,
    backgroundColor: '#FDFBF7',
  },
  cautionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  cautionTitle: { color: '#6A5120', fontSize: 14, lineHeight: 20, fontWeight: '700' },
  cautionText: { color: '#272923', fontSize: 12, lineHeight: 19, fontWeight: '600' },
  theoryList: { gap: 9 },
  theoryItem: {
    width: '100%',
    minHeight: 58,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#D9D0C2',
    borderRadius: radius.md,
    backgroundColor: '#FDFBF7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  theoryCopy: { flex: 1, minWidth: 0 },
  theoryId: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5 },
  theoryTitle: { color: '#1C211D', fontSize: 17, lineHeight: 25, fontWeight: '700' },
  chevron: { color: colors.gold, fontSize: 22, lineHeight: 22 },
  relatedGrid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 20, rowGap: 8 },
  relatedItem: { width: '47%', minHeight: 24, flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  relatedChevron: { color: colors.gold, fontSize: 19, lineHeight: 20 },
  relatedText: { flex: 1, color: '#31342F', fontSize: 11, lineHeight: 18 },
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
