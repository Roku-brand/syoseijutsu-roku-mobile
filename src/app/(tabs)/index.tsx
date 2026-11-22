import { HomeShortcutDecoration } from '@/components/home-shortcut-decoration';
import { HomeThemeBackdrop } from '@/components/home-theme-backdrop';
import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useRef, useState } from 'react';
import type { RequestScrollRefresh, ScrollRefreshTask } from '@/hooks/use-web-page-elasticity';
import { Image, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

import { useAccess } from '@/access/access-state';
import { BookScreen, PrinciplesModal, bookCardShadow } from '../../components/book-ui';
import { HomeEditorialStrip } from '../../components/home-editorial-strip';
import { HomeRecommendationDeck } from '../../components/home-recommendation-deck';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { colors, fonts, layout } from '../../constants/theme';
import { APP_ROUTES, upgradeRoute } from '../../navigation/app-routes';
import { COMPLETE_EDITION_ACCESS_DAYS, COMPLETE_EDITION_PRICE_JPY } from '../../lib/purchase';


const premiumImage = require('../../../assets/home/premium-banner-v2.webp');

const shortcuts = [
  { label: '人物像', icon: 'person.2', material: 'group', fallback: '♧', route: APP_ROUTES.personas, testID: 'home-shortcut-personas' },
  { label: '人気ランキング', lines: ['人気', 'ランキング'], icon: 'trophy', material: 'emoji_events', fallback: '♛', route: APP_ROUTES.popular, testID: 'home-shortcut-popular' },
  { label: '処世術を作る', lines: ['処世術を', '作る'], icon: 'pencil', material: 'edit', fallback: '✎', route: { pathname: APP_ROUTES.myPage, params: { compose: '1' } }, testID: 'home-create-technique' },
  { label: '五大原則', icon: 'building.columns', material: 'account_balance', fallback: '▥', action: 'principles', testID: 'home-shortcut-principles' },
] as const satisfies ReadonlyArray<{ label: string; lines?: readonly string[]; icon: string; material: string; fallback: string; route: Href; testID: string } | { label: string; icon: string; material: string; fallback: string; action: 'principles'; testID: string }>;

export default function HomeScreen() {
  const router = useRouter();
  const { desktop, width } = useResponsiveLayout();
  const { fontScale = 1 } = useWindowDimensions();
  const mobile = width > 0 && width < 700;
  const [principlesVisible, setPrinciplesVisible] = useState(false);
  const refreshDeck = useRef<ScrollRefreshTask>(null);
  const refreshPage = useRef<RequestScrollRefresh>(null);
  const shuffleDeck = useCallback(() => refreshDeck.current?.(), []);
  const requestRefresh = useCallback<RequestScrollRefresh>(task => { refreshPage.current?.(task); }, []);
  const { accessState, secureContentStatus, refreshAccess } = useAccess();
  const cardWidth = desktop ? 400 : Math.max(240, Math.min(380, width - 68));
  // The content determines its breathing room; short viewports scroll rather
  // than shrinking the central reading experience to fit the editorial shelf.
  const cardHeight = (desktop ? 422 : Math.round(Math.max(324, cardWidth * 1.06))) + Math.max(0, fontScale - 1) * 180;


  return (
    <BookScreen testID="home-scroll" onPullRefresh={shuffleDeck} refreshRef={refreshPage} onReselectAtTop={requestRefresh} contentInsetAdjustmentBehavior="never" contentContainerStyle={[styles.page, desktop && styles.pageDesktop, mobile && styles.pageMobile]}>

      <View testID="home-recommendations-section" style={styles.discovery}>
        <HomeThemeBackdrop width={desktop ? width - 138 : width} desktop={desktop} />
        <View style={styles.deckContent}>
        <HomeRecommendationDeck cardWidth={cardWidth} cardHeight={cardHeight} refreshRef={refreshDeck} requestRefresh={requestRefresh} night />
        {accessState === 'paid' && secureContentStatus === 'error' ? <Pressable accessibilityRole="button" accessibilityLabel="完全版データを再読み込み" onPress={() => void refreshAccess()} style={styles.dataStatus}><Text style={styles.dataStatusText}>一部の知識を読み込めませんでした。もう一度読み込む ›</Text></Pressable> : accessState === 'paid' && secureContentStatus === 'loading' ? <Text accessibilityLiveRegion="polite" style={styles.dataStatusText}>知識を読み込んでいます…</Text> : null}
        </View>
      </View>

      <View style={[styles.body, width < 700 && styles.bodyCompact]}>
      <View testID="home-shortcuts" style={styles.shortcuts}>
        {shortcuts.map((item, index) => <Pressable key={item.label} testID={item.testID} accessibilityRole={'route' in item ? 'link' : 'button'} accessibilityLabel={item.label} onPress={() => 'route' in item ? router.push(item.route) : setPrinciplesVisible(true)} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
          <HomeShortcutDecoration variant={index} />
          <SymbolView name={{ ios: item.icon, android: item.material, web: item.material }} fallback={<Text style={styles.shortcutFallback}>{item.fallback}</Text>} size={desktop ? 27 : 25} tintColor={colors.gold} weight="light" />
          <View style={[styles.shortcutCaption, mobile && styles.shortcutCaptionMobile]}>{'lines' in item ? item.lines.map(line => <Text key={line} style={[styles.shortcutLabel, desktop && styles.shortcutLabelDesktop]}>{line}</Text>) : <Text style={[styles.shortcutLabel, desktop && styles.shortcutLabelDesktop]}>{item.label}</Text>}</View>
        </Pressable>)}
      </View>

      {accessState !== 'paid' ? <Pressable testID="home-premium-banner" accessibilityRole="link" accessibilityLabel="処世術禄 完全版を詳しく見る" onPress={() => router.push(upgradeRoute('home_banner'))} style={({ pressed }) => [styles.premiumBanner, !desktop && styles.premiumBannerMobile, width < 360 && styles.premiumBannerNarrow, pressed && styles.pressed]}>
        <Image source={premiumImage} resizeMode="cover" accessibilityLabel="黒と金の装丁の書籍" style={styles.premiumImage} />
        <View style={[styles.premiumCopy, !desktop && styles.premiumCopyMobile]}>
          <View style={[styles.premiumEdition, !desktop && styles.premiumEditionMobile]}>
            <Text style={[styles.premiumEyebrow, !desktop && styles.premiumEyebrowMobile]}>処世術禄</Text>
            <Text style={[styles.premiumTitle, !desktop && styles.premiumTitleMobile]}>完全版</Text>
          </View>
          {desktop ? <View style={styles.premiumDivider} /> : null}
          <View style={[styles.premiumDetails, desktop ? styles.premiumDetailsDesktop : styles.premiumDetailsMobile]}>
            <Text testID="home-premium-heading" style={[styles.premiumLead, !desktop && styles.premiumLeadMobile]}>論理性 × 網羅性 × 体系性</Text>
            <Text testID="home-premium-tagline" style={[styles.premiumBody, !desktop && styles.premiumBodyMobile]}>知識を、もっと広く。もっと深く。</Text>
            <View testID="home-premium-action-row" style={styles.premiumActionRow}>
            <Text testID="home-premium-price" style={[styles.premiumPrice, !desktop && styles.premiumPriceMobile]}>{COMPLETE_EDITION_ACCESS_DAYS}日間・{COMPLETE_EDITION_PRICE_JPY}円（税込）</Text>
            <View style={[styles.premiumButton, !desktop && styles.premiumButtonMobile]}><Text style={[styles.premiumButtonText, !desktop && styles.premiumButtonTextMobile]}>詳しく見る →</Text></View>
            </View>
          </View>
        </View>
      </Pressable> : null}

      <HomeEditorialStrip desktop={desktop} />


      </View>
      <PrinciplesModal visible={principlesVisible} compact={!desktop} onClose={() => setPrinciplesVisible(false)} />
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  dataStatus: { minHeight: 44, justifyContent: 'center' },
  dataStatusText: { color: colors.muted, fontSize: 12, lineHeight: 21, marginTop: 8 },
  discovery: { width: '100%', position: 'relative' },
  deckContent: { width: '100%', maxWidth: layout.readingWidth, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 10, paddingBottom: 0 },
  page: { backgroundColor: '#FAF7EF', maxWidth: '100%', paddingHorizontal: 0, paddingTop: 0, paddingBottom: 16 }, pageDesktop: { paddingBottom: 20 },
  pageMobile: { paddingBottom: 12 },
  body: { width: '100%', maxWidth: layout.readingWidth, alignSelf: 'center', paddingHorizontal: 16 },
  bodyCompact: { paddingHorizontal: 12 },
  pressed: { opacity: 0.7 },
  shortcuts: { flexDirection: 'row', gap: 8, marginTop: 10 },
  shortcut: { flex: 1, minWidth: 0, minHeight: 84, paddingTop: 9, paddingBottom: 9, alignItems: 'center', justifyContent: 'center', gap: 5, overflow: 'hidden', backgroundColor: '#FFFBF3', borderWidth: 1, borderColor: '#E8DDCB', borderRadius: 15, ...bookCardShadow, shadowOpacity: 0.05, shadowRadius: 6, elevation: 1 },
  shortcutLabelDesktop: { fontSize: 13, lineHeight: 20 },
  shortcutFallback: { color: colors.gold, fontSize: 25, lineHeight: 27 },
  shortcutCaption: { width: '100%', alignItems: 'center', justifyContent: 'center' },
  shortcutCaptionMobile: { minHeight: 30 },
  shortcutLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 17, fontWeight: '600', textAlign: 'center', width: '100%' },
  premiumBanner: { minHeight: 134, marginTop: 12, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#F8F0E2', ...bookCardShadow },
  premiumBannerMobile: { minHeight: 116, borderRadius: 13 },
  premiumBannerNarrow: { minHeight: 150 },
  premiumImage: { position: 'absolute', width: '100%', height: '100%', left: 0, top: 0 },
  premiumCopy: { width: '72%', minHeight: 134, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  premiumCopyMobile: { width: '74%', minHeight: 116, flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 12, paddingVertical: 8, gap: 0 },
  premiumEdition: { flexShrink: 0 },
  premiumEditionMobile: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  premiumDetailsMobile: { flexShrink: 0, width: '100%' },
  premiumDetailsDesktop: { flex: 1 },
  premiumDivider: { width: 1, height: '58%', backgroundColor: '#B78B43' },
  premiumDetails: { minWidth: 0, justifyContent: 'center' },
  premiumEyebrow: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, letterSpacing: 1.1, fontWeight: '700' },
  premiumEyebrowMobile: { fontSize: 13, lineHeight: 20, letterSpacing: 0.3 },
  premiumTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 38, fontWeight: '700', lineHeight: 44, letterSpacing: 1.4 },
  premiumTitleMobile: { fontSize: 23, lineHeight: 29, letterSpacing: 0.4 },
  premiumBody: { color: '#29251F', fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  premiumBodyMobile: { fontSize: 12, lineHeight: 18 },
  premiumLead: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  premiumLeadMobile: { fontSize: 12, lineHeight: 18 },
  premiumPrice: { color: colors.goldDeep, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  premiumPriceMobile: { fontSize: 12, lineHeight: 18, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 14, borderWidth: 1, borderColor: '#AD8847' },
  premiumActionRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 6, rowGap: 3, marginTop: 3 },
  premiumButton: { backgroundColor: colors.gold, borderRadius: 999, paddingHorizontal: 15, paddingVertical: 6 },
  premiumButtonMobile: { paddingHorizontal: 8, paddingVertical: 3 },
  premiumButtonText: { color: '#FFFDF7', fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  premiumButtonTextMobile: { fontSize: 12, lineHeight: 18 },
  section: { marginTop: 24 },
  sectionHeading: { marginBottom: 8 },
});
