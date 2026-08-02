import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { DetailSwipe } from '@/components/detail-swipe';
import { useAppToast } from '@/components/app-toast';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getRelatedCards,
  getTechniqueDisplayId,
  techniqueById,
  techniqueCards,
  theoryById,
} from '@/data/catalog';
import { practiceGuidance } from '@/data/search';
import { useAppState } from '@/state/app-state';

export function generateStaticParams() {
  return Array.from(techniqueById.keys()).map((id) => ({ id }));
}

export default function CardDetailScreen() {
  const router = useRouter();
  const showToast = useAppToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = techniqueById.get(id);
  const { savedIds, toggleSaved, addHistory } = useAppState();

  useEffect(() => {
    if (id) addHistory(id);
  }, [addHistory, id]);

  const related = useMemo(() => (card ? getRelatedCards(card, 4) : []), [card]);

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

  const isSaved = savedIds.includes(card.id);
  const guidance = practiceGuidance[card.categoryKey];
  const relatedTheories = (card.theoryTagIds ?? [])
    .map((theoryId) => theoryById.get(theoryId))
    .filter(Boolean)
    .slice(0, 3);
  const explanation = splitExplanation(card.explanation, card.subtitle);
  const tags = Array.from(
    new Set([card.categoryName, card.subcategory, ...(card.tags ?? [])]),
  );

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

        <AppText
          variant="serif"
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          style={styles.title}
        >
          {card.title}
        </AppText>

        <View style={styles.metaRow}>
          <View style={styles.tagRow}>
            {tags.slice(0, 6).map((tag, index) => (
              <View
                key={tag}
                style={[styles.topTag, index === 0 && styles.topTagPrimary]}
              >
                <AppText
                  style={[
                    styles.topTagText,
                    index === 0 && styles.topTagTextPrimary,
                  ]}
                >
                  {tag}
                </AppText>
              </View>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSaved ? '保存を解除' : '蔵書に保存'}
              onPress={() => {
                toggleSaved(card.id);
                showToast(isSaved ? '蔵書から外しました' : '蔵書に保存しました');
              }}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <SymbolView
                name={{
                  ios: isSaved ? 'star.fill' : 'star',
                  android: isSaved ? 'star' : 'star_border',
                  web: isSaved ? 'star' : 'star_border',
                }}
                fallback={<AppText style={[styles.actionFallback, isSaved && styles.actionFallbackSaved]}>{isSaved ? '★' : '☆'}</AppText>}
                size={31}
                tintColor={colors.gold}
                weight="regular"
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="共有"
              onPress={() =>
                void Share.share({
                  title: '処世術禄',
                  message: `${card.title}\n\n${card.subtitle ?? ''}\n\n処世術禄`,
                })
              }
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }}
                fallback={<AppText style={styles.actionFallback}>⇧</AppText>}
                size={30}
                tintColor="#26372D"
                weight="regular"
              />
            </Pressable>
          </View>
        </View>

        <View style={styles.rule} />

        <View style={styles.summaryCard}>
          <View style={styles.bulbMark}>
            <View style={styles.bulbGlyph}>
              <View style={styles.bulbGlass} />
              <View style={styles.bulbStem} />
            </View>
          </View>
          <View style={styles.summaryCopy}>
            <AppText variant="serif" style={styles.summaryLabel}>
              一言でいうと
            </AppText>
            <AppText variant="serif" style={styles.summaryText}>
              {explanation.lead}
            </AppText>
          </View>
        </View>

        {!!explanation.body.length && (
          <ArticleSection title="解説">
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
              {guidance.actions.map((item) => (
                <View key={item} style={styles.checkRow}>
                  <View style={styles.checkMark}>
                    <AppText style={styles.checkText}>✓</AppText>
                  </View>
                  <AppText style={styles.practiceText}>{item}</AppText>
                </View>
              ))}
            </View>

            <View style={styles.cautionCard}>
              <View style={styles.cautionTitleRow}>
                <AppText style={styles.cautionIcon}>◎</AppText>
                <AppText variant="serif" style={styles.cautionTitle}>
                  注意点
                </AppText>
              </View>
              <AppText style={styles.cautionText}>{guidance.cautions[0]}</AppText>
            </View>
          </View>
        </ArticleSection>

        {relatedTheories.length > 0 && (
          <ArticleSection title="関連する理論" mark="▱">
            <View style={styles.theoryList}>
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
                    <AppText
                      variant="serif"
                      numberOfLines={2}
                      style={styles.theoryTitle}
                    >
                      {theory.title}
                    </AppText>
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
                  <AppText numberOfLines={2} style={styles.relatedText}>
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
  topTagPrimary: { backgroundColor: '#394439' },
  topTagText: { color: '#3B3B37', fontSize: 11, lineHeight: 16 },
  topTagTextPrimary: { color: '#FFFDF8' },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionButton: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#D8D0C3',
    borderRadius: 17,
    backgroundColor: '#FDFBF7',
  },
  actionFallback: { color: '#26372D', fontSize: 31, lineHeight: 35 },
  actionFallbackSaved: { color: colors.gold },
  pressed: { opacity: 0.55 },
  rule: { height: 1, marginTop: 18, backgroundColor: '#DFD7CA' },
  summaryCard: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#D7CFC1',
    borderRadius: 7,
    backgroundColor: '#FDFBF7',
  },
  bulbMark: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#26372D',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bulbGlyph: { width: 18, height: 24, alignItems: 'center' },
  bulbGlass: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderColor: '#D6B962',
    borderRadius: 8,
  },
  bulbStem: {
    width: 7,
    height: 5,
    marginTop: 1,
    borderTopWidth: 1.5,
    borderBottomWidth: 1.5,
    borderColor: '#D6B962',
  },
  summaryCopy: { flex: 1, minWidth: 0 },
  summaryLabel: { color: colors.gold, fontSize: 13, lineHeight: 19, marginBottom: 3 },
  summaryText: { color: '#141714', fontSize: 15, lineHeight: 24, fontWeight: '600' },
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
  sectionMark: { color: '#26372D', fontSize: 18, lineHeight: 23 },
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
    backgroundColor: '#314739',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#FFFFFF', fontSize: 11, lineHeight: 14, fontWeight: '800' },
  practiceText: { flex: 1, color: '#20231F', fontSize: 13, lineHeight: 20, fontWeight: '600' },
  cautionCard: {
    width: '100%',
    paddingHorizontal: 15,
    paddingVertical: 13,
    borderWidth: 1,
    borderColor: '#D0C4B1',
    borderRadius: 7,
    backgroundColor: '#FDFBF7',
  },
  cautionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  cautionIcon: { color: colors.gold, fontSize: 18, lineHeight: 20 },
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
    borderRadius: 7,
    backgroundColor: '#FDFBF7',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  theoryTitle: { flex: 1, color: '#1C211D', fontSize: 17, lineHeight: 25, fontWeight: '700' },
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
