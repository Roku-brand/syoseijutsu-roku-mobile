import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useAccess } from '@/access/access-state';
import { BookScreen, PrinciplesModal, bookCardShadow } from '../../components/book-ui';
import { HomeHeroCarousel } from '../../components/home-hero-carousel';
import { HomeRecommendationDeck } from '../../components/home-recommendation-deck';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { colors, fonts, layout } from '../../constants/theme';
import { APP_ROUTES, upgradeRoute } from '../../navigation/app-routes';
import { COMPLETE_EDITION_ACCESS_DAYS, COMPLETE_EDITION_PRICE_JPY } from '../../lib/purchase';


const premiumImage = require('../../../assets/home/premium-banner-v2.webp');

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

      {accessState !== 'paid' ? <Pressable testID="home-premium-banner" accessibilityRole="link" accessibilityLabel="処世術禄 完全版を詳しく見る" onPress={() => router.push(upgradeRoute('home_banner'))} style={({ pressed }) => [styles.premiumBanner, !desktop && styles.premiumBannerMobile, pressed && styles.pressed]}>
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
  premiumBanner: { height: 126, marginTop: 12, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#F8F0E2', ...bookCardShadow },
  premiumBannerMobile: { height: 112, borderRadius: 11 },
  premiumImage: { position: 'absolute', width: '100%', height: '100%', left: 0, top: 0 },
  premiumCopy: { width: '70%', height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  premiumCopyMobile: { width: '72%', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 9, gap: 4 },
  premiumEdition: { flexShrink: 0 },
  premiumEditionMobile: { flexDirection: 'row', alignItems: 'baseline', gap: 6 },
  premiumDetailsMobile: { flexShrink: 0, width: '100%' },
  premiumDetailsDesktop: { flex: 1 },
  premiumDivider: { width: 1, height: '58%', backgroundColor: '#B78B43' },
  premiumDetails: { minWidth: 0, justifyContent: 'center' },
  premiumEyebrow: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, letterSpacing: 1.1, fontWeight: '700' },
  premiumEyebrowMobile: { fontSize: 10, lineHeight: 15, letterSpacing: 0.3 },
  premiumTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 38, fontWeight: '700', lineHeight: 44, letterSpacing: 1.4 },
  premiumTitleMobile: { fontSize: 20, lineHeight: 26, letterSpacing: 0.4 },
  premiumBody: { color: '#29251F', fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  premiumBodyMobile: { fontSize: 10, lineHeight: 15 },
  premiumLead: { color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  premiumLeadMobile: { fontSize: 11, lineHeight: 16 },
  premiumPrice: { color: colors.goldDeep, fontSize: 13, lineHeight: 19, fontWeight: '700' },
  premiumPriceMobile: { fontSize: 10, lineHeight: 16 },
  premiumActionRow: { flexDirection: 'row', alignItems: 'center', columnGap: 6, marginTop: 8 },
  premiumButton: { backgroundColor: '#AA7832', borderRadius: 999, paddingHorizontal: 15, paddingVertical: 6 },
  premiumButtonMobile: { paddingHorizontal: 8, paddingVertical: 3 },
  premiumButtonText: { color: '#FFFDF7', fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  premiumButtonTextMobile: { fontSize: 9, lineHeight: 13 },
  section: { marginTop: 23 },
  sectionHeading: { marginBottom: 8 },
});
