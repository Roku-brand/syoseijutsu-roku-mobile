import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, layout, radius, spacing } from '@/constants/theme';
import { learningCases, learningStages } from '@/data/learning';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { COMPLETE_EDITION_PRICE_JPY } from '@/lib/purchase';

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords } = useAppState();
  const { isPaid } = useAccess();

  const openStage = (stage: number) => {
    if (!isPaid && stage > 1) {
      router.push({ pathname: '/upgrade', params: { source: 'learning' } });
      return;
    }
    const cases = learningCases.filter((item) => item.stage === stage);
    const next = cases.find((item) => !learningRecords[item.id]) ?? cases[0];
    router.push(`/learn/${next.id}`);
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.intro}>
        <AppText style={styles.introTitle}>3つのステージで実践力を磨く</AppText>
        <AppText style={styles.introBody}>全21ケースを通して、知恵をあなたの力に。</AppText>
      </View>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionLabel}>ステージを選ぶ</AppText>
        <AppText style={styles.sectionCount}>{isPaid ? learningCases.length : 7}ケース利用可能</AppText>
      </View>

      <View style={styles.stageList}>
        {learningStages.map((stage) => {
          const cases = learningCases.filter((item) => item.stage === stage.number);
          const locked = !isPaid && stage.number > 1;
          const completeCount = locked ? 0 : cases.filter((item) => learningRecords[item.id]).length;
          return (
            <Pressable
              key={stage.number}
              accessibilityRole="button"
              accessibilityLabel={`ステージ${stage.number}、${stage.title}${locked ? '、完全版限定' : ''}`}
              onPress={() => openStage(stage.number)}
              style={({ pressed }) => [styles.stage, locked && styles.stageLocked, pressed && styles.pressed]}
            >
              <View style={styles.stageMain}>
                <View style={styles.stageIcon}><AppText style={styles.stageIconText}>{stage.number === 1 ? '芽' : stage.number === 2 ? '力' : '冠'}</AppText></View>
                <View style={styles.stageCopy}>
                  <View style={styles.stageTopline}>
                    <AppText style={styles.stageNumber}>Stage {stage.number}</AppText>
                    <AppText style={[styles.stageProgress, locked && styles.stageProgressLocked]}>{completeCount}/{cases.length} ケース</AppText>
                  </View>
                  <AppText style={styles.stageTitle}>{stage.title}</AppText>
                  <AppText style={styles.stageIntro}>{stage.intro}</AppText>
                </View>
                <AppText style={styles.chevron}>›</AppText>
              </View>
              {locked ? <AppText style={styles.lockedReason}>{stage.number === 2 ? '頼まれ方・押され方・交渉の局面を扱います。' : '仕事と人生の選択を、自分の基準で決める局面を扱います。'}</AppText> : null}
              <View style={styles.stageFooter}>
                <View style={styles.dots}>
                  {cases.map((item, index) => <View key={item.id} style={[styles.dot, !locked && learningRecords[item.id] && styles.dotComplete]}><AppText style={[styles.dotText, !locked && learningRecords[item.id] && styles.dotTextComplete]}>{index + 1}</AppText></View>)}
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>

      {!isPaid ? (
        <Pressable style={({ pressed }) => [styles.upgradeCard, pressed && styles.pressed]} onPress={() => router.push({ pathname: '/upgrade', params: { source: 'learning' } })}>
          <AppText style={styles.upgradeEyebrow}>COMPLETE EDITION / ¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
          <AppText style={styles.upgradeTitle}>「知っている」を、「選べる」に変える。</AppText>
          <AppText style={styles.upgradeBody}>全21ケースと、関連する216の処世術・526の理論を解放。判断の理由まで体系的に振り返れます。</AppText>
          <AppText style={styles.upgradeCta}>完全版にアップグレード　›</AppText>
        </Pressable>
      ) : null}

      <View style={styles.footer}>
        <AppText style={styles.footerMark}>禄</AppText>
        <AppText style={styles.footerText}>答えを暗記するのではなく、状況・目的・副作用を比較して、自分で一手を選ぶための学習です。</AppText>
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: spacing.lg, paddingBottom: layout.bottomContentInset },
  intro: { alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: spacing.lg },
  introTitle: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700', textAlign: 'center' },
  introBody: { marginTop: 3, color: colors.muted, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  sectionHeader: { marginHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 10 },
  sectionLabel: { color: colors.ink, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
  sectionCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.8 },
  stageList: { marginHorizontal: spacing.lg, gap: 12, marginTop: 14 },
  stage: { padding: 16, minHeight: 150, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  stageLocked: { backgroundColor: colors.surface, borderColor: colors.line },
  stageMain: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  stageIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  stageIconText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 18, lineHeight: 24, fontWeight: '700' },
  stageCopy: { flex: 1, minWidth: 0 },
  chevron: { color: colors.ink, fontSize: 28, lineHeight: 31 },
  stageTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stageNumber: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.45, fontWeight: '700' },
  stageProgress: { color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.6, fontWeight: '700' },
  stageProgressLocked: { color: colors.gold },
  stageTitle: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28, fontWeight: '700' },
  stageIntro: { marginTop: 4, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 13, lineHeight: 21 },
  lockedReason: { marginTop: 9, color: colors.muted, fontSize: 11, lineHeight: 18 },
  stageFooter: { marginTop: 'auto', paddingTop: 14, alignItems: 'center' },
  dots: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dotComplete: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotText: { color: colors.gold, fontSize: 9, lineHeight: 12, fontWeight: '700' },
  dotTextComplete: { color: '#FFFFFF' },
  upgradeCard: { marginHorizontal: spacing.lg, marginTop: 18, padding: 18, borderRadius: radius.md, backgroundColor: colors.gold },
  upgradeEyebrow: { color: '#FFFFFF', fontSize: 9, letterSpacing: 1.4, fontWeight: '700' },
  upgradeTitle: { marginTop: 9, color: '#FFFFFF', fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  upgradeBody: { marginTop: 7, color: '#FFF9ED', fontSize: 12, lineHeight: 20 },
  upgradeCta: { marginTop: 15, color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  footer: { marginHorizontal: spacing.lg, marginTop: 28, paddingTop: 18, borderTopWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  footerMark: { color: colors.gold, fontFamily: fonts.serif, fontSize: 22, lineHeight: 25 },
  footerText: { color: colors.muted, flex: 1, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
