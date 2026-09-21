import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { SearchMark } from '@/components/search-mark';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { APP_ROUTES } from '@/navigation/app-routes';

const popularSearches = ['友達', '出世', '進路', '会話', '人間関係', '転職', '恋愛', '自己肯定感', '不安', '習慣'];

export default function DiscoverScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;

  const openSearch = (query?: string) => {
    router.push({ pathname: '/search', params: { mode: 'techniques', ...(query ? { q: query } : {}) } });
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="処世術・人物像・理論を検索"
        onPress={() => openSearch()}
        style={({ pressed }) => [styles.search, compact && styles.searchCompact, pressed && styles.pressed]}
      >
        <SearchMark size={compact ? 25 : 29} color={colors.gold} />
        <AppText style={[styles.searchPlaceholder, compact && styles.searchPlaceholderCompact]}>処世術・人物像・理論を探す</AppText>
      </Pressable>

      <AppText style={[styles.lead, compact && styles.leadCompact]}>いまの悩みや、なりたい自分から探せます。</AppText>

      <View style={[styles.destinations, !compact && styles.destinationsWide]}>
        <DestinationCard
          title="人物像から探す"
          description="目指したい人物像から、必要な処世術を探します。"
          onPress={() => router.push(APP_ROUTES.personas)}
        />
        <DestinationCard
          title="理論から探す"
          description="心理学・行動科学・戦略論などの理論から探します。"
          onPress={() => router.push('/theories')}
        />
      </View>

      <View style={styles.popularSection}>
        <AppText accessibilityRole="header" aria-level={2} style={[styles.sectionTitle, compact && styles.sectionTitleCompact]}>よく見られる検索</AppText>
        <View style={styles.popularGrid}>
          {popularSearches.map((term) => (
            <Pressable
              key={term}
              accessibilityRole="button"
              accessibilityLabel={`${term}を検索`}
              onPress={() => openSearch(term)}
              style={({ pressed }) => [styles.popularButton, !compact && styles.popularButtonWide, pressed && styles.pressed]}
            >
              <AppText style={styles.popularText}>{term}</AppText>
              <SearchMark size={15} color={colors.inkSoft} />
            </Pressable>
          ))}
        </View>
      </View>
    </BookScreen>
  );
}

function DestinationCard({ title, description, onPress }: { title: string; description: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.destinationCard, pressed && styles.pressedCard]}
    >
      <View style={styles.destinationCopy}>
        <AppText style={styles.destinationTitle}>{title}</AppText>
        <AppText style={styles.destinationDescription}>{description}</AppText>
      </View>
      <AppText accessibilityElementsHidden style={styles.destinationArrow}>›</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 980, alignSelf: 'center', paddingBottom: spacing.xl * 3 },
  search: { width: '100%', minHeight: 76, marginTop: spacing.sm, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1.5, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.72)' },
  searchCompact: { minHeight: 58, marginTop: spacing.xs, paddingHorizontal: spacing.lg },
  searchPlaceholder: { color: colors.muted, fontFamily: fonts.serif, fontSize: 17, lineHeight: 25, letterSpacing: 0.4 },
  searchPlaceholderCompact: { fontSize: 14, lineHeight: 21 },
  lead: { marginTop: spacing.xl, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 15, lineHeight: 25, letterSpacing: 0.9 },
  leadCompact: { marginTop: spacing.lg, fontSize: 13, lineHeight: 22, letterSpacing: 0.35 },
  destinations: { width: '100%', marginTop: spacing.lg, gap: 12 },
  destinationsWide: { flexDirection: 'row' },
  destinationCard: { position: 'relative', flex: 1, minHeight: 142, paddingHorizontal: spacing.xl, paddingVertical: spacing.xl, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.74)', ...bookCardShadow },
  destinationCopy: { flex: 1, minWidth: 0, paddingRight: spacing.lg },
  destinationTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '700', letterSpacing: 0.8 },
  destinationDescription: { marginTop: spacing.sm, color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 22 },
  destinationArrow: { color: colors.gold, fontFamily: fonts.serif, fontSize: 31, lineHeight: 34 },
  popularSection: { marginTop: spacing.section },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 39, fontWeight: '700', letterSpacing: 1.5 },
  sectionTitleCompact: { fontSize: 23, lineHeight: 34 },
  popularGrid: { width: '100%', marginTop: spacing.lg, flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  popularButton: { width: '48%', flexGrow: 1, minHeight: 54, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.58)' },
  popularButtonWide: { width: '31%' },
  popularText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600', letterSpacing: 0.35 },
  pressed: { opacity: 0.7 },
  pressedCard: { opacity: 0.82, transform: [{ translateY: 1 }] },
});
