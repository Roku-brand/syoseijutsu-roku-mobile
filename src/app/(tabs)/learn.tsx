import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AccessBadge } from '@/components/access-badge';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { learningCases, learningStages } from '@/data/learning';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { COMPLETE_LEARNING_CASE_COUNT, FREE_LEARNING_CASE_IDS } from '@/access/access-config';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords } = useAppState();
  const { isPaid } = useAccess();
  const { density, verticalPadding, sectionGap } = useResponsiveLayout();

  const openCase = (stage: number, caseId?: string) => {
    if (!isPaid && stage > 1) {
      router.push({ pathname: '/upgrade', params: { source: 'learning' } });
      return;
    }
    const cases = learningCases.filter((item) => item.stage === stage);
    const next = caseId ? cases.find((item) => item.id === caseId) : cases.find((item) => !learningRecords[item.id]) ?? cases[0];
    if (next) router.push({ pathname: '/learn/[caseId]', params: { caseId: next.id, retry: '1' } });
  };

  return (
    <BookScreen scroll={false} contentContainerStyle={[styles.content, { paddingTop: verticalPadding, paddingBottom: verticalPadding }]}>
      <View style={[styles.intro, density !== 'normal' && styles.introCompact]}>
        <AppText style={styles.introTitle}>3つのステージで実践力を磨く</AppText>
        <AppText style={styles.introBody}>全{COMPLETE_LEARNING_CASE_COUNT}ケースを通して、知恵をあなたの力に。</AppText>
      </View>
      <View style={[styles.sectionHeader, density !== 'normal' && styles.sectionHeaderCompact]}>
        <AppText style={styles.sectionLabel}>ステージを選ぶ</AppText>
        <AppText style={styles.sectionCount}>{isPaid ? COMPLETE_LEARNING_CASE_COUNT : FREE_LEARNING_CASE_IDS.length}ケース利用可能</AppText>
      </View>

      <View style={[styles.stageList, { gap: sectionGap, marginTop: sectionGap }]}>
        {learningStages.map((stage) => {
          const cases = learningCases.filter((item) => item.stage === stage.number);
          const locked = !isPaid && stage.number > 1;
          const caseCount = cases.length || FREE_LEARNING_CASE_IDS.length;
          const completeCount = locked ? 0 : cases.filter((item) => learningRecords[item.id]).length;
          return (
            <View
              key={stage.number}
              style={[styles.stage, density !== 'normal' && styles.stageCompact, locked && styles.stageLocked]}
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
                    <View style={styles.stageIdentity}>
                      <AppText style={styles.stageNumber}>Stage {stage.number}</AppText>
                      {locked ? <AccessBadge locked compact /> : null}
                    </View>
                    <AppText style={[styles.stageProgress, locked && styles.stageProgressLocked]}>{completeCount}/{caseCount} ケース</AppText>
                  </View>
                  <AppText style={styles.stageTitle}>{stage.title}</AppText>
                  <AppText style={styles.stageIntro}>{stage.intro}</AppText>
                </View>
                <AppText style={styles.chevron}>›</AppText>
              </Pressable>
              <View style={[styles.stageFooter, density !== 'normal' && styles.stageFooterCompact]}>
                <View style={styles.dots}>
                  {Array.from({ length: caseCount }, (_, index) => {
                    const item = cases[index];
                    const complete = Boolean(item && !locked && learningRecords[item.id]);
                    return (
                      <Pressable
                        key={`${stage.number}-${index}`}
                        accessibilityRole="button"
                        accessibilityLabel={`ステージ${stage.number}、ケース${index + 1}${complete ? '、解答済み。もう一度解く' : ''}`}
                        hitSlop={14}
                        disabled={locked || !item}
                        onPress={() => item && openCase(stage.number, item.id)}
                        style={({ pressed }) => [styles.dot, complete && styles.dotComplete, pressed && styles.dotPressed]}
                      >
                        <AppText style={[styles.dotText, complete && styles.dotTextComplete]}>{index + 1}</AppText>
                      </Pressable>
                    );
                  })}
                </View>
                <AppText style={[styles.caseHint, locked && styles.caseHintLocked]}>{locked ? '完全版で全ケースを開放' : '番号からケースを選ぶ'}</AppText>
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
  introCompact: { marginBottom: 5 },
  introTitle: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, fontWeight: '700', textAlign: 'center' },
  introBody: { marginTop: 1, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  sectionHeader: { marginHorizontal: spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', borderBottomWidth: 1, borderColor: colors.line, paddingBottom: 7 },
  sectionHeaderCompact: { paddingBottom: 4 },
  sectionLabel: { color: colors.ink, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.8, fontWeight: '700' },
  sectionCount: { color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.8 },
  stageList: { flex: 1, marginHorizontal: spacing.lg, gap: 9, marginTop: 10 },
  stage: { flex: 1, minHeight: 0, padding: 12, backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line },
  stageCompact: { paddingVertical: 8, paddingHorizontal: 10 },
  stageLocked: { backgroundColor: colors.surface, borderColor: colors.line },
  stageMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 11 },
  stageIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  stageIconText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  stageCopy: { flex: 1, minWidth: 0 },
  chevron: { color: colors.ink, fontSize: 24, lineHeight: 27 },
  stageTopline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  stageIdentity: { flexDirection: 'row', alignItems: 'center', gap: 7, minWidth: 0 },
  stageNumber: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.45, fontWeight: '700' },
  stageProgress: { color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.6, fontWeight: '700' },
  stageProgressLocked: { color: colors.gold },
  stageTitle: { marginTop: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  stageIntro: { marginTop: 1, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 17 },
  stageFooter: { marginTop: 'auto', paddingTop: 8, alignItems: 'center' },
  stageFooterCompact: { paddingTop: 4 },
  dots: { width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dot: { width: 17, height: 17, borderRadius: 9, borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  dotComplete: { backgroundColor: colors.gold, borderColor: colors.gold },
  dotText: { color: colors.gold, fontSize: 8, lineHeight: 10, fontWeight: '700' },
  dotTextComplete: { color: '#FFFFFF' },
  dotPressed: { opacity: 0.55, transform: [{ scale: 0.92 }] },
  caseHint: { marginTop: 5, color: colors.muted, fontFamily: fonts.sans, fontSize: 9, letterSpacing: 0.5, textAlign: 'center' },
  caseHintLocked: { color: colors.gold, fontWeight: '700' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.99 }] },
});
