import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { learningCases, learningStages } from '@/data/learning';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords } = useAppState();
  const { isPaid } = useAccess();

  const openCase = (stage: number, caseId?: string) => {
    if (!isPaid && stage > 1) {
      router.push({ pathname: '/upgrade', params: { source: 'learning' } });
      return;
    }
    const cases = learningCases.filter((item) => item.stage === stage);
    const next = caseId ? cases.find((item) => item.id === caseId) : cases.find((item) => !learningRecords[item.id]) ?? cases[0];
    if (next) router.push(`/learn/${next.id}`);
  };

  return (
    <BookScreen scroll={false} contentContainerStyle={styles.content}>
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
          const caseCount = cases.length || 7;
          const completeCount = locked ? 0 : cases.filter((item) => learningRecords[item.id]).length;
          return (
            <View
              key={stage.number}
              style={[styles.stage, locked && styles.stageLocked]}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`ステージ${stage.number}、${stage.title}${locked ? '、完全版限定' : ''}`}
                onPress={() => openCase(stage.number)}
                style={({ pressed }) => [styles.stageMain, pressed && styles.pressed]}
              >
                <View style={styles.stageIcon}><AppText style={styles.stageIconText}>{stage.number === 1 ? '芽' : stage.number === 2 ? '力' : '冠'}</AppText></View>
                <View style={styles.stageCopy}>
                  <View style={styles.stageTopline}>
                    <AppText style={styles.stageNumber}>Stage {stage.number}</AppText>
                    <AppText style={[styles.stageProgress, locked && styles.stageProgressLocked]}>{completeCount}/{caseCount} ケース</AppText>
                  </View>
                  <AppText style={styles.stageTitle}>{stage.title}</AppText>
                  <AppText style={styles.stageIntro}>{stage.intro}</AppText>
                </View>
                <AppText style={styles.chevron}>›</AppText>
              </Pressable>
              {locked ? <AppText style={styles.lockedReason}>{stage.number === 2 ? '頼まれ方・押され方・交渉の局面を扱います。' : '仕事と人生の選択を、自分の基準で決める局面を扱います。'}</AppText> : null}
              <View style={styles.stageFooter}>
                <View style={styles.dots}>
                  {Array.from({ length: caseCount }, (_, index) => {
                    const item = cases[index];
                    const complete = Boolean(item && !locked && learningRecords[item.id]);
                    return (
                      <Pressable
                        key={`${stage.number}-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={`ステージ${stage.number}、ケース${index + 1}${complete ? '、解答済み。もう一度解く' : ''}`}
                        disabled={locked || !item}
                        onPress={() => item && openCase(stage.number, item.id)}
                        style={({ pressed }) => [styles.dot, complete && styles.dotComplete, pressed && styles.dotPressed]}
                      >
                        <AppText style={[styles.dotText, complete && styles.dotTextComplete]}>{index + 1}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <AppText style={styles.caseHint}>番号からケースを選ぶ</AppText>
              </View>
            </View>
          );
        })}
      </View>

    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: spacing.sm, paddingBottom: spacing.sm },
  intro: { alignItems: 'center', paddingHorizontal: spacing.lg, marginBottom: 10 },
  introTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  introBody: { marginTop: 1, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  sectionHeader: { marginHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 7 },
  sectionLabel: { color: colors.ink, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
  sectionCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.8 },
  stageList: { flex: 1, marginHorizontal: spacing.lg, gap: 9, marginTop: 10 },
  stage: { flex: 1, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  stageLocked: { backgroundColor: colors.surface, borderColor: colors.line },
  stageMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  stageIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  stageIconText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  stageCopy: { flex: 1, minWidth: 0 },
  chevron: { color: colors.ink, fontSize: 24, lineHeight: 27 },
  stageTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stageNumber: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.45, fontWeight: '700' },
  stageProgress: { color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.6, fontWeight: '700' },
  stageProgressLocked: { color: colors.gold },
  stageTitle: { marginTop: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  stageIntro: { marginTop: 1, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  lockedReason: { display: 'none' },
  stageFooter: { marginTop: 'auto', paddingTop: 8, alignItems: 'center' },
  dots: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dotComplete: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotText: { color: colors.gold, fontSize: 8, lineHeight: 10, fontWeight: '700' },
  dotTextComplete: { color: '#FFFFFF' },
  dotPressed: { opacity: 0.55, transform: [{ scale: 0.92 }] },
  caseHint: { marginTop: 5, color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.5, textAlign: 'center' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
