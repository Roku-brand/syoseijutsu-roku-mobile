import { Redirect, useRouter } from 'expo-router';
import { ImageBackground, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useAccess } from '@/access/access-state';
import { useAppState } from '@/state/app-state';

const desktopBackground = require('../../assets/welcome/welcome-background-desktop.png');
const mobileBackground = require('../../assets/welcome/welcome-background-mobile.png');

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
      <ImageBackground source={isDesktop ? desktopBackground : mobileBackground} resizeMode="cover" style={styles.page} imageStyle={styles.backgroundImage}>
        <View style={[styles.content, isDesktop ? styles.contentDesktop : styles.contentMobile, isCompact && styles.contentCompact]}>
          <View style={[styles.hero, isDesktop && styles.heroDesktop, isCompact && styles.heroCompact]}>
            <View style={[styles.brand, isCompact && styles.brandCompact]}>
              <AppText variant="serif" style={[styles.brandName, isDesktop && styles.brandNameDesktop]}>処 世 術 禄</AppText>
              <AppText style={[styles.brandReading, isCompact && styles.brandReadingCompact]}>SHO　SEI　JUTSU　ROKU</AppText>
              <View style={styles.brandRule} />
            </View>
            <AppText variant="serif" style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop, isCompact && styles.heroTitleCompact]}>
              人生をうまく生きる方法を、{`\n`}すべての人へ。
            </AppText>
            <AppText variant="serif" style={[styles.heroCopy, isDesktop && styles.heroCopyDesktop, isCompact && styles.heroCopyCompact]}>
              流れて消える人生の知識を、何度でも使える知恵に。
            </AppText>
          </View>

          <View style={[styles.choiceSection, isDesktop && styles.choiceSectionDesktop, isCompact && styles.choiceSectionCompact]}>
            <View style={[styles.plans, isDesktop && styles.plansDesktop]}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="無料版をはじめる"
                onPress={startFree}
                style={({ pressed }) => [styles.plan, styles.freePlan, isDesktop && styles.planDesktop, isCompact && styles.planCompact, isNarrow && styles.planNarrow, pressed && styles.pressed]}
              >
                <View style={styles.planCopy}>
                  <AppText variant="serif" style={[styles.planTitle, isDesktop && styles.planTitleDesktop, isCompact && styles.planTitleCompact]}>無料版</AppText>
                  <AppText style={[styles.planLead, isDesktop && styles.planLeadDesktop, isCompact && styles.planLeadCompact]}>まずは気軽に、処世の知恵の一部を体験できます。</AppText>
                </View>
                <View style={[styles.planButton, styles.freeButton, isCompact && styles.planButtonCompact]}><AppText variant="serif" style={[styles.buttonText, isDesktop && styles.buttonTextDesktop, isCompact && styles.buttonTextCompact]}>無料で始める</AppText></View>
                <View style={[styles.notePill, isCompact && styles.notePillCompact]}><AppText style={[styles.noteText, isCompact && styles.noteTextCompact]}>登録不要</AppText></View>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="完全版の内容を見る"
                onPress={() => router.push('/upgrade')}
                style={({ pressed }) => [styles.plan, styles.completePlan, isDesktop && styles.planDesktop, isCompact && styles.planCompact, isNarrow && styles.planNarrow, pressed && styles.pressed]}
              >
                <View style={styles.planCopy}>
                  <AppText variant="serif" style={[styles.planTitle, styles.completePlanTitle, isDesktop && styles.planTitleDesktop, isCompact && styles.planTitleCompact]}>完全版</AppText>
                  <AppText style={[styles.planLead, styles.completePlanLead, isDesktop && styles.planLeadDesktop, isCompact && styles.planLeadCompact]}>すべての人物像・処世術・理論にアクセスできます。</AppText>
                </View>
                <View style={[styles.planButton, styles.completeButton, isCompact && styles.planButtonCompact]}><AppText variant="serif" style={[styles.buttonText, styles.completeButtonText, isDesktop && styles.buttonTextDesktop, isCompact && styles.buttonTextCompact]}>全ての内容を見る</AppText></View>
                <View style={[styles.notePill, styles.completeNotePill, isCompact && styles.notePillCompact]}><AppText style={[styles.noteText, styles.completeNoteText, isCompact && styles.noteTextCompact]}>利用条件は内容画面で確認</AppText></View>
              </Pressable>
            </View>
            {!isCompact ? <View style={styles.bottomMessage}><View style={styles.bottomRule} /><AppText variant="serif" style={styles.bottomText}>いつでも、あなたのペースで学べます。</AppText><View style={styles.bottomRule} /></View> : null}
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F0E7' },
  page: { flex: 1, backgroundColor: '#F5F0E7' },
  backgroundImage: { opacity: 1 },
  content: { flex: 1, width: '100%', alignSelf: 'center', justifyContent: 'space-between' },
  contentDesktop: { maxWidth: 1320, paddingHorizontal: 34, paddingTop: 18, paddingBottom: 28 },
  contentMobile: { paddingHorizontal: 17, paddingTop: 8, paddingBottom: 13, justifyContent: 'flex-start' },
  contentCompact: { paddingTop: 7, paddingBottom: 8 },
  hero: { flexGrow: 0, flexShrink: 1, minHeight: 228, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingBottom: 10 },
  heroDesktop: { minHeight: 340, paddingTop: 0, paddingBottom: 15 },
  heroCompact: { minHeight: 192, paddingBottom: 5 },
  brand: { alignItems: 'center' },
  brandCompact: { transform: [{ scale: 0.87 }] },
  brandName: { color: '#E5C17A', fontSize: 25, lineHeight: 34, letterSpacing: 7.6, textAlign: 'center', textShadowColor: 'rgba(44,24,5,0.6)', textShadowRadius: 7 },
  brandNameDesktop: { fontSize: 43, lineHeight: 55, letterSpacing: 12.5 },
  brandReading: { marginTop: 2, color: '#D8B46E', fontSize: 8, lineHeight: 13, fontWeight: '700', letterSpacing: 3.3 },
  brandReadingCompact: { marginTop: 0 },
  brandRule: { width: 48, height: 1, marginTop: 15, backgroundColor: '#D5AF63' },
  heroTitle: { marginTop: 25, color: '#FFF8ED', fontSize: 25, lineHeight: 36, letterSpacing: 0.6, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8 },
  heroTitleDesktop: { marginTop: 27, fontSize: 43, lineHeight: 61, letterSpacing: 1.4 },
  heroTitleCompact: { marginTop: 15, fontSize: 21, lineHeight: 30 },
  heroCopy: { marginTop: 15, color: '#E6C77F', fontSize: 13, lineHeight: 20, letterSpacing: 0.45, textAlign: 'center' },
  heroCopyDesktop: { marginTop: 19, fontSize: 19, lineHeight: 29, letterSpacing: 0.8 },
  heroCopyCompact: { marginTop: 8, fontSize: 11, lineHeight: 16 },
  choiceSection: { width: '100%', alignSelf: 'center', marginTop: 8 },
  choiceSectionDesktop: { maxWidth: 1040 },
  choiceSectionCompact: { flexShrink: 1 },
  plans: { flexDirection: 'row', gap: 12 },
  plansDesktop: { gap: 86 },
  plan: { flex: 1, minWidth: 0, minHeight: 224, overflow: 'hidden', borderRadius: 17, paddingHorizontal: 16, paddingTop: 22, paddingBottom: 17, justifyContent: 'space-between', shadowColor: '#5A4630', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 4 },
  planDesktop: { minHeight: 356, borderRadius: 20, paddingHorizontal: 48, paddingTop: 43, paddingBottom: 36 },
  planCompact: { minHeight: 185, borderRadius: 13, paddingHorizontal: 10, paddingTop: 15, paddingBottom: 11 },
  planNarrow: { paddingHorizontal: 8 },
  freePlan: { borderWidth: 1, borderColor: 'rgba(167,139,94,0.32)', backgroundColor: 'rgba(255,253,248,0.88)' },
  completePlan: { borderWidth: 1, borderColor: '#C89A48', backgroundColor: 'rgba(255,252,246,0.88)' },
  planCopy: { alignItems: 'center' },
  planTitle: { color: '#24221D', fontSize: 24, lineHeight: 33, textAlign: 'center' },
  planTitleDesktop: { fontSize: 38, lineHeight: 51 },
  planTitleCompact: { fontSize: 21, lineHeight: 29 },
  completePlanTitle: { color: '#A87520' },
  planLead: { marginTop: 10, color: '#4D4840', fontSize: 11, lineHeight: 17, textAlign: 'center' },
  planLeadDesktop: { fontSize: 13, lineHeight: 20 },
  planLeadCompact: { marginTop: 6, fontSize: 10.5, lineHeight: 15 },
  completePlanLead: { color: '#4D4840' },
  planButton: { alignSelf: 'stretch', minHeight: 50, marginTop: 15, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planButtonCompact: { minHeight: 43, marginTop: 9, borderRadius: 8 },
  freeButton: { backgroundColor: '#1B1B19', shadowColor: '#0D0D0C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 7, elevation: 3 },
  completeButton: { backgroundColor: '#B67A1C', shadowColor: '#7B4E0B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3 },
  buttonText: { color: '#FFFCF5', fontSize: 17, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  buttonTextDesktop: { fontSize: 19, lineHeight: 27 },
  buttonTextCompact: { fontSize: 15, lineHeight: 21 },
  completeButtonText: { color: '#FFF9ED' },
  notePill: { alignSelf: 'center', marginTop: 17, paddingHorizontal: 13, paddingVertical: 4, borderRadius: 999, backgroundColor: 'rgba(98,88,70,0.1)' },
  notePillCompact: { marginTop: 8, paddingHorizontal: 8, paddingVertical: 2 },
  completeNotePill: { backgroundColor: 'rgba(169,128,50,0.11)' },
  noteText: { color: '#686158', fontSize: 11, lineHeight: 16 },
  noteTextCompact: { fontSize: 9, lineHeight: 13 },
  completeNoteText: { color: '#795C26' },
  bottomMessage: { marginTop: 26, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 20 },
  bottomRule: { width: 76, height: 1, backgroundColor: 'rgba(173,129,51,0.6)' },
  bottomText: { color: '#5C5140', fontSize: 14, lineHeight: 21, letterSpacing: 0.7 },
  pressed: { opacity: 0.86, transform: [{ scale: 0.987 }] },
});
