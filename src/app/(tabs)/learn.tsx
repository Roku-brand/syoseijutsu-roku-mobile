import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { AccessBadge } from '@/components/access-badge';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { Rokumaru } from '@/components/rokumaru';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { learningCases, learningStages } from '@/data/learning';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { FREE_LEARNING_CASE_IDS } from '@/access/access-config';

const STAGE_MARKS = ['対', '仕', '生'] as const;

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords } = useAppState();
  const { isPaid } = useAccess();
  const { desktop } = useResponsiveLayout();

  const openCase = (stage: number) => {
    if (!isPaid && stage > 1) {
      router.push({ pathname: '/upgrade', params: { source: 'learning' } });
      return;
    }
    const cases = learningCases.filter((item) => item.stage === stage);
    const next = cases.find((item) => !learningRecords[item.id]) ?? cases[0];
    if (next) router.push({ pathname: '/learn/[caseId]', params: { caseId: next.id, retry: '1' } });
  };

  return (
    <BookScreen contentContainerStyle={[styles.content, !desktop && styles.contentMobile]}>
      <View style={styles.intro}>
        <AppText accessibilityRole="header" aria-level={1} style={[styles.introTitle, !desktop && styles.introTitleMobile]}>処世術を習得しよう！</AppText>
        <AppText style={styles.introBody}>3つのステージで、判断を少しずつ自分の力に。</AppText>
      </View>

      <View style={styles.stageList} testID="learning-stage-list">
        {learningStages.map((stage, stageIndex) => {
          const cases = learningCases.filter((item) => item.stage === stage.number);
          const locked = !isPaid && stage.number > 1;
          const caseCount = cases.length || FREE_LEARNING_CASE_IDS.length;
          const completeCount = locked ? 0 : cases.filter((item) => learningRecords[item.id]).length;
          const progress = caseCount ? completeCount / caseCount : 0;
          const cta = completeCount > 0 ? 'つづきを見る' : '挑戦する';

          return (
            <Pressable
              key={stage.number}
              accessibilityRole="button"
              accessibilityLabel={`ステージ${stage.number}、${stage.title}${locked ? '、完全版限定' : ''}`}
              accessibilityHint={locked ? '完全版の案内を開きます' : `${cta}ケースを開きます`}
              onPress={() => openCase(stage.number)}
              testID={`learning-stage-${stage.number}`}
              style={({ pressed }) => [
                styles.stageCard,
                !desktop && styles.stageCardMobile,
                locked && styles.stageCardLocked,
                pressed && styles.pressed,
              ]}
            >
              <View style={[styles.stageIcon, !desktop && styles.stageIconMobile]} accessibilityElementsHidden>
                <View style={styles.stageIconRing} />
                <AppText style={[styles.stageIconText, !desktop && styles.stageIconTextMobile]}>{STAGE_MARKS[stageIndex]}</AppText>
              </View>

              <View style={styles.stageCopy}>
                <View style={styles.stageIdentity}>
                  <AppText style={styles.stageNumber}>Stage {stage.number}</AppText>
                  {locked ? <AccessBadge locked compact /> : null}
                </View>
                <AppText accessibilityRole="header" aria-level={2} style={[styles.stageTitle, !desktop && styles.stageTitleMobile]}>{stage.title}</AppText>
                <AppText style={styles.stageIntro}>{stage.intro}</AppText>
              </View>

              <View style={[styles.stageProgressColumn, !desktop && styles.stageProgressColumnMobile]}>
                <View style={styles.stageProgressRow}>
                  <View
                    accessibilityRole="progressbar"
                    accessibilityLabel={`ステージ${stage.number}の進捗`}
                    accessibilityValue={{ min: 0, max: caseCount, now: completeCount, text: `${completeCount} / ${caseCount}` }}
                    style={styles.progressTrack}
                  >
                    <View style={[styles.progressFill, { width: `${Math.max(locked ? 0 : progress * 100, 0)}%` }]} />
                  </View>
                  <AppText style={styles.progressCount}>{completeCount} / {caseCount}</AppText>
                  <AppText style={styles.stageChevron}>›</AppText>
                </View>
                <AppText style={[styles.stageCta, locked && styles.stageCtaLocked]}>{locked ? '完全版で挑戦する' : cta}　→</AppText>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={[styles.mascotPanel, !desktop && styles.mascotPanelMobile]}>
        <View style={[styles.mascotCopy, !desktop && styles.mascotCopyMobile]}>
          <AppText style={[styles.mascotTitle, !desktop && styles.mascotTitleMobile]}>焦らず、一歩ずつ。</AppText>
          <AppText style={styles.mascotBody}>今日の一歩が、判断を磨く。</AppText>
          <AppText style={styles.mascotBody}>禄丸も、いつもそばで見守っているよ。</AppText>
        </View>
        <View style={[styles.mascotHalo, !desktop && styles.mascotHaloMobile]} accessibilityElementsHidden />
        <Rokumaru mood="guide" style={[styles.mascot, !desktop && styles.mascotMobile]} />
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1050, alignSelf: 'center', paddingTop: 36, paddingBottom: 48 },
  contentMobile: { paddingTop: 24, paddingHorizontal: 14, paddingBottom: 96 },
  intro: { alignItems: 'center', marginBottom: 26 },
  introTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 36, lineHeight: 50, fontWeight: '700', letterSpacing: 3.5, textAlign: 'center', zIndex: 1 },
  introTitleMobile: { fontSize: 27, lineHeight: 39, letterSpacing: 2 },
  introBody: { marginTop: 8, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 15, lineHeight: 24, letterSpacing: 1.4, textAlign: 'center' },
  stageList: { gap: 14 },
  stageCard: { minHeight: 142, paddingHorizontal: 28, paddingVertical: 20, flexDirection: 'row', alignItems: 'center', gap: 26, borderWidth: 1, borderColor: '#DDCBA9', borderRadius: radius.md, backgroundColor: colors.surface, ...bookCardShadow },
  stageCardMobile: { minHeight: 0, paddingHorizontal: 16, paddingVertical: 17, flexWrap: 'wrap', columnGap: 14, rowGap: 13 },
  stageCardLocked: { backgroundColor: '#FAF7F0' },
  stageIcon: { position: 'relative', width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: '#191918', borderWidth: 2, borderColor: colors.gold },
  stageIconMobile: { width: 62, height: 62, borderRadius: 31 },
  stageIconRing: { position: 'absolute', width: '88%', height: '88%', borderRadius: 999, borderWidth: 1, borderColor: '#6F5726' },
  stageIconText: { color: '#E2BD67', fontFamily: fonts.serif, fontSize: 34, lineHeight: 42, fontWeight: '700' },
  stageIconTextMobile: { fontSize: 24, lineHeight: 31 },
  stageCopy: { flex: 1, minWidth: 220 },
  stageIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageNumber: { color: colors.gold, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, letterSpacing: 1.1, fontWeight: '700' },
  stageTitle: { marginTop: 5, color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 35, fontWeight: '700', letterSpacing: 1.6 },
  stageTitleMobile: { fontSize: 20, lineHeight: 29, letterSpacing: 0.9 },
  stageIntro: { marginTop: 3, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, letterSpacing: 0.5 },
  stageProgressColumn: { width: 350, alignItems: 'flex-end', gap: 16 },
  stageProgressColumnMobile: { width: '100%', alignItems: 'stretch', gap: 10 },
  stageProgressRow: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 14 },
  progressTrack: { flex: 1, height: 13, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: '#292927', borderWidth: 1, borderColor: '#C9B991' },
  progressFill: { height: '100%', borderRadius: radius.pill, backgroundColor: '#D6A333' },
  progressCount: { minWidth: 43, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  stageChevron: { color: colors.gold, fontFamily: fonts.serif, fontSize: 38, lineHeight: 39 },
  stageCta: { color: '#9D6E18', fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '700', letterSpacing: 0.8 },
  stageCtaLocked: { color: colors.gold },
  mascotPanel: { position: 'relative', minHeight: 210, marginTop: 24, paddingHorizontal: 50, paddingVertical: 32, justifyContent: 'center', overflow: 'visible', borderWidth: 1, borderColor: '#DDCBA9', borderRadius: radius.md, backgroundColor: '#FBF7EE' },
  mascotPanelMobile: { minHeight: 380, paddingHorizontal: 24, paddingTop: 30, paddingBottom: 0, justifyContent: 'flex-start' },
  mascotCopy: { width: '55%', zIndex: 2 },
  mascotCopyMobile: { width: '100%', alignItems: 'center' },
  mascotTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 42, fontWeight: '700', letterSpacing: 2.5 },
  mascotTitleMobile: { fontSize: 24, lineHeight: 34 },
  mascotBody: { marginTop: 8, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 23, letterSpacing: 0.8, textAlign: 'left' },
  mascotHalo: { position: 'absolute', right: 88, bottom: -40, width: 235, height: 235, borderRadius: 118, backgroundColor: '#F5DF9D', opacity: 0.68 },
  mascotHaloMobile: { right: '50%', marginRight: -105, bottom: -25, width: 210, height: 210, borderRadius: 105 },
  mascot: { position: 'absolute', right: 54, bottom: 0, width: 260, height: 260, zIndex: 3 },
  mascotMobile: { right: '50%', marginRight: -130, bottom: 0, width: 260, height: 260 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.995 }] },
});
