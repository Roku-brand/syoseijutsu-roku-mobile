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
import { LockMark } from '@/components/lock-mark';
import { upgradeRoute } from '@/navigation/app-routes';

const marks = ['対', '仕', '生'];
const landscape = require('../../../assets/home/system-atlas-washi.webp');
const study = require('../../../assets/upgrade/morning-study.webp');
const guide = require('../../../assets/learn/rokumaru-roadmap.webp');

export default function LearnHomeScreen() {
  const router = useRouter();
  const { learningRecords, reviewCaseIds } = useAppState();
  const { isPaid } = useAccess();
  const { desktop } = useResponsiveLayout();
  const [expandedStages, setExpandedStages] = useState<number[]>([]);
  const completed = learningIndex.filter((item) => learningRecords[item.id]).length;
  const canPlay = (id: string) => canPlayLearningCase(isPaid ? 'paid' : 'free', id);
  const openCase = (item: (typeof learningIndex)[number]) => {
    if (!canPlay(item.id)) {
      router.push(upgradeRoute('learning', item.title));
      return;
    }
    router.push({ pathname: '/learn/[caseId]', params: { caseId: item.id, retry: '1' } });
  };
  return <BookScreen testID="learn-scroll" contentContainerStyle={[styles.content, desktop && styles.contentDesktop]}>
    <View testID="learning-hero" style={[styles.hero, desktop && styles.heroDesktop]}>
      <Image source={guide} resizeMode="contain" accessibilityLabel="学びを案内する禄丸" testID="rokumaru-guide" style={[styles.guide, desktop && styles.guideDesktop]} />
      <View style={styles.heroCopy}>
        <AppText accessibilityRole="header" aria-level={1} style={[styles.heroTitle, desktop && styles.heroTitleDesktop]}>処世術を習得しよう！</AppText>
        <AppText testID="learning-hero-lead" style={[styles.heroLead, desktop && styles.heroLeadDesktop]}>1問60秒。{'\n'}その場で活きる判断を、{'\n'}3つのステージで{!desktop ? '\n' : ''}自分の力に。</AppText>
      </View>
      <View style={[styles.bubble, desktop && styles.bubbleDesktop]}><AppText style={styles.bubbleText}>今日はどこから{'\n'}始める？</AppText></View>
    </View>
    <View testID="learning-overall-progress" style={styles.overall}>
      <View style={styles.overallHeading}><AppText style={styles.overallLabel}>学習の記録</AppText><AppText style={styles.overallCount}>{completed}<AppText style={styles.overallTotal}> / {learningIndex.length} 問</AppText></AppText></View>
    </View>
    {reviewCaseIds.length ? <View style={styles.practiceControls} testID="learning-review-list">
      <AppText accessibilityRole="header" aria-level={2} style={styles.practiceLabel}>あとで復習</AppText>
      {learningIndex.filter(item => reviewCaseIds.includes(item.id)).map(item => {
        const locked = !canPlay(item.id);
        return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title + (locked ? 'を復習する（完全版）' : 'を復習する')} onPress={() => openCase(item)} style={styles.reviewEntry}>
          <AppText style={styles.caseTitle}>{item.title}</AppText>
          {locked ? <View style={styles.caseAccess}><LockMark /><AppText style={styles.caseAccessText}>完全版</AppText></View> : <AppText>›</AppText>}
        </Pressable>;
      })}
    </View> : null}
    <View testID="learning-stage-list" style={styles.roadmap}>
      <View pointerEvents="none" style={styles.roadmapLine} />
      {learningStages.map((stage, index) => {
        const cases = learningIndex.filter((item) => item.stage === stage.number);
        const completeCount = cases.filter((item) => learningRecords[item.id]).length;
        const expanded = expandedStages.includes(stage.number);
        const next = cases.find((item) => !learningRecords[item.id]) ?? cases[0];
        const stageLocked = Boolean(next && !canPlay(next.id));
        return <View key={stage.number} style={styles.stageRow}>
          <View style={styles.chapter} accessibilityElementsHidden><View style={styles.chapterRing} /><AppText style={styles.chapterText}>{marks[index]}</AppText></View>
          <View testID={`learning-stage-${stage.number}`} style={[styles.stageCard, desktop && styles.stageCardDesktop]}>
            <Image source={stage.number === 2 ? study : landscape} resizeMode="cover" style={styles.stageArtwork} accessibilityElementsHidden />
            <Pressable testID={`learning-stage-toggle-${stage.number}`} accessibilityRole="button" accessibilityLabel={`ステージ${stage.number}の問題一覧`} accessibilityState={{ expanded }} aria-expanded={expanded} onPress={() => setExpandedStages((current) => expanded ? current.filter((number) => number !== stage.number) : [...current, stage.number])} style={({ pressed }) => pressed && styles.pressed}>
              <View style={styles.stageHeading}>
                <View style={styles.stageHeadingText}>
                  <AppText style={styles.stageNumber}>Stage {stage.number}</AppText>
                  <AppText accessibilityRole="header" aria-level={2} style={[styles.stageTitle, desktop && styles.stageTitleDesktop]}>{stage.title}</AppText>
                  <AppText style={styles.stageIntro}>{stage.intro}</AppText>
                </View>
                <AppText style={styles.stageChevron}>{expanded ? '⌃' : '⌄'}</AppText>
              </View>
              <View style={styles.caseProgress}>
                <View accessibilityRole="progressbar" accessibilityLabel={`ステージ${stage.number}の進捗`} accessibilityValue={{ min: 0, max: cases.length, now: completeCount, text: `${completeCount} / ${cases.length}` }} style={styles.track}><View style={[styles.fill, { width: `${cases.length ? completeCount / cases.length * 100 : 0}%` }]} /></View>
                <AppText style={styles.caseCount}>{completeCount} / {cases.length} 問</AppText>
              </View>
            </Pressable>
            {expanded ? <View style={styles.stageBottom}>
              <View style={styles.caseList}>
                {cases.map((item, caseIndex) => {
                  const locked = !canPlay(item.id);
                  return <Pressable key={item.id} accessibilityRole="button" accessibilityLabel={item.title + (locked ? 'を開く（完全版）' : 'を開く')} onPress={() => openCase(item)} style={({ pressed }) => [styles.caseRow, pressed && styles.pressed]}>
                    <AppText style={styles.caseNumber}>{String(caseIndex + 1).padStart(2, '0')}</AppText>
                    <AppText numberOfLines={2} style={styles.caseTitle}>{item.title}</AppText>
                    {locked ? <View style={styles.caseAccess}><LockMark /><AppText style={styles.caseAccessText}>完全版</AppText></View> : null}
                  </Pressable>;
                })}
              </View>
            </View> : null}
              <Pressable testID={'learning-challenge-' + stage.number} accessibilityRole="button" accessibilityLabel={'ステージ' + stage.number + '、' + stage.title + (stageLocked ? '（完全版）' : '')} onPress={() => next && openCase(next)} style={({ pressed }) => [styles.challenge, pressed && styles.pressed]}>
                {stageLocked ? <LockMark color={colors.goldLight} /> : null}
                <AppText style={styles.challengeText}>{stageLocked ? '完全版　›' : '挑戦する　→'}</AppText>
              </Pressable>
          </View>
        </View>;
      })}
    </View>
  </BookScreen>;
}

const styles = StyleSheet.create({
  practiceControls: { width: '100%', marginTop: 16, marginBottom: 18, padding: 14, borderWidth: 1, borderColor: colors.line, borderRadius: 14, backgroundColor: colors.surface, gap: 8 },
  practiceLabel: { flexShrink: 1, fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, color: colors.ink },
  reviewEntry: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  content: { width: '100%', maxWidth: 1050, alignSelf: 'center', paddingHorizontal: spacing.md, paddingTop: 0, paddingBottom: 32 },
  contentDesktop: { paddingHorizontal: spacing.xl },
  hero: { minHeight: 210, overflow: 'hidden', marginHorizontal: -spacing.md, paddingHorizontal: spacing.lg, paddingTop: 26 },
  heroDesktop: { minHeight: 310, marginHorizontal: 0, paddingTop: 50 },
  heroCopy: { zIndex: 1 },
  heroTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 25, lineHeight: 36, fontWeight: '700', letterSpacing: 0 },
  heroTitleDesktop: { fontSize: 36, lineHeight: 52 },
  heroLead: { marginTop: 14, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 15, lineHeight: 27 },
  heroLeadDesktop: { marginTop: 18, fontSize: 20, lineHeight: 34 },
  guide: { position: 'absolute', width: '48%', height: 166, right: 0, bottom: -4 },
  guideDesktop: { width: 430, height: 290, right: 20 },
  bubble: { position: 'absolute', right: 13, top: 65, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.goldSoft, borderRadius: radius.md, backgroundColor: colors.surface, zIndex: 2 },
  bubbleDesktop: { top: 28, right: 35 },
  bubbleText: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 13, lineHeight: 22 },
  overall: { minHeight: 54, paddingHorizontal: 16, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  overallHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  overallLabel: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 12, fontWeight: '600' },
  overallCount: { color: colors.ink, fontFamily: fonts.serif, fontSize: 21, lineHeight: 30 },
  overallTotal: { fontSize: 14 },
  track: { flex: 1, minWidth: 45, height: 5, overflow: 'hidden', borderRadius: radius.pill, backgroundColor: colors.paperDeep },
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
  stageHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stageHeadingText: { flex: 1, minWidth: 0 },
  stageChevron: { color: colors.goldDeep, fontSize: 22, lineHeight: 28 },
  stageNumber: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19 },
  stageTitle: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28, fontWeight: '700', letterSpacing: -0.3 },
  stageTitleDesktop: { fontSize: 26, lineHeight: 38 },
  stageIntro: { marginTop: 2, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 22 },
  caseProgress: { marginTop: 10, marginBottom: 9, flexDirection: 'row', alignItems: 'center', gap: 8 },
  caseCount: { marginLeft: 3, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  stageBottom: { marginBottom: 10 },
  caseList: { alignSelf: 'stretch', flex: 1, minWidth: 0, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.sm, backgroundColor: 'rgba(241,236,225,0.5)' },
  caseRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingVertical: 7 },
  caseNumber: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 12 },
  caseAccess: { flexShrink: 0, flexDirection: 'row', alignItems: 'center', gap: 3 },
  caseAccessText: { color: colors.goldDeep, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  caseTitle: { flex: 1, minWidth: 0, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 23 },
  challenge: { alignSelf: 'flex-end', width: 112, minHeight: 44, paddingHorizontal: 12, flexDirection: 'row', gap: 4, borderRadius: radius.pill, backgroundColor: colors.goldDeep, alignItems: 'center', justifyContent: 'center' },
  challengeText: { color: colors.white, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  pressed: { opacity: 0.75 },
});
