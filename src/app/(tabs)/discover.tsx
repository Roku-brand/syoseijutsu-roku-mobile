import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, BookTitle, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards, theories, theoryById } from '@/data/catalog';
import { guidedTopicGroups } from '@/data/guided-topics';
import type { TheoryCard } from '@/data/types';

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

export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const searchTerms = useMemo(
    () =>
      query
        .trim()
        .toLocaleLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [query],
  );

  const techniqueResults = useMemo(() => {
    if (!searchTerms.length) return [];
    return techniqueCards
      .filter((card) => {
        const text = searchableText(card);
        return searchTerms.every((term) => text.includes(term));
      })
      .slice(0, 30);
  }, [searchTerms]);

  const theoryResults = useMemo(() => {
    if (!searchTerms.length) return [];
    return theories
      .filter((theory) => {
        const text = searchableTheoryText(theory);
        return searchTerms.every((term) => text.includes(term));
      })
      .slice(0, 30);
  }, [searchTerms]);

  const searching = searchTerms.length > 0;
  const resultCount = techniqueResults.length + theoryResults.length;

  return (
    <BookScreen>
      <BookTitle title="探す" />

      <View style={styles.searchBox}>
        <AppText style={styles.searchIcon}>⌕</AppText>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="悩み・理論・言葉を探す"
          placeholderTextColor="#99958C"
          accessibilityLabel="悩み・理論・言葉を検索"
          returnKeyType="search"
          style={styles.searchInput}
        />
        {searching ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="検索を消す"
            onPress={() => setQuery('')}
            hitSlop={10}
          >
            <AppText style={styles.clear}>消す</AppText>
          </Pressable>
        ) : null}
      </View>
      <AppText style={styles.lead}>
        いま必要な知恵へ、最短でたどり着く。
      </AppText>

      {searching ? (
        <View style={styles.results}>
          <OrnamentHeading>検索結果　{resultCount}</OrnamentHeading>
          {resultCount ? (
            <>
              {techniqueResults.length ? (
                <View style={styles.resultSection}>
                  <AppText style={styles.resultKind}>
                    処世術　{techniqueResults.length}
                  </AppText>
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
                    <TheoryArchiveCard key={theory.tagId} theory={theory} />
                  ))}
                </View>
              ) : null}
            </>
          ) : (
            <View style={styles.empty}>
              <AppText style={styles.emptyTitle}>
                該当する知恵がありません
              </AppText>
              <AppText style={styles.emptyBody}>
                言葉を短くするか、別の表現で探してみてください。
              </AppText>
            </View>
          )}
        </View>
      ) : (
        <>
          <OrnamentHeading>悩みから探す</OrnamentHeading>
          {guidedTopicGroups.map((group) => (
            <View key={group.title} style={styles.topicGroup}>
              <AppText style={styles.topicGroupTitle}>{group.title}</AppText>
              <View style={styles.topicGrid}>
                {group.topics.map((topic) => (
                  <Pressable
                    key={topic.slug}
                    accessibilityRole="button"
                    accessibilityLabel={`${topic.label}の処世術一覧を開く`}
                    onPress={() =>
                      router.push({
                        pathname: '/topic/[slug]',
                        params: { slug: topic.slug },
                      })
                    }
                    style={({ pressed }) => [
                      styles.topicCard,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.topicMark}>
                      <AppText style={styles.topicMarkText}>{topic.mark}</AppText>
                    </View>
                    <AppText style={styles.topicLabel}>{topic.label}</AppText>
                    <AppText style={styles.topicArrow}>›</AppText>
                  </Pressable>
                ))}
              </View>
            </View>
          ))}

          <OrnamentHeading>知識から探す</OrnamentHeading>
          <View style={styles.knowledgeRow}>
            {[
              { label: '処世術', mark: '術', route: '/catalog' },
              { label: '理論辞典', mark: '理', route: '/catalog' },
              {
                label: '格言・古典',
                mark: '古',
                route: '/theories/classics-thought',
              },
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
    shadowColor: '#4C4232',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
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
  topicGroup: { marginBottom: spacing.xl },
  topicGroupTitle: {
    marginBottom: spacing.md,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 1.4,
  },
  topicGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  topicCard: {
    width: '46%',
    minHeight: 94,
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.55)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  topicMark: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 21,
    fontWeight: '700',
  },
  topicLabel: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600',
  },
  topicArrow: {
    color: colors.gold,
    fontSize: 24,
    lineHeight: 27,
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
  emptyBody: {
    marginTop: spacing.sm,
    color: colors.muted,
    textAlign: 'center',
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
