import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import learningIndex from '@/data/generated/learning.index.json';
import { learningStages } from '@/data/learning';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { canPlayLearningCase } from '@/access/access-config';

const marks = ['対', '仕', '生'];
const landscape = require('../../../assets/home/system-atlas-washi.webp');
const study = require('../../../assets/upgrade/morning-study.webp');
const guide = require('../../../assets/learn/rokumaru-roadmap.webp');

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords } = useAppState();
  const { isPaid } = useAccess();
  const { desktop, narrow } = useResponsiveLayout();
  const [expandedStages, setExpandedStages] = useState<number[]>([]);
  const completed = learningIndex.filter((item) => learningRecords[item.id]).length;
  const openCase = (id: string) => {
    if (!canPlayLearningCase(isPaid ? 'paid' : 'free', id)) {
      router.push({ pathname: '/upgrade', params: { source: 'learning' } });
      return;
    }
    router.push({ pathname: '/learn/[caseId]', params: { caseId: id, retry: '1' } });
  };
  return <BookScreen contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}>
    <View testID="learning-hero" style={[styles.hero, desktop && styles.heroDesktop]}>
      <Image source={guide} resizeMode="contain" accessibilityLabel="学びを案内する禄丸" testID="rokumaru-guide" style={[styles.guide, desktop && styles.guideDesktop]} />
      <View style={styles.heroCopy}>
        <AppText accessibilityRole="header" aria-level={1} style={[styles.heroTitle, desktop && styles.heroTitleDesktop]}>処世術を習得しよう！</AppText>
        <AppText style={styles.heroLead}>3つのステージで、{'\n'}判断を少しずつ自分の力に。</AppText>
      </View>
      <View style={[styles.bubble, desktop && styles.bubbleDesktop]}><AppText style={styles.bubbleText}>今日はどこから{'\n'}始める？</AppText></View>
    </View>
    <View testID="learning-overall-progress" style={styles.overall}>
      <View style={styles.overallHeading}><AppText style={styles.overallLabel}>全体の進捗</AppText><AppText style={styles.overallCount}>{completed}<AppText style={styles.overallTotal}> / {learningIndex.length}</AppText></AppText></View>
      <View accessibilityRole="progressbar" accessibilityLabel="全体の学習進捗" accessibilityValue={{ min: 0, max: learningIndex.length, now: completed }} style={styles.track}><View style={[styles.fill, { width: `${learningIndex.length ? completed / learningIndex.length * 100 : 0}%` }]} /></View>
      <AppText style={styles.overallNote}>一歩ずつ、{'\n'}自分の判断に。</AppText>
    </View>
    <View testID="learning-stage-list" style={styles.roadmap}>
      <View pointerEvents="none" style={styles.roadmapLine} />
      {learningStages.map((stage, index) => {
        const cases = learningIndex.filter((item) => item.stage === stage.number);
        const completeCount = cases.filter((item) => learningRecords[item.id]).length;
        const expanded = expandedStages.includes(stage.number);
        const visibleCases = expanded ? cases : cases.slice(0, 3);
        const next = cases.find((item) => !learningRecords[item.id]) ?? cases[0];
        return <View key={stage.number} style={styles.stageRow}>
          <View style={styles.chapter} accessibilityElementsHidden><View style={styles.chapterRing} /><AppText style={styles.chapterText}>{marks[index]}</AppText></View>
          <View testID={`learning-stage-${stage.number}`} style={[styles.stageCard, desktop && styles.stageCardDesktop]}>
            <Image source={stage.number === 2 ? study : landscape} resizeMode="cover" style={styles.stageArtwork} accessibilityElementsHidden />
            <AppText style={styles.stageNumber}>Stage {stage.number}</AppText>
            <AppText accessibilityRole="header" aria-level={2} style={[styles.stageTitle, desktop && styles.stageTitleDesktop]}>{stage.title}</AppText>
            <AppText style={styles.stageIntro}>{stage.intro}</AppText>
            <View accessibilityRole="progressbar" accessibilityLabel={`ステージ${stage.number}の進捗`} accessibilityValue={{ min: 0, max: cases.length, now: completeCount, text: `${completeCount} / ${cases.length}` }} style={styles.caseProgress}>
              {cases.map((item) => <View key={item.id} testID={`learning-dot-${item.id}`} style={[styles.caseDot, learningRecords[item.id] && styles.caseDotComplete]} />)}
              <AppText style={styles.caseCount}>{completeCount} / {cases.length}</AppText>
            </View>
            <View style={[styles.stageBottom, !narrow && styles.stageBottomDesktop]}>
              <View style={styles.caseList}>
                {visibleCases.map((item, caseIndex) => <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={`${item.title}を開く`} onPress={() => openCase(item.id)} style={({ pressed }) => [styles.caseRow, pressed && styles.pressed]}><AppText style={styles.caseNumber}>{String(caseIndex + 1).padStart(2, '0')}</AppText><AppText numberOfLines={1} style={styles.caseTitle}>{item.title}</AppText></Pressable>)}
                {cases.length > 3 ? <Pressable accessibilityRole="button" accessibilityLabel={`ステージ${stage.number}の${expanded ? 'ケースを閉じる' : '残りのケースを見る'}`} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpandedStages((current) => expanded ? current.filter((number) => number !== stage.number) : [...current, stage.number])} style={styles.more}><AppText style={styles.moreText}>{expanded ? '閉じる' : `＋${cases.length - 3}件を見る`}　›</AppText></Pressable> : null}
              </View>
              <Pressable testID={`learning-challenge-${stage.number}`} accessibilityRole="button" accessibilityLabel={`ステージ${stage.number}、${stage.title}`} onPress={() => next && openCase(next.id)} style={({ pressed }) => [styles.challenge, pressed && styles.pressed]}><AppText style={styles.challengeText}>挑戦する　→</AppText></Pressable>
            </View>
          </View>
        </View>;
      })}
    </View>
  </BookScreen>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1050, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: 0, paddingBottom: 32 },
  contentDesktop: { paddingHorizontal: spacing.xl },
  hero: { minHeight: 210, overflow: 'hidden', marginHorizontal: -spacing.md, paddingHorizontal: spacing.lg, paddingTop: 26 },
  heroDesktop: { minHeight: 310, marginHorizontal: 0, paddingTop: 50 },
  heroCopy: { zIndex: 1 },
  heroTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, fontWeight: '700', letterSpacing: 0 },
  heroTitleDesktop: { fontSize: 36, lineHeight: 52 },
  heroLead: { marginTop: 9, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 24 },
  guide: { position: 'absolute', width: 260, height: 194, right: -12, bottom: -4 },
  guideDesktop: { width: 430, height: 290, right: 20 },
  bubble: { position: 'absolute', right: 13, top: 65, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.goldSoft, borderRadius: radius.md, backgroundColor: colors.surface, zIndex: 2 },
  bubbleDesktop: { top: 28, right: 35 },
  bubbleText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18 },
  overall: { minHeight: 64, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  overallHeading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  overallLabel: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  overallCount: { color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 34 },
  overallTotal: { fontSize: 15 },
  overallNote: { color: colors.muted, fontFamily: fonts.serif, fontSize: 10, lineHeight: 16 },
  track: { flex: 1, minWidth: 45, height: 7, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.paperDeep },
  fill: { height: '100%', backgroundColor: colors.gold, borderRadius: radius.pill },
  roadmap: { position: 'relative', marginTop: 16, gap: 14 },
  roadmapLine: { position: 'absolute', top: 0, bottom: 0, left: 24, width: 1, backgroundColor: colors.gold },
  stageRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  chapter: { width: 49, height: 49, marginTop: 22, borderRadius: 25, backgroundColor: colors.surfaceDark, borderWidth: 2, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  chapterRing: { position: 'absolute', width: 41, height: 41, borderRadius: 21, borderWidth: 1, borderColor: colors.goldDeep },
  chapterText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 26, lineHeight: 34 },
  stageCard: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 13, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  stageCardDesktop: { paddingHorizontal: 24, paddingVertical: 22 },
  stageArtwork: { position: 'absolute', top: 0, bottom: 0, right: 0, width: '48%', height: '100%', opacity: 0.1 },
  stageNumber: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19 },
  stageTitle: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  stageTitleDesktop: { fontSize: 26, lineHeight: 38 },
  stageIntro: { marginTop: 2, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18 },
  caseProgress: { marginTop: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  caseDot: { width: 9, height: 9, borderRadius: 5, borderWidth: 1, borderColor: '#C9BEAA', backgroundColor: colors.surface },
  caseDotComplete: { backgroundColor: colors.gold, borderColor: colors.gold },
  caseCount: { marginLeft: 3, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  stageBottom: { gap: 10, alignItems: 'flex-end' },
  stageBottomDesktop: { flexDirection: 'row', alignItems: 'flex-end', gap: 24 },
  caseList: { alignSelf: 'stretch', flex: 1, minWidth: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: 'rgba(241,236,225,0.5)' },
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  caseNumber: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11 },
  caseTitle: { flex: 1, minWidth: 0, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 },
  more: { minHeight: 30, justifyContent: 'center' },
  moreText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18 },
  challenge: { width: 112, minHeight: 44, paddingHorizontal: 12, borderRadius: radius.pill, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  challengeText: { color: colors.white, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
