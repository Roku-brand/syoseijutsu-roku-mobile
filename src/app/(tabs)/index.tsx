import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccess } from '@/access/access-state';
import { BookScreen, PrinciplesModal, bookCardShadow } from '../../components/book-ui';
import { HomeHeroCarousel } from '../../components/home-hero-carousel';
import { HomeRecommendationDeck } from '../../components/home-recommendation-deck';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { colors, fonts, layout } from '../../constants/theme';
import { APP_ROUTES } from '../../navigation/app-routes';


const shortcuts = [
  { label: '人物像', icon: 'square.grid.2x2', material: 'grid_view', fallback: '▦', route: APP_ROUTES.personas, testID: 'home-shortcut-personas' },
  { label: '人気ランキング', icon: 'crown', material: 'emoji_events', fallback: '♛', route: APP_ROUTES.popular, testID: 'home-shortcut-popular' },
  { label: '処世術を作る', icon: 'pencil', material: 'edit', fallback: '✎', route: { pathname: APP_ROUTES.myPage, params: { compose: '1' } }, testID: 'home-create-technique' },
  { label: '特集', icon: 'newspaper', material: 'article', fallback: '▤', route: APP_ROUTES.features, testID: 'home-shortcut-features' },
  { label: '五大原則', icon: 'building.columns', material: 'account_balance', fallback: '▥', action: 'principles', testID: 'home-shortcut-principles' },
] as const satisfies ReadonlyArray<{ label: string; icon: string; material: string; fallback: string; route: Href; testID: string } | { label: string; icon: string; material: string; fallback: string; action: 'principles'; testID: string }>;

export default function HomeScreen() {
  const router = useRouter();
  const { desktop, width } = useResponsiveLayout();
  const [principlesVisible, setPrinciplesVisible] = useState(false);
  const { accessState, catalogRevision, secureContentStatus, refreshAccess } = useAccess();
  const cardWidth = desktop ? 356 : Math.min(356, width - 70);

  return (
    <BookScreen contentContainerStyle={[styles.page, desktop && styles.pageDesktop]}>
      <HomeHeroCarousel desktop={desktop} catalogRevision={catalogRevision} />

      <View style={[styles.body, width < 700 && styles.bodyCompact]}>
      <View testID="home-shortcuts" style={styles.shortcuts}>
        {shortcuts.map((item) => <Pressable key={item.label} testID={item.testID} accessibilityRole={'route' in item ? 'link' : 'button'} accessibilityLabel={item.label} onPress={() => 'route' in item ? router.push(item.route) : setPrinciplesVisible(true)} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
          <SymbolView name={{ ios: item.icon, android: item.material, web: item.material }} fallback={<Text style={styles.shortcutFallback}>{item.fallback}</Text>} size={25} tintColor={colors.gold} weight="light" />
          <Text numberOfLines={2} style={[styles.shortcutLabel, !desktop && styles.shortcutLabelMobile, item.label === '人気ランキング' && width < 390 && { fontSize: width < 360 ? 10 : 11, paddingHorizontal: 0 }]}>{item.label === '人気ランキング' && !desktop ? '人気\nランキング' : item.label === '処世術を作る' ? '処世術を\n作る' : item.label}</Text>
        </Pressable>)}
      </View>

      <View testID="home-recommendations-section" style={styles.section}>
        <HomeRecommendationDeck cardWidth={cardWidth} />
      {accessState === 'paid' && secureContentStatus === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel="完全版データを再読み込み" onPress={() => void refreshAccess()} style={styles.dataStatus}><Text style={styles.dataStatusText}>一部の知識を読み込めませんでした。もう一度読み込む ›</Text></Pressable> : accessState === 'paid' && secureContentStatus === 'loading' ? <Text accessibilityLiveRegion="polite" style={styles.dataStatusText}>知識を読み込んでいます…</Text> : null}
      </View>



      </View>
      <PrinciplesModal visible={principlesVisible} compact={!desktop} onClose={() => setPrinciplesVisible(false)} />
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  dataStatus: { minHeight: 44, justifyContent: 'center' },
  dataStatusText: { color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 8 },
  page: { maxWidth: '100%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: layout.bottomContentInset + 24 }, pageDesktop: { paddingBottom: 48 },
  body: { width: '100%', maxWidth: layout.readingWidth, alignSelf: 'center', paddingHorizontal: 16 },
  bodyCompact: { paddingHorizontal: 12 },
  pressed: { opacity: 0.7 },
  shortcuts: { flexDirection: 'row', gap: 7, marginTop: 8 },
  shortcut: { flex: 1, minWidth: 0, minHeight: 74, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#EBE4D8', borderRadius: 13, ...bookCardShadow },
  shortcutFallback: { color: colors.gold, fontSize: 25, lineHeight: 27 },
  shortcutLabel: { color: colors.ink, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, fontWeight: '600', textAlign: 'center' },
  shortcutLabelMobile: { paddingHorizontal: 2, width: '100%' },
  section: { marginTop: 23 },
  sectionHeading: { marginBottom: 8 },
});
