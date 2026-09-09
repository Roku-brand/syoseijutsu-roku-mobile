import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { BookScreen } from '@/components/book-ui';
import { SearchMark } from '@/components/search-mark';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { getSearchResults, type BrowseMode } from '@/data/search-catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

export default function SearchScreen() {
  const params = useLocalSearchParams<{ q?: string; mode?: string }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const { isPaid, catalogRevision } = useAccess();
  const initialQuery = getParam(params.q);
  const [query, setQuery] = useState(initialQuery);
  const [submittedQuery, setSubmittedQuery] = useState(initialQuery);
  const [mode, setMode] = useState<BrowseMode>(getParam(params.mode) === 'theories' ? 'theories' : 'techniques');
  const { techniqueMatches, theoryMatches } = useMemo(
    () => getSearchResults(submittedQuery, isPaid),
    [catalogRevision, isPaid, submittedQuery],
  );
  const count = mode === 'techniques' ? techniqueMatches.length : theoryMatches.length;

  const submitSearch = () => {
    const trimmed = query.trim();
    setSubmittedQuery(trimmed);
    router.setParams({ q: trimmed, mode });
  };

  const changeMode = (nextMode: BrowseMode) => {
    setMode(nextMode);
    router.setParams({ q: submittedQuery, mode: nextMode });
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <AppText accessibilityRole="header" aria-level={1} style={[styles.title, compact && styles.titleCompact]}>キーワード検索</AppText>
        <AppText style={styles.subtitle}>Enterで確定した検索語を表示しています</AppText>
      </View>

      <View style={[styles.searchBox, compact && styles.searchBoxCompact]} testID="independent-search-box">
        <SearchMark />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={submitSearch}
          returnKeyType="search"
          placeholder="キーワードを入力してEnter"
          placeholderTextColor={colors.muted}
          accessibilityLabel="キーワードを検索"
          style={[styles.searchInput, compact && styles.searchInputCompact]}
        />
        {query ? <Pressable accessibilityRole="button" accessibilityLabel="検索語を消す" onPress={() => setQuery('')}><AppText style={styles.clearText}>消す</AppText></Pressable> : null}
      </View>

      <View accessibilityRole="tablist" style={styles.modeTabs}>
        <ModeTab label="処世術" selected={mode === 'techniques'} onPress={() => changeMode('techniques')} />
        <ModeTab label="理論" selected={mode === 'theories'} onPress={() => changeMode('theories')} />
      </View>

      {submittedQuery ? (
        <View testID="search-page-results" style={styles.results}>
          <View style={styles.resultHeading}>
            <AppText style={styles.resultTitle}>「{submittedQuery}」の検索結果</AppText>
            <AppText style={styles.resultNote}>{mode === 'techniques' ? '処世術' : '理論'} {count}件</AppText>
          </View>
          {count ? (
            <View>{mode === 'techniques'
              ? techniqueMatches.map((card) => <TechniqueRow key={card.id} card={card} />)
              : theoryMatches.map((theory) => <TheoryArchiveCard key={theory.tagId} theory={theory} />)}</View>
          ) : <View style={styles.empty}><AppText style={styles.emptyText}>一致するものはありません</AppText></View>}
        </View>
      ) : (
        <View style={styles.prompt}><AppText style={styles.promptTitle}>検索語を確定してください</AppText><AppText style={styles.promptText}>入力中は候補を表示せず、Enterで独立した結果ページを開きます。</AppText></View>
      )}
    </BookScreen>
  );
}

function ModeTab({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <Pressable accessibilityRole="tab" accessibilityState={{ selected }} onPress={onPress} style={[styles.modeTab, selected && styles.modeTabActive]}><AppText style={[styles.modeText, selected && styles.modeTextActive]}>{label}</AppText></Pressable>;
}

const styles = StyleSheet.create({
  content: { maxWidth: 1260, paddingBottom: spacing.xl * 2 },
  intro: { alignItems: 'center', paddingVertical: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '600', letterSpacing: 2 },
  titleCompact: { fontSize: 25, lineHeight: 36 },
  subtitle: { marginTop: 3, color: colors.gold, fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  searchBox: { minHeight: 68, marginTop: spacing.xl, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.75)' },
  searchBoxCompact: { minHeight: 56, marginTop: spacing.lg, paddingHorizontal: spacing.md },
  searchInput: { flex: 1, minWidth: 0, minHeight: 66, padding: 0, margin: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 14 },
  searchInputCompact: { minHeight: 54, fontSize: 13 },
  clearText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  modeTabs: { flexDirection: 'row', width: '100%', maxWidth: 820, alignSelf: 'center', marginTop: spacing.md, padding: 4, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  modeTab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  modeTabActive: { backgroundColor: colors.charcoal },
  modeText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, fontWeight: '600' },
  modeTextActive: { color: colors.goldLight },
  results: { marginTop: spacing.xl },
  resultHeading: { minHeight: 38, marginBottom: spacing.md, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.md, flexWrap: 'wrap' },
  resultTitle: { flex: 1, minWidth: 220, color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '600' },
  resultNote: { color: colors.muted, fontFamily: fonts.serif, fontSize: 12 },
  empty: { minHeight: 180, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  emptyText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 14 },
  prompt: { minHeight: 200, marginTop: spacing.xl, padding: spacing.xl, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.62)' },
  promptTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '600', textAlign: 'center' },
  promptText: { maxWidth: 440, marginTop: spacing.sm, color: colors.muted, fontSize: 13, lineHeight: 22, textAlign: 'center' },
});
