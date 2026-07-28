import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BookScreen, BookTitle, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  techniqueCards,
  theories,
  theoryById,
} from '@/data/catalog';
import type { TheoryCard } from '@/data/types';

const topics = [
  { label: '印象を良くしたい', mark: '印', tags: ['印象がいい人'] },
  { label: '会話が下手', mark: '話', tags: ['会話がうまい人'] },
  { label: 'なめられたくない', mark: '盾', tags: ['舐められない人'] },
  {
    label: 'したたかな交渉をしたい',
    mark: '交',
    tags: ['交渉がうまい人', '合意形成がうまい人'],
  },
  {
    label: '人生を充実させたい',
    mark: '充',
    tags: ['人生を充実させる人'],
  },
  { label: '不安でたまらない', mark: '心', tags: ['不安に強い人'] },
];

type Topic = (typeof topics)[number];

function searchableText(card: (typeof techniqueCards)[number]) {
  const linkedTheories = (card.theoryTagIds ?? [])
    .map((id) => theoryById.get(id))
    .filter(Boolean);
  return [
    card.title,
    card.subtitle,
    card.explanation,
    card.categoryName,
    card.subcategory,
    card.articleTitle,
    ...(card.tags ?? []),
    ...(card.theories ?? []),
    ...linkedTheories.flatMap((theory) => [
      theory?.title,
      theory?.summary,
      theory?.discipline,
    ]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

function searchableTheoryText(theory: TheoryCard) {
  return [
    theory.title,
    theory.summary,
    theory.definition,
    theory.categoryTitle,
    theory.sourceType,
    theory.discipline,
    theory.conceptType,
    theory.sourceName,
    theory.sourceDetail,
    ...(theory.domains ?? []),
    ...(theory.principles ?? []),
    ...(theory.keyPoints ?? []),
    ...(theory.strategies ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

function TheorySearchRow({ theory }: { theory: TheoryCard }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${theory.title}の理論カードを開く`}
      onPress={() =>
        router.push({
          pathname: '/theory/[id]',
          params: { id: theory.tagId },
        })
      }
      style={({ pressed }) => [
        styles.theoryRow,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.theoryCopy}>
        <AppText variant="label" style={styles.theoryMeta}>
          理論辞典 · {theory.categoryTitle}
        </AppText>
        <AppText style={styles.theoryTitle}>{theory.title}</AppText>
        {theory.summary ? (
          <AppText
            variant="caption"
            style={styles.theorySummary}
            numberOfLines={3}
          >
            {theory.summary}
          </AppText>
        ) : null}
      </View>
      <AppText style={styles.theoryChevron}>›</AppText>
    </Pressable>
  );
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);

  const searchTerms = useMemo(
    () =>
      query
        .trim()
        .toLocaleLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [query],
  );

  const keywordTechniqueResults = useMemo(() => {
    if (!searchTerms.length) return [];
    return techniqueCards
      .filter((card) => {
        const text = searchableText(card);
        return searchTerms.every((term) => text.includes(term));
      })
      .slice(0, 30);
  }, [searchTerms]);

  const keywordTheoryResults = useMemo(() => {
    if (!searchTerms.length) return [];
    return theories
      .filter((theory) => {
        const text = searchableTheoryText(theory);
        return searchTerms.every((term) => text.includes(term));
      })
      .slice(0, 30);
  }, [searchTerms]);

  const topicResults = useMemo(() => {
    if (!selectedTopic) return [];
    return techniqueCards.filter((card) =>
      selectedTopic.tags.some((tag) => card.tags?.includes(tag)),
    );
  }, [selectedTopic]);

  const chooseTopic = (topic: Topic) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setQuery('');
    setSelectedTopic(topic);
  };

  const searching = query.trim().length > 0;
  const showingResults = searching || selectedTopic !== null;
  const techniqueResults = searching ? keywordTechniqueResults : topicResults;
  const theoryResults = searching ? keywordTheoryResults : [];
  const resultCount = techniqueResults.length + theoryResults.length;
  const clearResults = () => {
    setQuery('');
    setSelectedTopic(null);
  };

  return (
    <BookScreen>
      <BookTitle title="探す" />

      <View style={styles.searchBox}>
        <AppText style={styles.searchIcon}>⌕</AppText>
        <TextInput
          value={query}
          onChangeText={(value) => {
            setQuery(value);
            setSelectedTopic(null);
          }}
          placeholder="悩み・理論・言葉を探す"
          placeholderTextColor="#99958C"
          accessibilityLabel="悩み・理論・言葉を検索"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {showingResults ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="検索を消す"
            onPress={clearResults}
            hitSlop={10}
          >
            <AppText style={styles.clear}>消す</AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText style={styles.lead}>いま必要な知恵へ、最短でたどり着く。</AppText>

      {showingResults ? (
        <View style={styles.results}>
          <OrnamentHeading>
            {selectedTopic?.label ?? '検索結果'}　{resultCount}
          </OrnamentHeading>
          {resultCount ? (
            <>
              {techniqueResults.length ? (
                <View style={styles.resultSection}>
                  {searching ? (
                    <AppText style={styles.resultKind}>
                      処世術　{techniqueResults.length}
                    </AppText>
                  ) : null}
                  {techniqueResults.map((card) => (
                    <TechniqueRow key={card.id} card={card} />
                  ))}
                </View>
              ) : null}
              {theoryResults.length ? (
                <View style={styles.resultSection}>
                  <AppText style={styles.resultKind}>
                    理論カード　{theoryResults.length}
                  </AppText>
                  {theoryResults.map((theory) => (
                    <TheorySearchRow key={theory.tagId} theory={theory} />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.empty}>
              <AppText style={styles.emptyTitle}>該当する知恵がありません</AppText>
              <AppText style={styles.emptyBody}>
                言葉を短くするか、別の表現で探してみてください。
              </AppText>
            </View>
          )}
        </View>
      ) : (
        <>
          <OrnamentHeading>悩みから探す</OrnamentHeading>
          <View style={styles.topicGrid}>
            {topics.map((topic) => (
              <Pressable
                key={topic.label}
                accessibilityRole="button"
                accessibilityLabel={`${topic.label}の処世術を探す`}
                onPress={() => chooseTopic(topic)}
                style={({ pressed }) => [
                  styles.topicCard,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.topicMark}>
                  <AppText style={styles.topicMarkText}>{topic.mark}</AppText>
                </View>
                <AppText style={styles.topicLabel}>{topic.label}</AppText>
              </Pressable>
            ))}
          </View>

          <OrnamentHeading>知識から探す</OrnamentHeading>
          <View style={styles.knowledgeRow}>
            {[
              { label: '処世術', mark: '冊', route: '/catalog' },
              { label: '理論辞典', mark: '理', route: '/catalog' },
              { label: '格言・古典', mark: '古', route: '/theories/classics-thought' },
            ].map((item) => (
              <Pressable
                key={item.label}
                onPress={() => router.push(item.route as never)}
                style={({ pressed }) => [
                  styles.knowledgeCard,
                  pressed && styles.pressed,
                ]}
              >
                <AppText style={styles.knowledgeMark}>{item.mark}</AppText>
                <AppText style={styles.knowledgeLabel}>{item.label}</AppText>
              </Pressable>
            ))}
          </View>
        </>
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 66,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    ...{
      shadowColor: '#4C4232',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 5 },
      elevation: 2,
    },
  },
  searchIcon: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 31,
    lineHeight: 36,
  },
  searchInput: {
    flex: 1,
    minHeight: 58,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 16,
    letterSpacing: 1,
  },
  clear: { color: colors.gold, fontWeight: '700', fontSize: 12 },
  lead: {
    marginTop: spacing.lg,
    textAlign: 'center',
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 23,
    letterSpacing: 1.2,
    color: colors.inkSoft,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  topicCard: {
    width: '46%',
    minHeight: 132,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  topicMark: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '700',
  },
  topicLabel: {
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  knowledgeRow: { flexDirection: 'row', gap: spacing.md },
  knowledgeCard: {
    flex: 1,
    minHeight: 74,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  knowledgeMark: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 17,
    fontWeight: '700',
  },
  knowledgeLabel: {
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  results: { marginTop: spacing.lg },
  resultSection: { marginBottom: spacing.lg },
  resultKind: {
    marginBottom: spacing.md,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  theoryRow: {
    minHeight: 132,
    marginBottom: spacing.lg,
    padding: spacing.xl,
    borderWidth: 2,
    borderColor: colors.gold,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    shadowColor: '#2B241A',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  theoryCopy: { flex: 1 },
  theoryMeta: { marginBottom: 6, color: colors.gold },
  theoryTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '600',
  },
  theorySummary: {
    marginTop: spacing.sm,
    color: colors.muted,
    lineHeight: 20,
  },
  theoryChevron: {
    color: colors.gold,
    fontSize: 30,
    lineHeight: 34,
  },
  empty: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
  },
  emptyBody: { marginTop: spacing.sm, color: colors.muted, textAlign: 'center' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
