import { useRouter, type Href } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View, type ImageSourcePropType } from 'react-native';

import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '../../access/access-config';
import { useAccess } from '../../access/access-state';
import { BookScreen, PrinciplesModal, bookCardShadow } from '../../components/book-ui';
import { BrandSectionHeading } from '../../components/brand-section-heading';
import { HomeHeroCarousel } from '../../components/home-hero-carousel';
import { categoryMeta, techniqueById, techniqueCards, theories, theoryById } from '../../data/catalog';
import { isLockedTheoryShell } from '../../data/theory-display';
import type { CategoryKey, TechniqueCard, TheoryCard } from '../../data/types';
import { useResponsiveLayout } from '../../hooks/use-responsive-layout';
import { useAppState } from '../../state/app-state';
import { colors, fonts } from '../../constants/theme';
import { APP_ROUTES, techniqueRoute, theoryRoute, upgradeRoute } from '../../navigation/app-routes';

const categoryImages: Record<CategoryKey | 'theory', ImageSourcePropType> = {
  interpersonal: require('../../../assets/home/interpersonal-v2.webp'),
  work: require('../../../assets/home/work-v2.webp'),
  life: require('../../../assets/home/life-v2.webp'),
  theory: require('../../../assets/home/theory-v2.webp'),
};
const premiumImage = require('../../../assets/home/premium-banner-v2.webp');

type HomeContent = { type: 'technique'; card: TechniqueCard } | { type: 'theory'; card: TheoryCard };

function contentId(item: HomeContent) {
  return item.type === 'technique' ? item.card.id : item.card.tagId;
}

function buildRecommendations({ accessState, historyIds, interests, savedIds }: {
  accessState: string;
  historyIds: string[];
  interests: CategoryKey[];
  savedIds: string[];
}) {
  const categoryScore = new Map<CategoryKey, number>(interests.map((key, index) => [key, 12 - index]));
  [...historyIds.slice(0, 20), ...savedIds.slice(0, 20)].forEach((id, index) => {
    const card = techniqueById.get(id);
    if (card) categoryScore.set(card.categoryKey, (categoryScore.get(card.categoryKey) ?? 0) + Math.max(2, 10 - Math.floor(index / 3)));
  });
  const seen = new Set(historyIds.slice(0, 8));
  const techniqueCandidates = techniqueCards
    .filter((card) => accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id))
    .sort((a, b) => {
      const scoreA = (categoryScore.get(a.categoryKey) ?? 0) - (seen.has(a.id) ? 30 : 0) + (savedIds.includes(a.id) ? 4 : 0);
      const scoreB = (categoryScore.get(b.categoryKey) ?? 0) - (seen.has(b.id) ? 30 : 0) + (savedIds.includes(b.id) ? 4 : 0);
      return scoreB - scoreA || a.id.localeCompare(b.id);
    });
  const relatedTheoryIds = [...savedIds, ...historyIds].flatMap((id) => techniqueById.get(id)?.theoryTagIds ?? []);
  const theoryRank = new Map(relatedTheoryIds.map((id, index) => [id, relatedTheoryIds.length - index]));
  const theoryCandidates = theories
    .filter((theory) => !isLockedTheoryShell(theory) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(theory.tagId)))
    .sort((a, b) => (theoryRank.get(b.tagId) ?? 0) - (theoryRank.get(a.tagId) ?? 0) || a.tagId.localeCompare(b.tagId));
  const items: HomeContent[] = [];
  const selected = new Set<string>();
  const add = (item: HomeContent | null) => {
    if (!item || selected.has(contentId(item)) || items.length >= 7) return;
    selected.add(contentId(item));
    items.push(item);
  };
  (['interpersonal', 'work', 'life'] as const).forEach((key) => {
    const card = techniqueCandidates.find((candidate) => candidate.categoryKey === key);
    add(card ? { type: 'technique', card } : null);
  });
  add(theoryCandidates[0] ? { type: 'theory', card: theoryCandidates[0] } : null);
  techniqueCandidates.forEach((card) => add({ type: 'technique', card }));
  theoryCandidates.forEach((card) => add({ type: 'theory', card }));
  return items;
}

const shortcuts = [
  { label: '人物像', icon: 'square.grid.2x2', material: 'grid_view', fallback: '▦', route: APP_ROUTES.personas, testID: 'home-shortcut-personas' },
  { label: '人気ランキング', icon: 'crown', material: 'emoji_events', fallback: '♛', route: APP_ROUTES.popular, testID: 'home-shortcut-popular' },
  { label: '処世術を作る', icon: 'pencil', material: 'edit', fallback: '✎', route: { pathname: APP_ROUTES.myTechniques, params: { compose: '1' } }, testID: 'home-create-technique' },
  { label: '保存済み', icon: 'bookmark', material: 'bookmark', fallback: '▯', route: APP_ROUTES.library, testID: 'home-shortcut-saved' },
  { label: '五大原則', icon: 'building.columns', material: 'account_balance', fallback: '▥', action: 'principles', testID: 'home-shortcut-principles' },
] as const satisfies ReadonlyArray<{ label: string; icon: string; material: string; fallback: string; route: Href; testID: string } | { label: string; icon: string; material: string; fallback: string; action: 'principles'; testID: string }>;

export default function HomeScreen() {
  const router = useRouter();
  const { desktop, width } = useResponsiveLayout();
  const [principlesVisible, setPrinciplesVisible] = useState(false);
  const { accessState, catalogRevision } = useAccess();
  const { historyIds, interests, savedIds } = useAppState();

  const recent = useMemo<HomeContent[]>(() => historyIds.flatMap((id): HomeContent[] => {
    const card = techniqueById.get(id);
    if (card && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(id))) return [{ type: 'technique', card }];
    const theory = theoryById.get(id);
    if (theory && !isLockedTheoryShell(theory) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(id))) return [{ type: 'theory', card: theory }];
    return [];
  }).slice(0, 6), [accessState, catalogRevision, historyIds]);
  const recommendations = useMemo(
    () => buildRecommendations({ accessState, historyIds, interests, savedIds }),
    [accessState, catalogRevision, historyIds, interests, savedIds],
  );
  const cardWidth = desktop ? 250 : Math.min(260, Math.max(210, width * 0.59));
  const openContent = (item: HomeContent) => router.push(item.type === 'technique' ? techniqueRoute(item.card.id) : theoryRoute(item.card.tagId));

  return (
    <BookScreen contentContainerStyle={[styles.page, desktop && styles.pageDesktop]}>
      <HomeHeroCarousel desktop={desktop} catalogRevision={catalogRevision} />

      <View testID="home-shortcuts" style={styles.shortcuts}>
        {shortcuts.map((item) => <Pressable key={item.label} testID={item.testID} accessibilityRole={'route' in item ? 'link' : 'button'} accessibilityLabel={item.label} onPress={() => 'route' in item ? router.push(item.route) : setPrinciplesVisible(true)} style={({ pressed }) => [styles.shortcut, pressed && styles.pressed]}>
          <SymbolView name={{ ios: item.icon, android: item.material, web: item.material }} fallback={<Text style={styles.shortcutFallback}>{item.fallback}</Text>} size={25} tintColor={colors.gold} weight="light" />
          <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} style={[styles.shortcutLabel, !desktop && styles.shortcutLabelMobile, !desktop && { fontSize: Math.max(7.5, Math.min(9, (width - 60) / 35)) }]}>{item.label}</Text>
        </Pressable>)}
      </View>

      <Pressable testID="home-premium-banner" accessibilityRole="link" accessibilityLabel="処世術禄 完全版を詳しく見る" onPress={() => router.push(upgradeRoute('home_banner'))} style={({ pressed }) => [styles.premiumBanner, !desktop && styles.premiumBannerMobile, pressed && styles.pressed]}>
        <Image source={premiumImage} resizeMode="cover" accessibilityLabel="黒と金の装丁の書籍" style={styles.premiumImage} />
        <View style={[styles.premiumCopy, !desktop && styles.premiumCopyMobile]}>
          <View style={styles.premiumEdition}>
            <Text style={[styles.premiumEyebrow, !desktop && styles.premiumEyebrowMobile]}>処世術禄</Text>
            <Text style={[styles.premiumTitle, !desktop && styles.premiumTitleMobile]}>完全版</Text>
          </View>
          <View style={styles.premiumDivider} />
          <View style={styles.premiumDetails}>
            <Text style={[styles.premiumBody, !desktop && styles.premiumBodyMobile]}>人生をより深く生きる{`\n`}すべての知恵を、ここに。</Text>
            <View style={[styles.premiumButton, !desktop && styles.premiumButtonMobile]}><Text style={[styles.premiumButtonText, !desktop && styles.premiumButtonTextMobile]}>詳しく見る →</Text></View>
          </View>
        </View>
      </Pressable>

      <HomeSection title="あなたにおすすめ" testID="home-recommendations-section" onAction={() => router.push(APP_ROUTES.discover)}>
        <ScrollView horizontal testID="home-recommendation-rail" accessibilityLabel="おすすめの処世術と理論" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {recommendations.map((item) => <ContentCard key={`${item.type}:${contentId(item)}`} item={item} width={cardWidth} onPress={() => openContent(item)} testID="home-recommendation-card" />)}
        </ScrollView>
      </HomeSection>

      <HomeSection title="続きから読む" testID="home-continue-section" onAction={() => router.push(APP_ROUTES.history)}>
        {recent.length ? <ScrollView horizontal testID="home-continue-rail" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
          {recent.map((item) => <ContentCard key={`${item.type}:${contentId(item)}`} item={item} width={cardWidth} onPress={() => openContent(item)} />)}
        </ScrollView> : <Pressable accessibilityRole="link" accessibilityLabel="処世術を探す" onPress={() => router.push(APP_ROUTES.discover)} style={styles.emptyHistory}>
          <Text style={styles.emptyHistoryTitle}>まだ読書の履歴はありません</Text>
          <Text style={styles.emptyHistoryBody}>気になる一枚を読むと、ここから再開できます。　探す →</Text>
        </Pressable>}
      </HomeSection>

      <PrinciplesModal visible={principlesVisible} compact={!desktop} onClose={() => setPrinciplesVisible(false)} />
    </BookScreen>
  );
}

function HomeSection({ title, testID, onAction, children }: { title: string; testID: string; onAction: () => void; children: React.ReactNode }) {
  const { desktop } = useResponsiveLayout();
  return <View testID={testID} style={styles.section}>
    <View style={styles.sectionHeading}><BrandSectionHeading title={title} actionLabel="すべて見る →" actionAccessibilityLabel={`${title}をすべて見る`} onAction={onAction} compact={!desktop} /></View>
    {children}
  </View>;
}

function ContentCard({ item, width, onPress, testID }: { item: HomeContent; width: number; onPress: () => void; testID?: string }) {
  const category = item.type === 'technique' ? item.card.categoryKey : 'theory';
  const label = item.type === 'technique' ? categoryMeta[item.card.categoryKey].label : '理論';
  return <Pressable testID={testID} accessibilityRole="link" accessibilityLabel={`${item.card.title}を読む`} onPress={onPress} style={({ pressed }) => [styles.contentCard, { width }, pressed && styles.pressed]}>
    <Image source={categoryImages[category] ?? categoryImages.theory} resizeMode="cover" accessibilityLabel={`${label}のイメージ写真`} style={styles.contentImage} />
    <View style={styles.contentBody}>
      <Text style={[styles.categoryLabel, category === 'theory' && styles.categoryTheory]}>{label}</Text>
      <Text numberOfLines={2} style={styles.contentTitle}>{item.card.title}</Text>
      <Text style={styles.contentLink}>続きを読む →</Text>
    </View>
  </Pressable>;
}

const styles = StyleSheet.create({
  page: { paddingTop: 8, paddingBottom: 30 }, pageDesktop: { paddingTop: 20, paddingBottom: 48 },
  pressed: { opacity: 0.7 },
  shortcuts: { flexDirection: 'row', gap: 7, marginTop: 8 },
  shortcut: { flex: 1, minWidth: 0, height: 74, alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#EBE4D8', borderRadius: 13, ...bookCardShadow },
  shortcutFallback: { color: colors.gold, fontSize: 25, lineHeight: 27 },
  shortcutLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 10, lineHeight: 14, fontWeight: '600', textAlign: 'center' },
  shortcutLabelMobile: { fontSize: 9, letterSpacing: -0.3, width: '100%' },
  premiumBanner: { height: 126, marginTop: 12, overflow: 'hidden', borderRadius: 15, borderWidth: 1, borderColor: '#E8DCC8', backgroundColor: '#F8F0E2', ...bookCardShadow },
  premiumBannerMobile: { height: 69, borderRadius: 11 },
  premiumImage: { position: 'absolute', width: '100%', height: '100%', left: 0, top: 0 },
  premiumCopy: { width: '70%', height: '100%', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, gap: 14 },
  premiumCopyMobile: { width: '76%', paddingHorizontal: 9, gap: 8 },
  premiumEdition: { flexShrink: 0 },
  premiumDivider: { width: 1, height: '58%', backgroundColor: '#B78B43' },
  premiumDetails: { flex: 1, minWidth: 0, justifyContent: 'center' },
  premiumEyebrow: { color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 25, letterSpacing: 1.1, fontWeight: '700' },
  premiumEyebrowMobile: { fontSize: 12, lineHeight: 17, letterSpacing: 0.3 },
  premiumTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 38, fontWeight: '700', lineHeight: 44, letterSpacing: 1.4 },
  premiumTitleMobile: { fontSize: 25, lineHeight: 29, letterSpacing: 0.4 },
  premiumBody: { color: '#29251F', fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  premiumBodyMobile: { fontSize: 10, lineHeight: 14 },
  premiumButton: { alignSelf: 'flex-start', backgroundColor: '#AA7832', borderRadius: 999, marginTop: 8, paddingHorizontal: 15, paddingVertical: 6 },
  premiumButtonMobile: { marginTop: 3, paddingHorizontal: 10, paddingVertical: 3 },
  premiumButtonText: { color: '#FFFDF7', fontFamily: fonts.serif, fontSize: 12, lineHeight: 17, fontWeight: '600' },
  premiumButtonTextMobile: { fontSize: 10, lineHeight: 13 },
  section: { marginTop: 19 },
  sectionHeading: { marginBottom: 8 },
  rail: { gap: 11, paddingBottom: 4, paddingRight: 16 },
  contentCard: { flexGrow: 0, flexShrink: 0, overflow: 'hidden', backgroundColor: '#FFFDF9', borderColor: '#E9E2D8', borderWidth: 1, borderRadius: 14, ...bookCardShadow },
  contentImage: { width: '100%', height: 100, backgroundColor: '#E6E0D5' },
  contentBody: { minHeight: 97, paddingHorizontal: 12, paddingTop: 7, paddingBottom: 10 },
  categoryLabel: { alignSelf: 'flex-start', color: '#9B6E27', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17, borderColor: '#D6BD95', borderWidth: 1, borderRadius: 999, paddingHorizontal: 8, backgroundColor: '#FFF8EA' },
  categoryTheory: { color: '#506B86', borderColor: '#A5B8C7', backgroundColor: '#EFF4F7' },
  contentTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, fontWeight: '600', marginTop: 5, minHeight: 43 },
  contentLink: { alignSelf: 'flex-end', color: '#A3752B', fontFamily: fonts.serif, fontSize: 11, lineHeight: 16, marginTop: 5 },
  emptyHistory: { minHeight: 89, justifyContent: 'center', paddingHorizontal: 16, borderWidth: 1, borderColor: '#E9E2D8', borderRadius: 14, backgroundColor: '#FFFDF9' },
  emptyHistoryTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, fontWeight: '600' },
  emptyHistoryBody: { color: colors.muted, fontFamily: fonts.serif, fontSize: 11, lineHeight: 19, marginTop: 4 },
});
