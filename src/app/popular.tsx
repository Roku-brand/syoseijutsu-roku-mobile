import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { RankingArt } from '@/components/ranking-art';
import { colors, fonts } from '@/constants/theme';
import { NavigationChevron } from '@/components/navigation-chevron';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { DEFAULT_RANKINGS, fetchPopularRankings, type RankedContent, type RankingDivision } from '@/data/popular-rankings';
import { techniqueRoute, theoryRoute } from '@/navigation/app-routes';

const divisions = [{ id: 'technique', label: '処世術部門', caption: '日々に活かす、振る舞いの知恵' }, { id: 'theory', label: '理論部門', caption: '人と社会を読み解く、思考の知恵' }] as const;
const metal = ['#AC7B23', '#7A858D', '#A66C39'];
export default function PopularScreen() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const [division, setDivision] = useState<RankingDivision>('technique');
  const [entries, setEntries] = useState<RankedContent[]>(DEFAULT_RANKINGS);
  const [offline, setOffline] = useState(false);
  useFocusEffect(useCallback(() => {
    let active = true;
    fetchPopularRankings().then((data) => { if (active) { setEntries(data); setOffline(false); } }).catch(() => { if (active) setOffline(true); });
    return () => { active = false; };
  }, []));
  const selected = divisions.find((item) => item.id === division)!;
  const ranked = entries.filter((item) => item.division === division).sort((a, b) => a.rank - b.rank).slice(0, 10);
  return <BookScreen contentContainerStyle={styles.page}>
    <View testID="popular-hero" style={[styles.hero, compact && styles.heroCompact]}>
      <Image source={require('../../assets/rankings/hero.webp')} accessible={false} style={styles.heroImage} resizeMode="cover" />
      <View style={[styles.heroCopy, compact && styles.heroCopyCompact]}>
        <View style={styles.eyebrowRow}><Text style={styles.eyebrow}>POPULAR RANKING</Text><View style={styles.goldRule} /></View>
        <Text accessibilityRole="header" style={[styles.heading, compact && styles.headingCompact]}>人気ランキング</Text>
        <Text style={[styles.intro, compact && styles.introCompact]}>処世術と理論、{compact ? '\n' : ''}それぞれのTOP 10。</Text>
      </View>
    </View>
    <View style={styles.body}>
      <View accessibilityRole="tablist" style={styles.tabs}>{divisions.map((item) => <Pressable key={item.id} testID={`ranking-tab-${item.id}`} accessibilityRole="tab" accessibilityState={{ selected: division === item.id }} onPress={() => setDivision(item.id)} style={[styles.tab, division === item.id && styles.tabActive]}>
        <Text style={[styles.tabLabel, division === item.id && styles.tabLabelActive]}>{item.label}</Text>
      </Pressable>)}</View>
      <View style={styles.sectionHeading}><View><Text accessibilityRole="header" style={styles.sectionTitle}>{selected.label}</Text><Text style={styles.caption}>{selected.caption}</Text></View><Text style={styles.topTen}>TOP 10</Text></View>
      {offline ? <Text accessibilityLiveRegion="polite" style={styles.connectionNote}>接続できないため、保存済みのランキングを表示しています。</Text> : null}
      <View testID={`ranking-list-${division}`} style={styles.list}>{ranked.map((item, index) => {
        const podium = index < 3;
        const tone = podium ? metal[index] : colors.inkSoft;
        const canvas = podium ? ['#FBF8F0', '#FAFAF9', '#FCF9F6'][index] : colors.surface;
        return <Pressable key={item.content_id} testID="ranking-card" accessibilityRole="link" accessibilityLabel={`${index + 1}位 ${item.category_title} ${item.title}を読む`} onPress={() => router.push(division === 'technique' ? techniqueRoute(item.content_id) : theoryRoute(item.content_id))}
          style={({ pressed }) => [styles.card, podium && styles.podium, compact && styles.cardCompact, compact && podium && styles.podiumCompact, { backgroundColor: canvas }, pressed && styles.pressed]}>
          <View style={[styles.art, !podium && styles.artSmall]}><RankingArt category={item.category_id} /></View>
          <View style={[styles.rankWrap, compact && styles.rankWrapCompact]}><View style={[styles.rankMark, compact && styles.rankMarkCompact, podium && { borderWidth: 1, borderColor: `${tone}70` }]}><Text style={[styles.rank, compact && styles.rankCompact, podium && styles.podiumRank, { color: tone }]}>{String(index + 1).padStart(2, '0')}</Text></View></View>
          <View style={styles.copy}><Text style={styles.category}>{item.category_title}</Text><Text style={[styles.title, podium && styles.podiumTitle, compact && styles.titleCompact, compact && podium && styles.podiumTitleCompact]}>{item.title}</Text></View>
          <NavigationChevron />
        </Pressable>;
      })}</View>
      {!ranked.length ? <Text style={styles.caption}>ランキングはただいま準備中です。</Text> : null}
    </View>
  </BookScreen>;
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1120, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 40, alignSelf: 'center' },
  hero: { height: 240, overflow: 'hidden', backgroundColor: colors.paperDeep },
  heroCompact: { height: 188 },
  heroImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%', opacity: 0.24 },
  heroCopy: { flex: 1, justifyContent: 'center', paddingHorizontal: 40, paddingVertical: 24 },
  heroCopyCompact: { paddingHorizontal: 20, paddingVertical: 20 },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  eyebrow: { color: colors.goldDeep, fontSize: 11, lineHeight: 16, letterSpacing: 1.5, fontFamily: fonts.sans },
  goldRule: { width: 32, height: 1, backgroundColor: colors.goldSoft },
  heading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 38, lineHeight: 52, marginTop: 8, fontWeight: '700' },
  headingCompact: { fontSize: 28, lineHeight: 40 },
  intro: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 16, lineHeight: 26, marginTop: 4 },
  introCompact: { fontSize: 14, lineHeight: 23 },
  body: { paddingHorizontal: 16 },
  tabs: { flexDirection: 'row', gap: 8, marginTop: 16, marginBottom: 16 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.inkSoft, borderColor: colors.inkSoft },
  tabLabel: { fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, fontWeight: '600', color: colors.inkSoft },
  tabLabelActive: { color: colors.surface },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 12 },
  sectionTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '700' },
  caption: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  topTen: { color: colors.goldDeep, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, letterSpacing: 1 },
  list: { gap: 10 },
  card: { minHeight: 96, borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingRight: 16, paddingVertical: 14 },
  podium: { minHeight: 120 }, cardCompact: { minHeight: 88, paddingRight: 12 }, podiumCompact: { minHeight: 108 },
  art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '25%', opacity: 0.1 }, artSmall: { opacity: 0.06 },
  rankWrap: { width: 76, alignItems: 'center', justifyContent: 'center' }, rankWrapCompact: { width: 60 },
  rankMark: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  rankMarkCompact: { width: 44, height: 44, borderRadius: 22 },
  rank: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 36, fontVariant: ['tabular-nums'] },
  rankCompact: { fontSize: 22, lineHeight: 32 }, podiumRank: { fontWeight: '600' },
  copy: { flex: 1, minWidth: 0, gap: 4, paddingRight: 8 },
  category: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 22, lineHeight: 32, fontWeight: '600' },
  podiumTitle: { fontSize: 23, lineHeight: 34 }, titleCompact: { fontSize: 18, lineHeight: 28 }, podiumTitleCompact: { fontSize: 19, lineHeight: 29 },
  connectionNote: { color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, marginBottom: 12 },
  pressed: { opacity: 0.76 },
});
