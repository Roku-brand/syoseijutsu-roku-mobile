import { useRouter } from 'expo-router';
import { Image, ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useAppState } from '@/state/app-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const desktopBackground = require('../../assets/welcome/welcome-background-desktop.png');
const mobileBackground = require('../../assets/welcome/welcome-background-mobile.png');
const appIcon = require('../../assets/brand/icon.png');

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
  // Match the static-rendered first frame, then use the real viewport after
  // hydration. This prevents desktop/mobile markup from mismatching during
  // web hydration and briefly breaking the welcome composition.
  const { width, height, hydrated } = useHydratedWindowDimensions();
  const { interests, completeOnboarding } = useAppState();
  const desktop = hydrated && width >= 900;
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
          <WelcomeHeader desktop={desktop} compact={compact} onStartFree={startFree} onOpenComplete={() => router.push('/upgrade')} />
          <View style={[styles.hero, { minHeight: heroHeight }, desktop && styles.heroDesktop]}>
            {(desktop ? desktopNotes : mobileNotes).map((note, index) => (
              <FloatingNote key={`${note.text}-${index}`} text={note.text} tone={note.tone} style={noteStyle(note.position)} />
            ))}
            <View style={[styles.heroCopy, desktop && styles.heroCopyDesktop, compact && styles.heroCopyCompact]}>
              <AppText variant="serif" style={[styles.heroTitle, desktop && styles.heroTitleDesktop, compact && styles.heroTitleCompact]}>
                {desktop ? `人生をうまく生きる方法を、\nすべての人へ。` : `人生をうまく生きる\n方法を、すべての人へ。`}
              </AppText>
              <View style={styles.heroUnderline} />
              <AppText variant="serif" style={[styles.heroLead, desktop && styles.heroLeadDesktop, compact && styles.heroLeadCompact]}>
                {desktop ? '流れていく知恵を、ここで使える体系にする。' : '流れていく知恵を、\nここで使える体系にする。'}
              </AppText>
              <View style={[styles.heroStatement, desktop && styles.heroStatementDesktop, compact && styles.heroStatementCompact]}>
                <AppText variant="serif" style={[styles.heroStatementText, desktop && styles.heroStatementTextDesktop]}>{desktop ? '聞いたことがある、で終わらせない。' : '聞いたことがある、\nで終わらせない。'}</AppText>
              </View>
            </View>
          </View>

          <View style={[styles.overview, desktop && styles.overviewDesktop, compact && styles.overviewCompact]}>
            <AppText variant="serif" style={[styles.overviewHeading, desktop && styles.overviewHeadingDesktop]}>このアプリで得られること</AppText>
            <View style={[styles.overviewBody, desktop && styles.overviewBodyDesktop]}>
              <View style={styles.statsArea}>
                <View testID="welcome-stats" style={[styles.stats, desktop && styles.statsDesktop]}>
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
              {desktop ? <WelcomeSteps desktop /> : null}
            </View>
          </View>
        </ScrollView>
      </ImageBackground>
    </SafeAreaView>
  );
}

function WelcomeHeader({
  desktop,
  compact,
  onStartFree,
  onOpenComplete,
}: {
  desktop: boolean;
  compact: boolean;
  onStartFree: () => void;
  onOpenComplete: () => void;
}) {
  return <View testID="welcome-entry-header" style={[styles.entryHeader, desktop && styles.entryHeaderDesktop, compact && styles.entryHeaderCompact]}>
    <View style={styles.entryBrand}>
      <Image source={appIcon} accessibilityLabel="処世術禄のホームアイコン" style={[styles.entryIcon, desktop && styles.entryIconDesktop]} />
      <View style={styles.entryBrandCopy}>
        <AppText variant="serif" style={[styles.entryBrandName, desktop && styles.entryBrandNameDesktop]}>処世術禄</AppText>
        <AppText style={[styles.entryBrandReading, desktop && styles.entryBrandReadingDesktop]}>SHO SEI JUTSU ROKU</AppText>
      </View>
    </View>
    <View style={styles.entryDivider} />
    <View style={styles.entryActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="無料版をすぐ始める" onPress={onStartFree} style={({ pressed }) => [styles.entryAction, pressed && styles.pressed]}>
        <EntryMark type="free" />
        <View style={styles.entryActionCopy}><AppText style={styles.entryActionKicker}>FREE EDITION</AppText><AppText variant="serif" style={styles.entryActionTitle}>無料版をはじめる</AppText></View>
        <AppText style={styles.entryChevron}>›</AppText>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel="完全版の内容を見る" onPress={onOpenComplete} style={({ pressed }) => [styles.entryAction, styles.entryActionComplete, pressed && styles.pressed]}>
        <EntryMark type="complete" />
        <View style={styles.entryActionCopy}><AppText style={[styles.entryActionKicker, styles.entryActionKickerComplete]}>COMPLETE EDITION</AppText><AppText variant="serif" style={[styles.entryActionTitle, styles.entryActionTitleComplete]}>完全版を見る</AppText></View>
        <AppText style={[styles.entryChevron, styles.entryChevronComplete]}>›</AppText>
      </Pressable>
    </View>
  </View>;
}

function EntryMark({ type }: { type: 'free' | 'complete' }) {
  return <View style={[styles.entryMark, type === 'complete' && styles.entryMarkComplete]}>
    {type === 'free' ? <><View style={styles.entryBookLeft} /><View style={styles.entryBookRight} /></> : <><View style={styles.entryCrownBase} /><View style={styles.entryCrownPeakOne} /><View style={styles.entryCrownPeakTwo} /><View style={styles.entryCrownPeakThree} /></>}
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

function WelcomeSteps({ compact = false, desktop = false }: { compact?: boolean; desktop?: boolean }) {
  const steps = [
    ['◎', '人物像', '理想の人物像を知り、\n目指す方向性を定める'],
    ['◉', '処世術', '具体的な知恵を\nインプットし、実践の\nヒントを得る'],
    ['▣', '理論', 'なぜ効果があるのかを\n学び、本質を理解する'],
    ['✓', '実践', '日常で使い、振り返ることで\n習慣として定着する'],
  ];
  return <View testID="welcome-steps" style={[styles.stepsWrap, compact && styles.stepsWrapCompact, desktop && styles.stepsWrapDesktop]}>
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
  entryHeader: { minHeight: 82, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'column', gap: 8, backgroundColor: 'rgba(9,10,9,0.97)', borderBottomWidth: 1, borderBottomColor: '#B8872D' },
  entryHeaderDesktop: { minHeight: 126, paddingHorizontal: 52, paddingVertical: 22, flexDirection: 'row', alignItems: 'center', gap: 36 },
  entryHeaderCompact: { minHeight: 74, paddingHorizontal: 12, gap: 6 },
  entryBrand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  entryIcon: { width: 38, height: 38, borderRadius: 19 },
  entryIconDesktop: { width: 66, height: 66, borderRadius: 33 },
  entryBrandCopy: { minWidth: 0 },
  entryBrandName: { color: '#F1D185', fontSize: 20, lineHeight: 27, fontWeight: '600', letterSpacing: 3 },
  entryBrandNameDesktop: { fontSize: 35, lineHeight: 46, letterSpacing: 6 },
  entryBrandReading: { marginTop: 1, color: '#DFBD70', fontSize: 7, lineHeight: 11, fontWeight: '700', letterSpacing: 2.6 },
  entryBrandReadingDesktop: { marginTop: 2, fontSize: 9, lineHeight: 14, letterSpacing: 4.4 },
  entryDivider: { width: 1, alignSelf: 'stretch', backgroundColor: 'rgba(226,198,130,0.24)' },
  entryActions: { flex: 1, flexDirection: 'row', gap: 12, alignItems: 'center', justifyContent: 'flex-end' },
  entryAction: { flex: 1, minWidth: 0, minHeight: 46, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#B48734', borderRadius: 14, backgroundColor: 'rgba(13,14,13,0.66)' },
  entryActionComplete: { borderColor: '#D7AF58', backgroundColor: '#F2DEAC' },
  entryMark: { width: 23, height: 23, position: 'relative', flexShrink: 0 },
  entryMarkComplete: { width: 25, height: 23 },
  entryBookLeft: { position: 'absolute', left: 2, top: 3, width: 10, height: 16, borderWidth: 1.25, borderColor: '#D5AD58', borderTopLeftRadius: 2, borderBottomLeftRadius: 2 },
  entryBookRight: { position: 'absolute', right: 2, top: 3, width: 10, height: 16, borderWidth: 1.25, borderColor: '#D5AD58', borderTopRightRadius: 2, borderBottomRightRadius: 2 },
  entryCrownBase: { position: 'absolute', left: 2, right: 2, bottom: 3, height: 5, borderWidth: 1.25, borderColor: '#5B431B', borderRadius: 1 },
  entryCrownPeakOne: { position: 'absolute', left: 3, top: 5, width: 1.5, height: 10, backgroundColor: '#5B431B', transform: [{ rotate: '-28deg' }] },
  entryCrownPeakTwo: { position: 'absolute', left: 12, top: 2, width: 1.5, height: 13, backgroundColor: '#5B431B' },
  entryCrownPeakThree: { position: 'absolute', right: 3, top: 5, width: 1.5, height: 10, backgroundColor: '#5B431B', transform: [{ rotate: '28deg' }] },
  entryActionCopy: { flex: 1, minWidth: 0 },
  entryActionKicker: { color: '#C9A663', fontSize: 7, lineHeight: 10, letterSpacing: 1.3, fontWeight: '800' },
  entryActionKickerComplete: { color: '#6D552A' },
  entryActionTitle: { marginTop: 1, color: '#F7EFDE', fontSize: 14, lineHeight: 18, fontWeight: '600', letterSpacing: 0.6 },
  entryActionTitleComplete: { color: '#231C12' },
  entryChevron: { color: '#D5AD58', fontSize: 27, lineHeight: 30, fontWeight: '300' },
  entryChevronComplete: { color: '#5B431B' },
  hero: { position: 'relative', overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 18, paddingTop: 72, paddingBottom: 34 },
  heroDesktop: { paddingTop: 72, paddingBottom: 54 },
  heroCopy: { width: '100%', maxWidth: 690, alignItems: 'center', zIndex: 2 },
  heroCopyDesktop: { maxWidth: 800 },
  heroCopyCompact: { transform: [{ scale: 0.92 }] },
  heroTitle: { color: '#F6F0E4', fontSize: 29, lineHeight: 44, letterSpacing: 1.4, textAlign: 'center', fontWeight: '400' },
  heroTitleDesktop: { fontSize: 49, lineHeight: 68, letterSpacing: 3 },
  heroTitleCompact: { fontSize: 27, lineHeight: 40 },
  heroUnderline: { width: 124, height: 3, marginTop: 9, borderRadius: 9, backgroundColor: '#BD8119', transform: [{ rotate: '-2deg' }] },
  heroLead: { marginTop: 27, color: '#DAD2C4', fontSize: 16, lineHeight: 27, letterSpacing: 1.25, textAlign: 'center', fontWeight: '500' },
  heroLeadDesktop: { marginTop: 28, fontSize: 20, lineHeight: 33, letterSpacing: 1.8 },
  heroLeadCompact: { marginTop: 22, fontSize: 15, lineHeight: 23 },
  heroStatement: { marginTop: 31, paddingHorizontal: 20, paddingVertical: 13, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#B68A3C', backgroundColor: 'rgba(6,7,7,0.18)' },
  heroStatementDesktop: { marginTop: 30, paddingHorizontal: 28, paddingVertical: 15 },
  heroStatementCompact: { marginTop: 25, paddingHorizontal: 16, paddingVertical: 10 },
  heroStatementText: { color: '#FFF8EC', fontSize: 22, lineHeight: 34, letterSpacing: 1.45, textAlign: 'center', fontWeight: '400' },
  heroStatementTextDesktop: { fontSize: 33, lineHeight: 46, letterSpacing: 2.2 },
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
  noteMobileOne: { left: 14, top: 14, transform: [{ rotate: '-9deg' }] },
  noteMobileTwo: { right: 14, top: 18, transform: [{ rotate: '4deg' }] },
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
  stepsWrapDesktop: { width: 360, flexShrink: 0, marginTop: 0 },
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
