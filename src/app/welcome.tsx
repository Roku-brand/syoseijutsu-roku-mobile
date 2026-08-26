import { Redirect, useRouter } from 'expo-router';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { categories, techniqueCards, theories } from '@/data/catalog';
import { FREE_PERSONA_NAMES, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { useAppState } from '@/state/app-state';

const personaCount = categories.reduce((count, category) => count + category.subcategories.length, 0);
const freePersonaCount = FREE_PERSONA_NAMES.length;
const freeTechniqueCount = FREE_REEL_TECHNIQUE_IDS.length;

export default function Welcome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { accessState } = useAccess();
  const { interests, onboardingCompleted, completeOnboarding } = useAppState();
  const isDesktop = width >= 900;
  const isCompact = height < 720;
  const isNarrow = width < 370;

  if (accessState === 'paid' || onboardingCompleted) return <Redirect href="/(tabs)" />;

  const startFree = () => {
    completeOnboarding(interests);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <View style={styles.page}>
        <View style={[styles.topBar, isDesktop && styles.topBarDesktop]}>
          <View style={styles.brand}>
            <View style={styles.seal}><AppText variant="serif" style={styles.sealText}>禄</AppText></View>
            <View>
              <AppText variant="serif" style={styles.brandName}>処 世 術 禄</AppText>
              <AppText style={styles.brandReading}>しょせいじゅつろく</AppText>
            </View>
          </View>
          {isDesktop ? <AppText style={styles.topBarNote}>人生・仕事・人間関係のための処世術</AppText> : null}
        </View>

        <View style={[styles.content, isDesktop ? styles.contentDesktop : styles.contentMobile, isCompact && styles.contentCompact]}>
          <View style={[styles.hero, isDesktop && styles.heroDesktop, isCompact && styles.heroCompact]}>
            <AppText style={styles.heroEyebrow}>処世術禄</AppText>
            <AppText variant="serif" style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop, isCompact && styles.heroTitleCompact]}>
              人生をうまく生きる方法を、{`\n`}すべての人へ。
            </AppText>
            <AppText style={[styles.heroCopy, isDesktop && styles.heroCopyDesktop, isCompact && styles.heroCopyCompact]}>
              流れて消える人生の知識を、何度でも使える知恵に。
            </AppText>
            <View style={[styles.stats, isCompact && styles.statsCompact]}>
              <View style={styles.stat}><AppText variant="serif" style={styles.statNumber}>{personaCount}</AppText><AppText style={styles.statLabel}>人物像</AppText></View>
              <View style={styles.statDivider} />
              <View style={styles.stat}><AppText variant="serif" style={styles.statNumber}>{techniqueCards.length}</AppText><AppText style={styles.statLabel}>処世術</AppText></View>
              <View style={styles.statDivider} />
              <View style={styles.stat}><AppText variant="serif" style={styles.statNumber}>{theories.length}</AppText><AppText style={styles.statLabel}>理論</AppText></View>
            </View>
          </View>

          <View style={[styles.choiceSection, isCompact && styles.choiceSectionCompact]}>
            <View style={styles.choiceHeading}>
              <AppText variant="serif" style={[styles.choiceTitle, isCompact && styles.choiceTitleCompact]}>始め方を選ぶ</AppText>
              <AppText style={[styles.choiceCaption, isCompact && styles.choiceCaptionCompact]}>無料版からでも、すぐに読み始められます</AppText>
            </View>

            <View style={[styles.plans, isDesktop && styles.plansDesktop]}>
              <Pressable accessibilityRole="button" onPress={startFree} style={({ pressed }) => [styles.plan, styles.freePlan, isDesktop && styles.planDesktop, isNarrow && styles.planNarrow, pressed && styles.pressed]}>
                <AppText style={styles.planEyebrow}>無料版</AppText>
                <AppText variant="serif" style={[styles.planTitle, isNarrow && styles.planTitleNarrow]}>無料版をはじめる</AppText>
                <AppText style={[styles.planLead, isNarrow && styles.planLeadNarrow]}>登録なしで、まず読む。</AppText>
                <View style={styles.planRule} />
                <AppText style={[styles.planDetail, isNarrow && styles.planDetailNarrow]}>{freePersonaCount}人物像・{freeTechniqueCount}処世術{`\n`}厳選理論 {FREE_THEORY_IDS.length}件</AppText>
                <View style={[styles.planButton, styles.freeButton]}><AppText style={styles.freeButtonText}>無料版を開く</AppText></View>
              </Pressable>

              <Pressable accessibilityRole="button" onPress={() => router.push('/upgrade')} style={({ pressed }) => [styles.plan, styles.completePlan, isDesktop && styles.planDesktop, isNarrow && styles.planNarrow, pressed && styles.pressed]}>
                <View style={styles.completePlanTopline}>
                  <AppText style={styles.completePlanEyebrow}>完全版</AppText>
                  <AppText style={styles.priceLabel}>¥280 / 30日</AppText>
                </View>
                <AppText variant="serif" style={[styles.planTitle, styles.completePlanTitle, isNarrow && styles.planTitleNarrow]}>すべての知恵を読む</AppText>
                <AppText style={[styles.planLead, styles.completePlanLead, isNarrow && styles.planLeadNarrow]}>自動更新なし・一回払い。</AppText>
                <View style={[styles.planRule, styles.completePlanRule]} />
                <AppText style={[styles.planDetail, styles.completePlanDetail, isNarrow && styles.planDetailNarrow]}>全{personaCount}人物像・{techniqueCards.length}処世術{`\n`}{theories.length}理論・全21ケース</AppText>
                <View style={[styles.planButton, styles.completeButton]}><AppText style={styles.completeButtonText}>内容・購入方法を見る</AppText></View>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3EFE6' },
  page: { flex: 1, overflow: 'hidden', backgroundColor: '#F3EFE6' },
  topBar: { minHeight: 60, paddingHorizontal: 18, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D8D0C2', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  topBarDesktop: { minHeight: 76, paddingHorizontal: 44 },
  brand: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  seal: { width: 42, height: 42, borderRadius: 11, borderWidth: 1, borderColor: '#B98724', alignItems: 'center', justifyContent: 'center' },
  sealText: { color: '#A87418', fontSize: 29, lineHeight: 35 },
  brandName: { color: '#25211B', fontSize: 16, letterSpacing: 3.5 },
  brandReading: { marginTop: 1, color: '#9A762E', fontSize: 9, letterSpacing: 1.8 },
  topBarNote: { color: '#5C5346', fontSize: 13, letterSpacing: 0.8 },
  content: { flex: 1, width: '100%', alignSelf: 'center' },
  contentDesktop: { maxWidth: 1180, paddingHorizontal: 30, paddingVertical: 28, justifyContent: 'center', gap: 20 },
  contentMobile: { paddingHorizontal: 14, paddingVertical: 12, justifyContent: 'center', gap: 18 },
  contentCompact: { paddingTop: 8, paddingBottom: 8, gap: 7 },
  hero: { overflow: 'hidden', borderRadius: 20, backgroundColor: '#211F1A', borderWidth: 1, borderColor: '#3F382D', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 17 },
  heroDesktop: { minHeight: 218, paddingVertical: 25, borderRadius: 24 },
  heroCompact: { paddingVertical: 10, borderRadius: 17 },
  heroEyebrow: { color: '#C89735', fontSize: 11, letterSpacing: 2.2, fontWeight: '700' },
  heroTitle: { marginTop: 5, color: '#FFF9EF', textAlign: 'center', fontSize: 23, lineHeight: 31, letterSpacing: 0.4 },
  heroTitleDesktop: { marginTop: 7, fontSize: 32, lineHeight: 43 },
  heroTitleCompact: { fontSize: 20, lineHeight: 27 },
  heroCopy: { marginTop: 7, color: '#E1BD70', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  heroCopyDesktop: { marginTop: 10, fontSize: 15, lineHeight: 22 },
  heroCopyCompact: { marginTop: 4, fontSize: 11, lineHeight: 15 },
  stats: { marginTop: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  statsCompact: { marginTop: 8 },
  stat: { minWidth: 74, alignItems: 'center' },
  statNumber: { color: '#E4B653', fontSize: 20, lineHeight: 25 },
  statLabel: { marginTop: 1, color: '#E6DED1', fontSize: 10 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 29, marginHorizontal: 7, backgroundColor: '#695C45' },
  choiceSection: { width: '100%' },
  choiceSectionCompact: { flexShrink: 1 },
  choiceHeading: { marginBottom: 9, flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', paddingHorizontal: 2 },
  choiceTitle: { color: '#25211B', fontSize: 19, lineHeight: 25 },
  choiceTitleCompact: { fontSize: 17, lineHeight: 22 },
  choiceCaption: { color: '#71685D', fontSize: 11, textAlign: 'right' },
  choiceCaptionCompact: { fontSize: 10 },
  plans: { flexDirection: 'row', gap: 10 },
  plansDesktop: { gap: 16 },
  plan: { flex: 1, minWidth: 0, minHeight: 202, borderRadius: 17, padding: 14, justifyContent: 'space-between' },
  planDesktop: { minHeight: 226, padding: 21, borderRadius: 19 },
  planNarrow: { minHeight: 194, padding: 11 },
  freePlan: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#D8CDBB' },
  completePlan: { backgroundColor: '#29251F', borderWidth: 1, borderColor: '#4D4230' },
  planEyebrow: { color: '#846522', fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1.1 },
  completePlanTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 },
  completePlanEyebrow: { color: '#E0B35B', fontSize: 11, lineHeight: 15, fontWeight: '700', letterSpacing: 1.1 },
  priceLabel: { color: '#F3DEB0', fontSize: 11, lineHeight: 15, fontWeight: '700' },
  planTitle: { marginTop: 4, color: '#25211B', fontSize: 20, lineHeight: 27 },
  completePlanTitle: { color: '#FFF9EE' },
  planTitleNarrow: { fontSize: 17, lineHeight: 23 },
  planLead: { marginTop: 3, color: '#655C51', fontSize: 11, lineHeight: 16 },
  completePlanLead: { color: '#D8CDB8' },
  planLeadNarrow: { fontSize: 10, lineHeight: 14 },
  planRule: { height: StyleSheet.hairlineWidth, marginVertical: 8, backgroundColor: '#DED5C7' },
  completePlanRule: { backgroundColor: '#665942' },
  planDetail: { color: '#443D34', fontSize: 11, lineHeight: 17 },
  completePlanDetail: { color: '#EEE3D1' },
  planDetailNarrow: { fontSize: 10, lineHeight: 15 },
  planButton: { minHeight: 42, marginTop: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  freeButton: { backgroundColor: '#EEE6D8' },
  freeButtonText: { color: '#2D2922', fontSize: 13, fontWeight: '700' },
  completeButton: { backgroundColor: '#CB9329' },
  completeButtonText: { color: '#1F1A12', fontSize: 13, fontWeight: '800' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
});
