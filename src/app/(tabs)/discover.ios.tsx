import { useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { SearchMark } from '@/components/search-mark';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const popularSearches = ['友達', '出世', '進路', '会話', '人間関係', '転職', '恋愛', '自己肯定感', '不安', '習慣', 'リーダーシップ', '交渉'];

const browseSections: Array<{ title: string; description: string; href: Href }> = [
  { title: '人物像から探す', description: '目指したい人物像から、必要な処世術を探します。', href: '/personas' },
  { title: '理論から探す', description: '心理学・行動科学・戦略論などの理論から探します。', href: '/theories' },
];

/**
 * Native keeps this tab deliberately small. The Web page presents large
 * horizontal card rails; rendering those rails inside a vertically scrolling
 * native screen has caused an iOS-only termination. Detail pages retain the
 * full catalog, so this is a navigation surface rather than a reduced catalog.
 */
export default function DiscoverScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const search = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    router.push({ pathname: '/search', params: { q: trimmed, mode: 'techniques' } } as unknown as Href);
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.searchBox}>
        <SearchMark />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => search(query)}
          returnKeyType="search"
          placeholder="処世術・人物像・理論を探す"
          placeholderTextColor={colors.muted}
          accessibilityLabel="処世術・人物像・理論・キーワードを検索"
          style={styles.searchInput}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="検索語を消す" onPress={() => setQuery('')}><AppText style={styles.clear}>消す</AppText></Pressable> : null}
      </View>

      <AppText style={styles.introduction}>いまの悩みや、なりたい自分から探せます。</AppText>
      <View style={styles.sectionList}>
        {browseSections.map((section) => (
          <Pressable
            key={section.title}
            accessibilityRole="button"
            accessibilityLabel={section.title}
            onPress={() => router.push(section.href)}
            style={({ pressed }) => [styles.sectionCard, pressed && styles.pressed]}
          >
            <View style={styles.sectionCopy}>
              <AppText style={styles.sectionTitle}>{section.title}</AppText>
              <AppText style={styles.sectionDescription}>{section.description}</AppText>
            </View>
            <AppText accessibilityElementsHidden style={styles.arrow}>›</AppText>
          </Pressable>
        ))}
      </View>

      <AppText style={styles.heading}>よく見られる検索</AppText>
      <View style={styles.chips}>
        {popularSearches.map((label) => (
          <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${label}で検索`} onPress={() => search(label)} style={({ pressed }) => [styles.chip, pressed && styles.pressed]}>
            <AppText style={styles.chipText}>{label}</AppText>
            <SearchMark size={15} color={colors.inkSoft} />
          </Pressable>
        ))}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  searchBox: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.78)' },
  searchInput: { flex: 1, minWidth: 0, minHeight: 52, padding: 0, margin: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 15 },
  clear: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  introduction: { marginTop: spacing.lg, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 23 },
  sectionList: { marginTop: spacing.md, gap: spacing.sm },
  sectionCard: { minHeight: 96, flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.78)' },
  sectionCopy: { flex: 1, minWidth: 0 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  sectionDescription: { marginTop: 5, color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19 },
  arrow: { color: colors.gold, fontFamily: fonts.serif, fontSize: 30, lineHeight: 34 },
  heading: { marginTop: spacing.xl, marginBottom: spacing.md, color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { minHeight: 42, flexGrow: 1, flexBasis: '45%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.62)' },
  chipText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  pressed: { opacity: 0.7 },
});
