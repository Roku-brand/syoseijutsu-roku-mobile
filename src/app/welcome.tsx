import { useRouter } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useAppState } from '@/state/app-state';

const desktopBackground = require('../../assets/welcome/welcome-background-desktop.png');
const mobileBackground = require('../../assets/welcome/welcome-background-mobile.png');

type NoteTone = 'paper' | 'ink' | 'speech';

const desktopNotes: Array<{ text: string; tone: NoteTone; position: string }> = [
  { text: '友達が多い人の\n特徴5選', tone: 'ink', position: 'noteDesktopOne' },
  { text: '自分の話ばかり\nしない', tone: 'paper', position: 'noteDesktopTwo' },
  { text: '結局どう使えば\nいいの？？', tone: 'speech', position: 'noteDesktopThree' },
  { text: 'あるあるだけど\n続かない…', tone: 'ink', position: 'noteDesktopFour' },
  { text: 'ピークエンドの法則', tone: 'paper', position: 'noteDesktopFive' },
  { text: '単純接触効果', tone: 'ink', position: 'noteDesktopSix' },
  { text: '頭では理解してるけど\n実生活で生かせない', tone: 'speech', position: 'noteDesktopSeven' },
  { text: 'プレモーテム', tone: 'paper', position: 'noteDesktopEight' },
  { text: '現状維持バイアス', tone: 'ink', position: 'noteDesktopNine' },
];

const mobileNotes: Array<{ text: string; tone: NoteTone; position: string }> = [
  { text: '友達が多い人の\n特徴5選', tone: 'ink', position: 'noteMobileOne' },
  { text: '知ってる。\nでも行動できない…', tone: 'speech', position: 'noteMobileTwo' },
  { text: '結局どう使えば\nいいの？？', tone: 'speech', position: 'noteMobileThree' },
  { text: 'プレモーテム', tone: 'paper', position: 'noteMobileFour' },
];

export default function Welcome() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const { interests, completeOnboarding } = useAppState();
  const desktop = width >= 900;
  const compact = !desktop && width < 370;
  const heroHeight = desktop
    ? Math.max(460, Math.min(560, height * 0.53))
    : Math.max(590, Math.min(760, height * 0.69));

  const startFree = () => {
    completeOnboarding(interests);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
      <ImageBackground
        source={desktop ? desktopBackground : mobileBackground}
        resizeMode="cover"
        style={styles.page}
        imageStyle={styles.backgroundImage}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={[styles.hero, { minHeight: heroHeight }, desktop && styles.heroDesktop]}>
            {(desktop ? desktopNotes : mobileNotes).map((note, index) => (
              <FloatingNote key={`${note.text}-${index}`} text={note.text} tone={note.tone} style={noteStyle(note.position)} />
            ))}
            <View style={[styles.heroCopy, desktop && styles.heroCopyDesktop, compact && styles.heroCopyCompact]}>
              <Brand compact={compact} desktop={desktop} />
              <AppText variant="serif" style={[styles.heroTitle, desktop && styles.heroTitleDesktop, compact && styles.heroTitleCompact]}>
                人生をうまく生きる方法を、{`\n`}すべての人へ。
              </AppText>
              <View style={styles.heroUnderline} />
              <AppText variant="serif" style={[styles.heroLead, desktop && styles.heroLeadDesktop, compact && styles.heroLeadCompact]}>
                流れていく知恵を、ここで使える体系にする。
              </AppText>
              <View style={[styles.heroStatement, desktop && styles.heroStatementDesktop, compact && styles.heroStatementCompact]}>
                <AppText variant="serif" style={[styles.heroStatementText, desktop && styles.heroStatementTextDesktop]}>聞いたことがある、で終わらせない。</AppText>
              </View>
            </View>
          </View>

          <View style={[styles.overview, desktop && styles.overviewDesktop, compact && styles.overviewCompact]}>
            <AppText variant="serif" style={[styles.overviewHeading, desktop && styles.overviewHeadingDesktop]}>このアプリで得られること</AppText>
            <View style={[styles.overviewBody, desktop && styles.overviewBodyDesktop]}>
              <View style={styles.statsArea}>
                <View style={[styles.stats, desktop && styles.statsDesktop]}>
                  <Stat icon="◎" number="26" label="人物像" description="理想の人物像から\n自分のあり方を理解できる" />
                  <Stat icon="▣" number="336" label="処世術" description="今日から使える具体的な知恵で\n行動を変えられる" />
                  <Stat icon="◈" number="541" label="理論" description="心理学・行動科学・組織論などの\n学術知見に基づいて理解が深まる" last />
                </View>
                {!desktop ? <WelcomeSteps compact={compact} /> : null}
                <AppText variant="serif" style={[styles.systemMessage, desktop && styles.systemMessageDesktop]}>体系的に学び、人生に活かすことができる。</AppText>
                <View style={[styles.plans, desktop && styles.plansDesktop]}>
                  <PlanCard
                    title="無料版"
                    description="まずは気軽に、処世術の一部を体験できます。"
                    button="無料で始める"
                    note="登録不要"
                    onPress={startFree}
                  />
                  <PlanCard
                    complete
                    title="完全版"
                    description="すべての人物像・処世術・理論にアクセスできます。"
                    button="すべての内容を見る"
                    note="利用条件は内容画面で確認"
                    onPress={() => router.push('/upgrade')}
                  />
                </View>
              </View>
              {desktop ? <WelcomeSteps /> : null}
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

function Brand({ compact, desktop }: { compact: boolean; desktop: boolean }) {
  return <View style={styles.brand}>
    <AppText variant="serif" style={[styles.brandName, desktop && styles.brandNameDesktop, compact && styles.brandNameCompact]}>処 世 術 禄</AppText>
    <AppText style={[styles.brandReading, desktop && styles.brandReadingDesktop]}>SHO SEI JUTSU ROKU</AppText>
    <View style={styles.brandRule} />
  </View>;
}

function FloatingNote({ text, tone, style }: { text: string; tone: NoteTone; style?: object }) {
  const toneStyle = tone === 'paper' ? styles.notePaper : tone === 'ink' ? styles.noteInk : styles.noteSpeech;
  return <View pointerEvents="none" style={[styles.note, toneStyle, style]}>
    <AppText style={[styles.noteText, tone === 'ink' && styles.noteTextInk]}>{text}</AppText>
  </View>;
}

function noteStyle(position: string) {
  switch (position) {
    case 'noteDesktopOne': return styles.noteDesktopOne;
    case 'noteDesktopTwo': return styles.noteDesktopTwo;
    case 'noteDesktopThree': return styles.noteDesktopThree;
    case 'noteDesktopFour': return styles.noteDesktopFour;
    case 'noteDesktopFive': return styles.noteDesktopFive;
    case 'noteDesktopSix': return styles.noteDesktopSix;
    case 'noteDesktopSeven': return styles.noteDesktopSeven;
    case 'noteDesktopEight': return styles.noteDesktopEight;
    case 'noteDesktopNine': return styles.noteDesktopNine;
    case 'noteMobileOne': return styles.noteMobileOne;
    case 'noteMobileTwo': return styles.noteMobileTwo;
    case 'noteMobileThree': return styles.noteMobileThree;
    case 'noteMobileFour': return styles.noteMobileFour;
    default: return undefined;
  }
}

function Stat({ icon, number, label, description, last = false }: { icon: string; number: string; label: string; description: string; last?: boolean }) {
  return <View style={[styles.stat, last && styles.statLast]}>
    <View style={styles.statTop}><View style={styles.statIcon}><AppText style={styles.statIconText}>{icon}</AppText></View><AppText variant="serif" style={styles.statNumber}>{number}</AppText><AppText variant="serif" style={styles.statUnit}>の</AppText></View>
    <AppText variant="serif" style={styles.statLabel}>{label}</AppText>
    <AppText style={styles.statDescription}>{description}</AppText>
  </View>;
}

function WelcomeSteps({ compact = false }: { compact?: boolean }) {
  const steps = [
    ['◎', '人物像', '理想の人物像を知り、\n目指す方向性を定める'],
    ['◉', '処世術', '具体的な知恵を\nインプットし、実践の\nヒントを得る'],
    ['▣', '理論', 'なぜ効果があるのかを\n学び、本質を理解する'],
    ['✓', '実践', '日常で使い、振り返ることで\n習慣として定着する'],
  ];
  return <View style={[styles.stepsWrap, compact && styles.stepsWrapCompact]}>
    <AppText variant="serif" style={styles.stepsHeading}>知識を、使える力に変える4ステップ</AppText>
    <View style={styles.steps}>{steps.map(([icon, title, description], index) => <View key={title} style={styles.stepItem}>
      <View style={styles.stepIcon}><AppText style={styles.stepIconText}>{icon}</AppText></View>
      <AppText variant="serif" style={styles.stepTitle}>{title}</AppText>
      <AppText style={styles.stepDescription}>{description}</AppText>
      {index < steps.length - 1 ? <AppText style={styles.stepArrow}>›</AppText> : null}
    </View>)}</View>
  </View>;
}

function PlanCard({ title, description, button, note, complete = false, onPress }: { title: string; description: string; button: string; note: string; complete?: boolean; onPress: () => void }) {
  return <View style={[styles.plan, complete && styles.planComplete]}>
    <View style={styles.planHeader}><AppText variant="serif" style={[styles.planTitle, complete && styles.planTitleComplete]}>{title}</AppText><AppText style={styles.planDescription}>{description}</AppText></View>
    <Pressable accessibilityRole="button" accessibilityLabel={button} onPress={onPress} style={({ pressed }) => [styles.planButton, complete && styles.planButtonComplete, pressed && styles.pressed]}>
      <AppText variant="serif" style={styles.planButtonText}>{button}</AppText><AppText style={styles.planChevron}>›</AppText>
    </Pressable>
    <View style={[styles.planNote, complete && styles.planNoteComplete]}><AppText style={[styles.planNoteText, complete && styles.planNoteTextComplete]}>{note}</AppText></View>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090A09' },
  page: { flex: 1, backgroundColor: '#F7F0E5' },
  backgroundImage: { opacity: 1 },
  scrollContent: { flexGrow: 1 },
  hero: { position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, paddingTop: 26, paddingBottom: 34 },
  heroDesktop: { paddingTop: 18, paddingBottom: 54 },
  heroCopy: { width: '100%', maxWidth: 690, alignItems: 'center', zIndex: 2 },
  heroCopyDesktop: { maxWidth: 800 },
  heroCopyCompact: { transform: [{ scale: 0.92 }] },
  brand: { alignItems: 'center' },
  brandName: { color: '#E7C174', fontSize: 31, lineHeight: 42, letterSpacing: 8, textShadowColor: 'rgba(92,57,10,0.7)', textShadowRadius: 8 },
  brandNameDesktop: { fontSize: 43, lineHeight: 57, letterSpacing: 12 },
  brandNameCompact: { fontSize: 26, lineHeight: 36, letterSpacing: 6.4 },
  brandReading: { marginTop: 3, color: '#E7C174', fontSize: 8, lineHeight: 13, letterSpacing: 3.5, fontWeight: '800' },
  brandReadingDesktop: { marginTop: 5, fontSize: 10, lineHeight: 16, letterSpacing: 5.4 },
  brandRule: { width: 50, height: 1, marginTop: 21, backgroundColor: '#C88F27' },
  heroTitle: { marginTop: 38, color: '#FFF8EB', fontSize: 31, lineHeight: 46, letterSpacing: 1.2, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.75)', textShadowRadius: 10 },
  heroTitleDesktop: { marginTop: 40, fontSize: 49, lineHeight: 68, letterSpacing: 2.3 },
  heroTitleCompact: { marginTop: 31, fontSize: 27, lineHeight: 40 },
  heroUnderline: { width: 124, height: 3, marginTop: 9, borderRadius: 9, backgroundColor: '#BD8119', transform: [{ rotate: '-2deg' }] },
  heroLead: { marginTop: 27, color: '#FAF2E5', fontSize: 17, lineHeight: 27, letterSpacing: 0.9, textAlign: 'center' },
  heroLeadDesktop: { marginTop: 28, fontSize: 21, lineHeight: 33, letterSpacing: 1.4 },
  heroLeadCompact: { marginTop: 22, fontSize: 15, lineHeight: 23 },
  heroStatement: { marginTop: 31, paddingHorizontal: 20, paddingVertical: 13, borderWidth: 1, borderColor: '#C58B25', borderRadius: 5, backgroundColor: 'rgba(6,7,7,0.35)' },
  heroStatementDesktop: { marginTop: 30, paddingHorizontal: 28, paddingVertical: 15 },
  heroStatementCompact: { marginTop: 25, paddingHorizontal: 16, paddingVertical: 10 },
  heroStatementText: { color: '#FFF9EE', fontSize: 23, lineHeight: 34, letterSpacing: 0.7, textAlign: 'center' },
  heroStatementTextDesktop: { fontSize: 34, lineHeight: 46, letterSpacing: 1.5 },
  note: { position: 'absolute', zIndex: 1, minWidth: 92, maxWidth: 190, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  notePaper: { borderRadius: 3, backgroundColor: '#F7EEDB', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 9, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  noteInk: { borderRadius: 4, backgroundColor: 'rgba(27,28,27,0.94)', borderWidth: 1, borderColor: 'rgba(196,143,37,0.48)', shadowColor: '#000', shadowOpacity: 0.34, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 4 },
  noteSpeech: { borderRadius: 999, backgroundColor: '#FAF0DE', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  noteText: { color: '#1A1916', fontSize: 13, lineHeight: 20, fontWeight: '700', textAlign: 'center' },
  noteTextInk: { color: '#FBF5E9' },
  noteDesktopOne: { left: '3%', top: '13%', transform: [{ rotate: '-11deg' }] },
  noteDesktopTwo: { left: '3%', top: '37%', transform: [{ rotate: '-10deg' }] },
  noteDesktopThree: { left: '6%', top: '63%', transform: [{ rotate: '-4deg' }] },
  noteDesktopFour: { left: '16%', top: '69%', transform: [{ rotate: '-2deg' }] },
  noteDesktopFive: { right: '14%', top: '10%', transform: [{ rotate: '-7deg' }] },
  noteDesktopSix: { right: '12%', top: '37%', transform: [{ rotate: '2deg' }] },
  noteDesktopSeven: { right: '11%', top: '57%', transform: [{ rotate: '-3deg' }] },
  noteDesktopEight: { right: '3%', top: '43%', transform: [{ rotate: '8deg' }] },
  noteDesktopNine: { right: '3%', top: '70%', transform: [{ rotate: '-5deg' }] },
  noteMobileOne: { left: 14, top: 120, transform: [{ rotate: '-9deg' }] },
  noteMobileTwo: { right: 14, top: 120, transform: [{ rotate: '4deg' }] },
  noteMobileThree: { left: 14, bottom: 15, transform: [{ rotate: '-4deg' }] },
  noteMobileFour: { right: 14, bottom: 15, transform: [{ rotate: '6deg' }] },
  overview: { width: '100%', paddingHorizontal: 17, paddingTop: 33, paddingBottom: 34, backgroundColor: 'rgba(250,246,238,0.84)' },
  overviewDesktop: { paddingHorizontal: 44, paddingTop: 33, paddingBottom: 26 },
  overviewCompact: { paddingHorizontal: 12, paddingTop: 27 },
  overviewHeading: { alignSelf: 'center', color: '#24221D', fontSize: 21, lineHeight: 30, letterSpacing: 1.1 },
  overviewHeadingDesktop: { fontSize: 26, lineHeight: 36, letterSpacing: 1.8 },
  overviewBody: { width: '100%', maxWidth: 1280, alignSelf: 'center' },
  overviewBodyDesktop: { flexDirection: 'row', alignItems: 'center', gap: 42 },
  statsArea: { flex: 1, minWidth: 0 },
  stats: { flexDirection: 'row', marginTop: 27 },
  statsDesktop: { marginTop: 34 },
  stat: { flex: 1, minWidth: 0, alignItems: 'center', paddingHorizontal: 5, borderRightWidth: 1, borderRightColor: '#CFC2AF' },
  statLast: { borderRightWidth: 0 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  statIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#161714' },
  statIconText: { color: '#F4D88D', fontSize: 17, lineHeight: 21 },
  statNumber: { color: '#11120F', fontSize: 36, lineHeight: 47 },
  statUnit: { color: '#11120F', fontSize: 14, lineHeight: 21 },
  statLabel: { marginTop: 5, color: '#23231F', fontSize: 17, lineHeight: 24 },
  statDescription: { marginTop: 9, color: '#423D34', fontSize: 10.5, lineHeight: 15, textAlign: 'center' },
  stepsWrap: { width: '100%', marginTop: 34 },
  stepsWrapCompact: { marginTop: 28 },
  stepsHeading: { color: '#292720', fontSize: 17, lineHeight: 25, textAlign: 'center', letterSpacing: 0.8 },
  steps: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 18 },
  stepItem: { flex: 1, minWidth: 0, alignItems: 'center', position: 'relative', paddingHorizontal: 2 },
  stepIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C5A66E', backgroundColor: '#FBF6EC' },
  stepIconText: { color: '#1F201C', fontSize: 25, lineHeight: 30 },
  stepTitle: { marginTop: 7, color: '#2B2923', fontSize: 14, lineHeight: 20 },
  stepDescription: { marginTop: 5, color: '#433D33', fontSize: 9.5, lineHeight: 14, textAlign: 'center' },
  stepArrow: { position: 'absolute', top: 13, right: -3, color: '#9E7C43', fontSize: 24, lineHeight: 28 },
  systemMessage: { marginTop: 29, color: '#24221D', fontSize: 21, lineHeight: 31, textAlign: 'center', letterSpacing: 0.7 },
  systemMessageDesktop: { marginTop: 26, fontSize: 27, lineHeight: 37, letterSpacing: 1.2 },
  plans: { gap: 14, marginTop: 23 },
  plansDesktop: { flexDirection: 'row', gap: 34, marginTop: 22 },
  plan: { flex: 1, padding: 17, borderWidth: 1, borderColor: '#D0BA91', borderRadius: 15, backgroundColor: 'rgba(255,253,248,0.88)', shadowColor: '#6E5430', shadowOpacity: 0.1, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  planComplete: { borderColor: '#C6912B' },
  planHeader: { alignItems: 'center' },
  planTitle: { color: '#191914', fontSize: 26, lineHeight: 35 },
  planTitleComplete: { color: '#B07616' },
  planDescription: { marginTop: 4, color: '#4C463C', fontSize: 10, lineHeight: 16, textAlign: 'center' },
  planButton: { minHeight: 52, marginTop: 15, paddingHorizontal: 17, borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#171816', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  planButtonComplete: { backgroundColor: '#B87B16' },
  planButtonText: { color: '#FFF9ED', fontSize: 17, lineHeight: 24, letterSpacing: 0.6 },
  planChevron: { position: 'absolute', right: 16, color: '#F4D48A', fontSize: 32, lineHeight: 35, fontWeight: '300' },
  planNote: { alignSelf: 'center', marginTop: 10, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 99, backgroundColor: '#EEE8DB' },
  planNoteComplete: { backgroundColor: '#F2E7CF' },
  planNoteText: { color: '#625B4F', fontSize: 9, lineHeight: 13 },
  planNoteTextComplete: { color: '#8E6624' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.986 }] },
});
