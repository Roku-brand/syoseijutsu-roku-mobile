import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, BookTitle, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { TheoryArchiveCard } from '@/components/theory-archive-card';
import { AppText } from '@/components/ui';
import { categoryPalette, colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta, categoryOrder, getTechniqueDisplayId, techniqueCards, theories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useTabVisible } from '@/hooks/use-tab-visible';

type BrowseMode = 'personas' | 'theories';

const theoryCategories = [
  { id: 'psychology', title: '心理学', mark: '心' },
  { id: 'behavioral-science', title: '行動科学', mark: '行' },
  { id: 'organization-management', title: '組織・経営', mark: '組' },
  { id: 'strategy', title: '戦略論', mark: '戦' },
  { id: 'classics-thought', title: '古典・思想', mark: '古' },
  { id: 'maxims-experience', title: '名言・経験則', mark: '言' },
];

export default function DiscoverScreen() {
  const isFocused = useTabVisible();
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState<BrowseMode>('personas');
  const keywords = useMemo(() => query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean), [query]);
  const matches = useMemo(() => !keywords.length ? [] : techniqueCards.filter((card) => {
    const source = [card.title, card.subtitle, card.explanation, card.categoryName, card.subcategory, ...(card.tags ?? [])].filter(Boolean).join(' ').toLocaleLowerCase();
    return keywords.every((keyword) => source.includes(keyword));
  }), [keywords]);

  if (!isFocused) return null;
  return (
    <BookScreen>
      <BookTitle title="探す" subtitle="処世術と理論を、体系から探す。" />
      <View style={styles.searchBox}>
        <AppText style={styles.searchIcon}>⌕</AppText>
        <TextInput value={query} onChangeText={setQuery} placeholder="処世術・分類・キーワードを探す" placeholderTextColor={colors.muted} accessibilityLabel="処世術を検索" style={styles.searchInput} />
        {query ? <Pressable onPress={() => setQuery('')}><AppText style={styles.clear}>消す</AppText></Pressable> : null}
      </View>

      {keywords.length ? (
        <View>
          <OrnamentHeading>検索結果　{matches.length}</OrnamentHeading>
          {matches.length ? matches.map((card) => <TechniqueRow key={card.id} card={card} />) : <AppText style={styles.empty}>一致する処世術はありません。</AppText>}
        </View>
      ) : (
        <>
          <View accessibilityRole="tablist" style={styles.modeTabs}>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'personas' }} onPress={() => setMode('personas')} style={[styles.modeTab, mode === 'personas' && styles.modeTabActive]}><AppText style={[styles.modeText, mode === 'personas' && styles.modeTextActive]}>処世術から探す</AppText></Pressable>
            <Pressable accessibilityRole="tab" accessibilityState={{ selected: mode === 'theories' }} onPress={() => setMode('theories')} style={[styles.modeTab, mode === 'theories' && styles.modeTabActive]}><AppText style={[styles.modeText, mode === 'theories' && styles.modeTextActive]}>理論から探す</AppText></Pressable>
          </View>
          {mode === 'personas' ? <PersonaBrowser router={router} /> : <TheoryBrowser router={router} />}
        </>
      )}
    </BookScreen>
  );
}

function PersonaBrowser({ router }: { router: ReturnType<typeof useRouter> }) {
  const [activeCategory, setActiveCategory] = useState<CategoryKey>('interpersonal');
  return <View>
    <OrnamentHeading>処世術から探す</OrnamentHeading>
    <View accessibilityRole="tablist" style={styles.categoryTabGrid}>
      {categoryOrder.map((key) => {
        const category = categories.find((item) => item.key === key);
        if (!category) return null;
        const active = activeCategory === key;
        const count = category.subcategories.reduce((total, persona) => total + persona.items.length, 0);
        return <Pressable
          key={key}
          accessibilityRole="tab"
          accessibilityState={{ selected: active }}
          accessibilityLabel={`${categoryMeta[key].label}、${count}件`}
          onPress={() => setActiveCategory(key)}
          style={({ pressed }) => [styles.categoryTab, active && styles.categoryTabActive, pressed && styles.pressed]}
        >
          <View style={[styles.categoryTabMark, active && styles.categoryTabMarkActive]}>
            <AppText style={[styles.categoryTabMarkText, active && styles.categoryTabTextActive]}>{categoryMeta[key].mark}</AppText>
          </View>
          <AppText style={[styles.categoryTabTitle, active && styles.categoryTabTextActive]}>{categoryMeta[key].label}</AppText>
          <AppText style={[styles.categoryTabCount, active && styles.categoryTabCountActive]}>{count}件</AppText>
        </Pressable>;
      })}
    </View>
    {categoryOrder.filter((key) => key === activeCategory).map((key) => {
      const category = categories.find((item) => item.key === key);
      if (!category) return null;
      const palette = categoryPalette[key];
      const count = category.subcategories.reduce((total, persona) => total + persona.items.length, 0);
      const themes = [...new Set(category.subcategories.map((persona) => persona.articleTitle ?? 'その他'))];
      return <View key={key} style={styles.personaSection}>
        <View style={styles.categoryHeader}>
          <View style={[styles.categoryMark, { borderColor: palette.accent }]}><AppText style={[styles.categoryMarkText, { color: palette.accent }]}>{categoryMeta[key].mark}</AppText></View>
          <View style={styles.categoryCopy}><AppText style={styles.categoryTitle}>{category.name}</AppText><AppText style={styles.categoryDescription}>{categoryMeta[key].description}</AppText></View>
          <AppText style={[styles.categoryCount, { color: palette.accent }]}>{count}</AppText>
        </View>
        {themes.map((theme) => <View key={theme} style={styles.themeSection}>
          <View style={styles.themeHeading}>
            <AppText style={styles.themePath}>{category.name}　›</AppText>
            <AppText variant="serif" style={styles.themeTitle}>{theme}</AppText>
          </View>
          <View style={styles.personaList}>
            {category.subcategories.filter((persona) => (persona.articleTitle ?? 'その他') === theme).map((persona) => {
              const index = category.subcategories.findIndex((item) => item.name === persona.name);
              return <View key={persona.name} style={[styles.personaCard, { borderColor: palette.accent, backgroundColor: palette.tint }]}>
                <Pressable accessibilityRole="button" accessibilityLabel={`${persona.name}の一覧を開く`} onPress={() => router.push({ pathname: '/subcategory/[category]/[name]', params: { category: key, name: persona.name } })} style={({ pressed }) => [styles.personaHeader, pressed && styles.pressed]}>
                  <View style={[styles.personaNumber, { borderColor: palette.accent }]}><AppText style={[styles.personaNumberText, { color: palette.accent }]}>{String(index + 1).padStart(2, '0')}</AppText></View>
                  <View style={styles.personaCopy}><AppText variant="serif" style={styles.personaTitle}>{persona.name}</AppText><AppText variant="label" style={[styles.personaCount, { color: palette.accent }]}>{persona.items.length}件</AppText></View>
                  <AppText style={[styles.chevron, { color: palette.accent }]}>›</AppText>
                </Pressable>
                <View style={styles.techniqueList}>
                  {persona.items.map((item) => <Pressable key={item.id} accessibilityRole="link" accessibilityLabel={`${item.title}を開く`} onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })} style={({ pressed }) => [styles.techniqueItem, pressed && styles.techniqueItemPressed]}>
                    <AppText style={[styles.techniqueBullet, { color: palette.accent }]}>•</AppText>
                    <AppText style={styles.techniqueTitle}>{item.title}</AppText>
                    <AppText style={[styles.techniqueId, { color: palette.accent }]}>{getTechniqueDisplayId(item.id)}</AppText>
                  </Pressable>)}
                </View>
              </View>;
            })}
          </View>
        </View>)}
      </View>;
    })}
  </View>;
}

function TheoryBrowser({ router }: { router: ReturnType<typeof useRouter> }) {
  return <View><OrnamentHeading>理論から探す</OrnamentHeading><View style={styles.theoryGrid}>{theoryCategories.map((category) => <Pressable key={category.id} onPress={() => router.push({ pathname: '/theories/[category]', params: { category: category.id } })} style={({ pressed }) => [styles.theoryCard, pressed && styles.pressed]}><View style={styles.theoryMark}><AppText style={styles.theoryMarkText}>{category.mark}</AppText></View><AppText style={styles.theoryTitle}>{category.title}</AppText><AppText style={styles.theoryCount}>{theories.filter((theory) => theory.categoryId === category.id).length}件</AppText></Pressable>)}</View></View>;
}

const styles = StyleSheet.create({
  searchBox: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: colors.surface, marginBottom: spacing.xl },
  searchIcon: { color: colors.gold, fontFamily: fonts.serif, fontSize: 28 }, searchInput: { flex: 1, minHeight: 54, color: colors.ink, fontFamily: fonts.serif, fontSize: 16 }, clear: { color: colors.gold, fontWeight: '700', fontSize: 12 }, empty: { color: colors.muted, textAlign: 'center', padding: spacing.xl },
  modeTabs: { flexDirection: 'row', width: '100%', maxWidth: 540, alignSelf: 'center', padding: 4, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.paperDeep }, modeTab: { flex: 1, minHeight: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill }, modeTabActive: { backgroundColor: colors.charcoal }, modeText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, fontWeight: '700' }, modeTextActive: { color: colors.goldLight },
  personaSection: { marginTop: spacing.xl }, categoryHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg }, categoryMark: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, categoryMarkText: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' }, categoryCopy: { flex: 1 }, categoryTitle: { fontFamily: fonts.serif, fontSize: 21, lineHeight: 28, fontWeight: '700' }, categoryDescription: { marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 18 }, categoryCount: { fontFamily: fonts.serif, fontSize: 20, fontWeight: '700' },
  categoryTabGrid: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }, categoryTab: { flex: 1, minHeight: 126, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 7 }, categoryTabActive: { borderColor: colors.charcoal, backgroundColor: colors.charcoal }, categoryTabMark: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }, categoryTabMarkActive: { borderColor: colors.goldLight }, categoryTabMarkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' }, categoryTabTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, fontWeight: '700' }, categoryTabCount: { color: colors.muted, fontSize: 11, lineHeight: 16 }, categoryTabTextActive: { color: colors.goldLight }, categoryTabCountActive: { color: '#D7D0C2' },
  themeSection: { marginBottom: spacing.xl }, themeHeading: { flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 2 }, themePath: { color: colors.muted, fontSize: 12, lineHeight: 18 }, themeTitle: { fontSize: 18, lineHeight: 26, fontWeight: '700' },
  personaList: { gap: spacing.md }, personaCard: { overflow: 'hidden', borderWidth: 1, borderRadius: radius.md }, personaHeader: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm }, personaNumber: { width: 42, height: 42, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface }, personaNumberText: { fontFamily: fonts.serif, fontSize: 13, fontWeight: '700' }, personaCopy: { flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: spacing.sm }, personaTitle: { flex: 1, fontSize: 18, lineHeight: 26, fontWeight: '700' }, personaCount: { fontSize: 11 }, chevron: { fontSize: 28 },
  techniqueList: { paddingHorizontal: spacing.md, paddingBottom: spacing.md, backgroundColor: 'rgba(255,255,255,0.58)', borderTopWidth: 1, borderTopColor: colors.line }, techniqueItem: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(112,102,85,0.16)' }, techniqueItemPressed: { backgroundColor: 'rgba(255,255,255,0.72)' }, techniqueBullet: { fontSize: 18, lineHeight: 22 }, techniqueTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21 }, techniqueId: { fontSize: 10, lineHeight: 15, fontWeight: '700' },
  theoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }, theoryCard: { width: '31.5%', minHeight: 132, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center', gap: 8 }, theoryMark: { width: 45, height: 45, borderRadius: 23, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' }, theoryMarkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, fontWeight: '700' }, theoryTitle: { fontFamily: fonts.serif, fontSize: 14, fontWeight: '700', textAlign: 'center' }, theoryCount: { color: colors.muted, fontSize: 11 }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
