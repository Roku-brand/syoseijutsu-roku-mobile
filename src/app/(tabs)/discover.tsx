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
import { techniqueCards } from '@/data/catalog';

const topics = [
  { label: '第一印象', mark: '印', words: ['第一印象', '初頭', '印象'] },
  { label: 'なめられない人', mark: '盾', words: ['なめられない', '境界線', '自己主張'] },
  { label: '仕事ができる人', mark: '仕', words: ['仕事', '評価', '成果'] },
  { label: '恋愛・人間関係', mark: '縁', words: ['恋愛', '人間関係', '信頼'] },
  { label: '不安を整える', mark: '心', words: ['不安', '心配', '感情'] },
  { label: '人生の選択', mark: '路', words: ['人生', '選択', '進路'] },
];

function searchableText(card: (typeof techniqueCards)[number]) {
  return [
    card.title,
    card.subtitle,
    card.explanation,
    card.categoryName,
    card.subcategory,
    card.articleTitle,
    ...(card.tags ?? []),
    ...(card.theories ?? []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase();
}

export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const terms = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);
    if (!terms.length) return [];
    return techniqueCards
      .filter((card) => {
        const text = searchableText(card);
        return terms.some((term) => text.includes(term));
      })
      .slice(0, 30);
  }, [query]);

  const chooseTopic = (words: string[]) => {
    void Haptics.selectionAsync().catch(() => undefined);
    setQuery(words.join(' '));
  };

  const searching = query.trim().length > 0;

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
      <AppText style={styles.lead}>いま必要な知恵へ、最短でたどり着く。</AppText>

      {searching ? (
        <View style={styles.results}>
          <OrnamentHeading>検索結果　{results.length}</OrnamentHeading>
          {results.length ? (
            results.map((card) => <TechniqueRow key={card.id} card={card} />)
          ) : (
            <View style={styles.empty}>
              <AppText style={styles.emptyTitle}>該当する処世術がありません</AppText>
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
                onPress={() => chooseTopic(topic.words)}
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
