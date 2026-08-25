import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { colors, shadow } from '@/constants/theme';
import { categories, techniqueCards, theories } from '@/data/catalog';
import { FREE_PERSONA_NAMES, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { useAppState } from '@/state/app-state';

const personaCount = categories.reduce((count, category) => count + category.subcategories.length, 0);
const freePersonaCount = FREE_PERSONA_NAMES.length;
const freeTechniqueCount = FREE_REEL_TECHNIQUE_IDS.length;

/** 初回の導線だけに表示する、1画面完結の販売ファースト画面。 */
export default function Welcome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { accessState } = useAccess();
  const { interests, onboardingCompleted, completeOnboarding } = useAppState();
  const isDesktop = width >= 900;
  const isShort = height < 720;

  if (accessState === 'paid' || onboardingCompleted) return <Redirect href="/(tabs)" />;

  const startFree = () => {
    completeOnboarding(interests);
    router.replace('/(tabs)');
  };

  const densityStyles = isShort ? {
    hero: styles.heroShort,
    heroTitle: styles.heroTitleShort,
    heroCopy: styles.heroCopyShort,
    rule: styles.ruleShort,
    stats: styles.statsShort,
    statNumber: styles.statNumberShort,
    statSub: styles.statSubShort,
    offer: styles.offerShort,
    offerTitle: styles.offerTitleShort,
    offerBody: styles.offerBodyShort,
    priceBadge: styles.priceBadgeShort,
    priceType: styles.priceTypeShort,
    price: styles.priceShort,
    benefits: styles.benefitsShort,
    benefitText: styles.benefitTextShort,
    primary: styles.primaryShort,
    secondary: styles.secondaryShort,
    secondaryTitle: styles.secondaryTitleShort,
    secondarySub: styles.secondarySubShort,
    assurance: styles.assuranceShort,
  } : {};

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <View style={styles.page}>
        <View style={[styles.topBar, isDesktop && styles.topBarDesktop, isShort && styles.topBarShort]}>
          <View style={styles.brand}>
            <View style={[styles.seal, isShort && styles.sealShort]}><AppText variant="serif" style={[styles.sealText, isShort && styles.sealTextShort]}>禄</AppText></View>
            <View>
              <AppText variant="serif" style={[styles.brandName, isShort && styles.brandNameShort]}>処 世 術 禄</AppText>
              <AppText style={styles.brandReading}>しょせいじゅつろく</AppText>
            </View>
          </View>
          {isDesktop ? <AppText style={styles.topBarNote}>人生・仕事・人間関係のための処世術</AppText> : null}
        </View>

        <View style={[styles.content, isDesktop ? styles.desktopContent : styles.mobileContent, isShort && styles.mobileContentShort]}>
          <View style={[styles.hero, isDesktop ? styles.desktopHero : styles.mobileHero, densityStyles.hero]}>
            <AppText variant="serif" style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop, densityStyles.heroTitle]}>人生をうまく生きる方法を、{`\n`}すべての人へ。</AppText>
            <AppText variant="serif" style={[styles.heroCopy, isDesktop && styles.heroCopyDesktop, densityStyles.heroCopy]}>流れて消える人生の知識を、{`\n`}何度でも使える知恵に。</AppText>
            <View style={[styles.rule, densityStyles.rule]}><View style={styles.ruleLine} /><View style={styles.diamond} /><View style={styles.ruleLine} /></View>
            <View style={[styles.stats, densityStyles.stats]}>
              <View style={styles.stat}>
                <View style={styles.statLine}><AppText variant="serif" style={[styles.statNumber, densityStyles.statNumber]}>{techniqueCards.length}</AppText><AppText variant="serif" style={styles.statLabel}>の処世術</AppText></View>
                <AppText style={[styles.statSub, densityStyles.statSub]}>対人・仕事・人生の知恵</AppText>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <View style={styles.statLine}><AppText variant="serif" style={[styles.statNumber, densityStyles.statNumber]}>{theories.length}</AppText><AppText variant="serif" style={styles.statLabel}>の理論</AppText></View>
                <AppText style={[styles.statSub, densityStyles.statSub]}>心理学・行動科学・戦略など</AppText>
              </View>
            </View>
          </View>

          <View style={[styles.offer, isDesktop ? styles.desktopOffer : styles.mobileOffer, densityStyles.offer]}>
            <AppText variant="serif" style={[styles.offerTitle, densityStyles.offerTitle]}>30日間、すべての知恵を。</AppText>
            <View style={[styles.offerBody, densityStyles.offerBody]}>
              <View style={[styles.priceBadge, densityStyles.priceBadge]}>
                <AppText variant="serif" style={[styles.priceType, densityStyles.priceType]}>30日間</AppText>
                <AppText variant="serif" style={[styles.price, densityStyles.price]}>¥280</AppText>
                <AppText style={styles.tax}>税込</AppText>
              </View>
              <View style={[styles.benefits, densityStyles.benefits]}>
                {[`${personaCount}の人物像・${techniqueCards.length}の処世術`, `${theories.length}の理論をすべて収録`, '購入日から30日間利用', '自動更新・継続課金なし'].map((item) => (
                  <View key={item} style={styles.benefitRow}>
                    <AppText style={styles.benefitCheck}>✓</AppText>
                    <AppText style={[styles.benefitText, densityStyles.benefitText]}>{item}</AppText>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actions}>
              <Pressable accessibilityRole="button" onPress={() => router.push('/upgrade')} style={({ pressed }) => [styles.primary, densityStyles.primary, pressed && styles.pressed]}>
                <View style={styles.ctaDiamond} />
                <AppText variant="serif" style={styles.primaryText}>280円で30日間利用する</AppText>
                <AppText style={styles.ctaArrow}>›</AppText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={startFree} style={({ pressed }) => [styles.secondary, densityStyles.secondary, pressed && styles.pressed]}>
                <View style={styles.freeIcon}><AppText style={styles.freeIconText}>□</AppText></View>
                <View style={styles.secondaryCopy}>
                  <AppText variant="serif" style={[styles.secondaryTitle, densityStyles.secondaryTitle]}>{freePersonaCount}つの人物像を無料で体験</AppText>
                  <AppText style={[styles.secondarySub, densityStyles.secondarySub]}>処世術{freeTechniqueCount}件・厳選理論{FREE_THEORY_IDS.length}件を読めます</AppText>
                </View>
                <AppText style={styles.secondaryArrow}>›</AppText>
              </Pressable>
            </View>
            <AppText style={[styles.assurance, densityStyles.assurance]}>自動更新・継続課金なし　期間終了後は無料版へ戻ります</AppText>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surfaceDark },
  page: { flex: 1, overflow: 'hidden', backgroundColor: colors.surfaceDark },
  topBar: { minHeight: 66, paddingHorizontal: 20, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarDesktop: { minHeight: 82, paddingHorizontal: 42 },
  topBarShort: { minHeight: 50, paddingVertical: 4 },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  seal: { width: 48, height: 48, justifyContent: 'center', alignItems: 'center', borderColor: '#D0A03D', borderWidth: 1.3, borderRadius: 11 },
  sealShort: { width: 40, height: 40, borderRadius: 9 },
  sealText: { color: '#D5A441', fontSize: 32, lineHeight: 39 },
  sealTextShort: { fontSize: 28, lineHeight: 33 },
  brandName: { color: colors.white, fontSize: 17, letterSpacing: 4 },
  brandNameShort: { fontSize: 15, letterSpacing: 3 },
  brandReading: { marginTop: 1, color: '#D6AF58', fontSize: 9, letterSpacing: 2 },
  topBarNote: { color: '#D9D1C2', fontSize: 13, letterSpacing: 1 },
  content: { flex: 1 },
  desktopContent: { alignSelf: 'center', width: '100%', maxWidth: 1360, flexDirection: 'row', gap: 54, paddingHorizontal: 44, paddingTop: 14, paddingBottom: 34, alignItems: 'center' },
  mobileContent: { paddingHorizontal: 18, paddingBottom: 12, justifyContent: 'space-between' },
  mobileContentShort: { paddingHorizontal: 15, paddingBottom: 7 },
  hero: { alignItems: 'center' },
  desktopHero: { flex: 1, justifyContent: 'center', paddingBottom: 16 },
  mobileHero: { paddingTop: 4, paddingBottom: 11 },
  heroShort: { paddingTop: 0, paddingBottom: 6 },
  heroTitle: { color: colors.white, textAlign: 'center', fontSize: 25, lineHeight: 36, fontWeight: '600', letterSpacing: 0.8 },
  heroTitleDesktop: { fontSize: 34, lineHeight: 48 },
  heroTitleShort: { fontSize: 22, lineHeight: 30 },
  heroCopy: { marginTop: 10, color: '#D9A947', textAlign: 'center', fontSize: 15, lineHeight: 23, fontWeight: '600' },
  heroCopyDesktop: { marginTop: 19, fontSize: 19, lineHeight: 29 },
  heroCopyShort: { marginTop: 5, fontSize: 13, lineHeight: 18 },
  rule: { flexDirection: 'row', alignItems: 'center', marginTop: 16, gap: 9 },
  ruleShort: { marginTop: 9 },
  ruleLine: { width: 84, height: StyleSheet.hairlineWidth, backgroundColor: '#8A6727' },
  diamond: { width: 9, height: 9, backgroundColor: '#D5A441', transform: [{ rotate: '45deg' }] },
  stats: { marginTop: 17, width: '100%', maxWidth: 410, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
  statsShort: { marginTop: 10 },
  stat: { flex: 1, alignItems: 'center' },
  statLine: { flexDirection: 'row', alignItems: 'baseline', gap: 3 },
  statNumber: { color: '#D9A947', fontSize: 33, lineHeight: 40 },
  statNumberShort: { fontSize: 28, lineHeight: 34 },
  statLabel: { color: '#F7EEE1', fontSize: 16, lineHeight: 24 },
  statSub: { marginTop: 2, color: '#D9D1C2', fontSize: 10, textAlign: 'center' },
  statSubShort: { fontSize: 9 },
  statDivider: { height: 53, width: StyleSheet.hairlineWidth, backgroundColor: '#AF8540' },
  offer: { width: '100%', backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, ...shadow.card },
  desktopOffer: { width: 510, maxWidth: '44%', padding: 25, borderRadius: 24 },
  mobileOffer: { padding: 15, borderRadius: 18 },
  offerShort: { padding: 11, borderRadius: 15 },
  offerTitle: { color: colors.ink, fontSize: 23, textAlign: 'center' },
  offerTitleShort: { fontSize: 20 },
  offerBody: { marginTop: 13, flexDirection: 'row', alignItems: 'center', gap: 17 },
  offerBodyShort: { marginTop: 8, gap: 12 },
  priceBadge: { width: 108, height: 108, borderRadius: 54, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6A844', flexShrink: 0 },
  priceBadgeShort: { width: 82, height: 82, borderRadius: 41 },
  priceType: { color: '#DAB052', fontSize: 13 },
  priceTypeShort: { fontSize: 11 },
  price: { color: '#E0B655', fontSize: 36, lineHeight: 42 },
  priceShort: { fontSize: 29, lineHeight: 34 },
  tax: { color: '#F1E2C4', fontSize: 10 },
  benefits: { flex: 1, gap: 6 },
  benefitsShort: { gap: 3 },
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  benefitCheck: { width: 14, color: '#A87420', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  benefitText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 13, lineHeight: 19 },
  benefitTextShort: { fontSize: 11, lineHeight: 15 },
  actions: { marginTop: 15, gap: 9 },
  primary: { minHeight: 57, paddingHorizontal: 18, borderRadius: 13, backgroundColor: '#BC8525', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#7F5D22', shadowOpacity: 0.2, shadowRadius: 5, elevation: 2 },
  primaryShort: { minHeight: 46, borderRadius: 11 },
  primaryText: { color: '#FFFDF8', fontSize: 19, letterSpacing: 0.6 },
  ctaDiamond: { position: 'absolute', left: 22, width: 10, height: 10, borderWidth: 1.3, borderColor: '#FFF7DF', transform: [{ rotate: '45deg' }] },
  ctaArrow: { position: 'absolute', right: 21, color: '#FFFDF8', fontSize: 31, lineHeight: 34 },
  secondary: { minHeight: 56, paddingHorizontal: 14, borderRadius: 13, borderWidth: 1, borderColor: '#C69B4F', backgroundColor: '#FFFDF8', flexDirection: 'row', alignItems: 'center' },
  secondaryShort: { minHeight: 45, borderRadius: 11, paddingHorizontal: 11 },
  freeIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' },
  freeIconText: { color: '#E0B655', fontSize: 18 },
  secondaryCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  secondaryTitle: { color: colors.ink, fontSize: 16 },
  secondaryTitleShort: { fontSize: 14 },
  secondarySub: { color: colors.inkSoft, fontSize: 11, marginTop: 2 },
  secondarySubShort: { fontSize: 10, marginTop: 0 },
  secondaryArrow: { color: colors.ink, fontSize: 30, lineHeight: 32 },
  assurance: { marginTop: 10, color: '#59534A', fontSize: 10, lineHeight: 14, textAlign: 'center' },
  assuranceShort: { marginTop: 6, fontSize: 9, lineHeight: 12 },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
