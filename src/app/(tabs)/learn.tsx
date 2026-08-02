import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, layout, radius, shadow, spacing } from '@/constants/theme';
import { learningCases, learningStages } from '@/data/learning';
import { useAppState } from '@/state/app-state';

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords } = useAppState();

  const openStage = (stage: number) => {
    const cases = learningCases.filter((item) => item.stage === stage);
    const next = cases.find((item) => !learningRecords[item.id]) ?? cases[0];
    router.push(`/learn/${next.id}`);
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.sectionHeader}>
        <AppText style={styles.sectionLabel}>STAGE SELECT</AppText>
        <AppText style={styles.sectionCount}>{learningCases.length} CASES</AppText>
      </View>

      <View style={styles.stageList}>
        {learningStages.map((stage) => {
          const cases = learningCases.filter((item) => item.stage === stage.number);
          const completeCount = cases.filter((item) => learningRecords[item.id]).length;
          const allComplete = completeCount === cases.length;
          return (
            <Pressable
              key={stage.number}
              accessibilityRole="button"
              accessibilityLabel={`ステージ${stage.number}、${stage.title}`}
              onPress={() => openStage(stage.number)}
              style={({ pressed }) => [styles.stage, pressed && styles.pressed]}
            >
              <View style={styles.stageTopline}>
                <AppText style={styles.stageNumber}>STAGE {String(stage.number).padStart(2, '0')}</AppText>
                <AppText style={styles.stageProgress}>
                  {allComplete ? 'CLEAR' : `${completeCount} / ${cases.length}`}
                </AppText>
              </View>
              <AppText style={styles.stageTitle}>{stage.title}</AppText>
              <AppText style={styles.stageIntro}>{stage.intro}</AppText>
              <View style={styles.stageFooter}>
                <View style={styles.dots}>
                  {cases.map((item) => <View key={item.id} style={[styles.dot, learningRecords[item.id] && styles.dotComplete]} />)}
                </View>
                <AppText style={styles.play}>{allComplete ? 'REPLAY  →' : 'PLAY  →'}</AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <AppText style={styles.footerMark}>21</AppText>
        <AppText style={styles.footerText}>選んだ一手は、関連する処世術へつながる。</AppText>
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: spacing.lg, paddingBottom: layout.bottomContentInset },
  sectionHeader: { marginHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 10 },
  sectionLabel: { color: colors.ink, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
  sectionCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1 },
  stageList: { marginHorizontal: spacing.lg, gap: 12, marginTop: 14 },
  stage: { padding: 20, minHeight: 157, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, ...shadow.card },
  stageTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  stageNumber: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.45, fontWeight: '700' },
  stageProgress: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 0.7, fontWeight: '700' },
  stageTitle: { marginTop: 10, color: colors.ink, fontFamily: fonts.serif, fontSize: 24, lineHeight: 34, fontWeight: '700' },
  stageIntro: { marginTop: 4, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 13, lineHeight: 21 },
  stageFooter: { marginTop: 'auto', paddingTop: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 6, height: 6, borderRadius: 4, borderWidth: 1, borderColor: '#B7AB93' },
  dotComplete: { backgroundColor: colors.gold, borderColor: colors.gold },
  play: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1, fontWeight: '700' },
  footer: { marginHorizontal: spacing.lg, marginTop: 28, paddingTop: 18, borderTopWidth: 1, borderColor: colors.line, flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  footerMark: { color: colors.gold, fontFamily: fonts.serif, fontSize: 22, lineHeight: 25 },
  footerText: { color: colors.muted, flex: 1, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
