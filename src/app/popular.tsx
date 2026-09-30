import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image as ExpoImage } from 'expo-image';
import { Image, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { RankingArt } from '@/components/ranking-art';
import { fonts } from '@/constants/theme';
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
        <Text accessibilityRole="header" style={[styles.heading, compact && styles.headingCompact]}>人気の知恵</Text>
        <Text style={[styles.intro, compact && styles.introCompact]}>心に留めたい、{compact ? '\n' : ''}十の知恵。</Text>
        <View style={styles.shortRule} />
        <Text style={styles.heroDescription}>毎日の振る舞いに、考えるきっかけに。{'\n'}いま届けたい知恵を選びました。</Text>
      </View>
    </View>
    <View style={styles.body}>
      <View accessibilityRole="tablist" style={styles.tabs}>{divisions.map((item) => <Pressable key={item.id} testID={`ranking-tab-${item.id}`} accessibilityRole="tab" accessibilityState={{ selected: division === item.id }} onPress={() => setDivision(item.id)} style={[styles.tab, division === item.id && styles.tabActive]}>
        <Text style={[styles.tabLabel, division === item.id && styles.tabLabelActive]}>{item.label}</Text><Text style={[styles.tabCount, division === item.id && styles.tabLabelActive]}>TOP 10</Text>
      </Pressable>)}</View>
      <View style={styles.sectionHeading}><View><Text accessibilityRole="header" style={styles.sectionTitle}>{selected.label}</Text><Text style={styles.caption}>{selected.caption}</Text></View><Text style={styles.topTen}>TOP 10</Text></View>
      {offline ? <Text accessibilityLiveRegion="polite" style={styles.connectionNote}>接続できないため、保存済みのランキングを表示しています。</Text> : null}
      <View testID={`ranking-list-${division}`} style={styles.list}>{ranked.map((item, index) => {
        const podium = index < 3;
        const tone = podium ? metal[index] : '#A77C35';
        const canvas = podium ? ['#FFF8E9', '#F4F8FA', '#FFF3E8'][index] : '#FFFCF7';
        return <Pressable key={item.content_id} testID="ranking-card" accessibilityRole="link" accessibilityLabel={`${index + 1}位 ${item.category_title} ${item.title}を読む`} onPress={() => router.push(division === 'technique' ? techniqueRoute(item.content_id) : theoryRoute(item.content_id))}
          style={({ pressed }) => [styles.card, podium && styles.podium, compact && styles.cardCompact, compact && podium && styles.podiumCompact, { backgroundColor: canvas, borderColor: podium ? `${tone}70` : '#EADFCB' }, pressed && styles.pressed]}>
          <View style={[styles.art, !podium && styles.artSmall]}><RankingArt category={item.category_id} /></View>
          {Platform.OS === 'web' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundImage: `linear-gradient(90deg, ${canvas} 0%, ${canvas} 48%, ${canvas}e8 62%, ${canvas}00 90%)` } as ViewStyle]} />
            : <ExpoImage accessible={false} pointerEvents="none" contentFit="fill" style={StyleSheet.absoluteFill} source={{ uri: `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="200"><defs><linearGradient id="fade"><stop offset="0" stop-color="${canvas}"/><stop offset=".48" stop-color="${canvas}"/><stop offset=".62" stop-color="${canvas}" stop-opacity=".91"/><stop offset=".9" stop-color="${canvas}" stop-opacity="0"/></linearGradient></defs><rect width="1000" height="200" fill="url(#fade)"/></svg>`)}` }} />}
          <View style={[styles.rankWrap, compact && styles.rankWrapCompact]}>{podium ? <Medal color={tone} rank={index + 1} compact={compact} /> : <Text style={[styles.rank, { color: tone }]}>{String(index + 1).padStart(2, '0')}</Text>}</View>
          <View style={styles.copy}><View style={[styles.categoryPill, { backgroundColor: division === 'theory' ? '#45718E' : '#8C692E' }]}><Text style={styles.category}>{item.category_title}</Text></View><Text style={[styles.title, podium && styles.podiumTitle, compact && styles.titleCompact, compact && podium && styles.podiumTitleCompact]}>{item.title}</Text></View>
          <View style={[styles.arrowCircle, compact && styles.arrowCircleCompact]}><Text style={styles.arrow}>›</Text></View>
        </Pressable>;
      })}</View>
      {!ranked.length ? <Text style={styles.caption}>ランキングはただいま準備中です。</Text> : null}
      <Text style={styles.editorialNote}>編集部が選ぶ人気ランキング</Text>
    </View>
  </BookScreen>;
}
function Medal({ color, rank, compact }: { color: string; rank: number; compact: boolean }) {
  const leaves = Array.from({ length: 7 }, (_, i) => {
    const y = 42 + i * 6; const x = 14 + (i - 3) ** 2 * 0.9;
    return `<ellipse cx="${x}" cy="${y}" rx="2.3" ry="5" transform="rotate(-38 ${x} ${y})"/><ellipse cx="${100 - x}" cy="${y}" rx="2.3" ry="5" transform="rotate(38 ${100 - x} ${y})"/>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${color}" opacity=".85"><path d="M36 20L39 34H61L64 20L55 26L50 16L45 26Z"/><rect x="39" y="36" width="22" height="2"/>${leaves}</g></svg>`;
  return <View style={[styles.medal, compact && styles.medalCompact]}><ExpoImage source={{ uri: `data:image/svg+xml,${encodeURIComponent(svg)}` }} style={StyleSheet.absoluteFill} /><Text style={[styles.medalNumber, compact && styles.medalNumberCompact, { color }]}>{String(rank).padStart(2, '0')}</Text></View>;
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1120, paddingHorizontal: 0, paddingTop: 0, paddingBottom: 45, alignSelf: 'center' },
  hero: { height: 320, overflow: 'hidden', backgroundColor: '#F3E9D8' }, heroCompact: { height: 264 }, heroImage: { ...StyleSheet.absoluteFill, width: '100%', height: '100%' },
  heroCopy: { paddingHorizontal: 46, paddingTop: 38, width: '68%' }, heroCopyCompact: { paddingHorizontal: 22, paddingTop: 27, width: '79%' },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 18 }, eyebrow: { color: '#93651E', fontSize: 10, letterSpacing: 3, fontFamily: fonts.serif }, goldRule: { width: 42, height: 1, backgroundColor: '#BB995F' },
  heading: { color: '#171713', fontFamily: fonts.serif, fontSize: 49, lineHeight: 66, marginTop: 12, fontWeight: '700' }, headingCompact: { fontSize: 36, lineHeight: 52 },
  intro: { color: '#59564E', fontFamily: fonts.serif, fontSize: 22, lineHeight: 33 }, introCompact: { fontSize: 17, lineHeight: 25 }, shortRule: { marginTop: 18, marginBottom: 12, height: 2, width: 30, backgroundColor: '#AA7C2E' }, heroDescription: { fontFamily: fonts.serif, color: '#5A554A', fontSize: 12, lineHeight: 21 },
  body: { paddingHorizontal: 18 }, tabs: { flexDirection: 'row', gap: 10, marginTop: 22, marginBottom: 25 }, tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 66, borderWidth: 1, borderColor: '#D9C9AC', borderRadius: 12, backgroundColor: '#FFFCF7', gap: 4 }, tabActive: { backgroundColor: '#23352F', borderColor: '#23352F' }, tabLabel: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '700', color: '#5B5140' }, tabLabelActive: { color: '#FFF8E8' }, tabCount: { fontSize: 9, letterSpacing: 2, color: '#8E7954' },
  sectionHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, sectionTitle: { color: '#24251E', fontFamily: fonts.serif, fontSize: 22, lineHeight: 33, fontWeight: '700' }, caption: { color: '#7D7566', fontFamily: fonts.serif, fontSize: 11, lineHeight: 19 }, topTen: { color: '#A27D3D', fontSize: 10, letterSpacing: 2 }, list: { gap: 12 },
  card: { minHeight: 92, borderWidth: 1, borderRadius: 17, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', paddingRight: 18, paddingVertical: 13, boxShadow: '0 4px 16px rgba(85,64,29,0.07)' }, podium: { minHeight: 157, boxShadow: '0 5px 18px rgba(108,80,29,0.13)' }, cardCompact: { minHeight: 85, paddingRight: 12, borderRadius: 14 }, podiumCompact: { minHeight: 129 }, art: { position: 'absolute', right: 0, top: 0, bottom: 0, width: '50%' }, artSmall: { width: '38%' },
  rankWrap: { width: 118, alignItems: 'center', justifyContent: 'center' }, rankWrapCompact: { width: 75 }, rank: { fontFamily: fonts.serif, fontSize: 27, fontWeight: '500' }, medal: { width: 112, height: 112, justifyContent: 'center', alignItems: 'center', paddingTop: 21 }, medalCompact: { width: 76, height: 86, paddingTop: 17 }, medalNumber: { fontFamily: fonts.serif, fontSize: 41, fontWeight: '700' }, medalNumberCompact: { fontSize: 31 },
  copy: { flex: 1, minWidth: 0, gap: 7, paddingRight: 8 }, categoryPill: { alignSelf: 'flex-start', borderRadius: 20, paddingVertical: 3, paddingHorizontal: 12 }, category: { color: '#FFFFFF', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 }, title: { color: '#171916', fontFamily: fonts.serif, fontSize: 23, lineHeight: 34, fontWeight: '600' }, podiumTitle: { fontSize: 30, lineHeight: 43 }, titleCompact: { fontSize: 16, lineHeight: 25 }, podiumTitleCompact: { fontSize: 20, lineHeight: 30 },
  arrowCircle: { width: 42, height: 42, borderWidth: 1, borderColor: '#BC9656', borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFCF4E8' }, arrowCircleCompact: { width: 30, height: 30 }, arrow: { color: '#9B742D', fontSize: 29, lineHeight: 31, marginTop: -3 }, editorialNote: { fontFamily: fonts.serif, fontSize: 11, color: '#7A7366', textAlign: 'center', marginTop: 25 }, connectionNote: { color: '#805B28', fontSize: 11, lineHeight: 19, marginBottom: 12 }, pressed: { opacity: 0.76 },
});
