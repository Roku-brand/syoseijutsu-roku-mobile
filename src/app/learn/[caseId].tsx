import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { Rokumaru } from '@/components/rokumaru';
import { AppText } from '@/components/ui';
import { colors, fonts, layout, radius } from '@/constants/theme';
import { getChoiceReview, learningCases, learningStages, type LearningCase } from '@/data/learning';
import {
  getTechniqueDisplayId,
  getTheoryDisplayId,
  techniqueById,
  theoryById,
} from '@/data/catalog';
import { getTheoryCategoryLabel, isLockedTheoryShell } from '@/data/theory-display';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import {
  COMPLETE_LEARNING_CASE_COUNT,
  FREE_TECHNIQUE_IDS,
  FREE_THEORY_ID_SET,
} from '@/access/access-config';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export function generateStaticParams() {
  return learningCases.map(({ id: caseId }) => ({ caseId }));
}

export default function LearningCaseScreen() {
  const { caseId, retry } = useLocalSearchParams<{ caseId: string; retry?: string }>();
  const router = useRouter();
  const { desktop } = useResponsiveLayout();
  const { isPaid } = useAccess();
  const [activeCaseId, setActiveCaseId] = useState<string | null>(null);
  const [caseList] = useState<LearningCase[]>(() => [...learningCases]);
  const { learningRecords, answerLearningCase, resetLearningCase } = useAppState();
  const [retryPending, setRetryPending] = useState(false);
  const [focusedChoice, setFocusedChoice] = useState<string | null>(null);
  const [hoveredChoice, setHoveredChoice] = useState<string | null>(null);

  useEffect(() => {
    setActiveCaseId(caseId ?? null);
    setRetryPending(retry === '1');
  }, [caseId, retry]);

  const item = activeCaseId ? caseList.find((candidate) => candidate.id === activeCaseId) : undefined;

  if (!activeCaseId) return null;

  if (!item) {
    return (
      <BookScreen contentContainerStyle={styles.notFound}>
        <AppText style={styles.notFoundTitle}>このケースは現在利用できません。</AppText>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/learn')} style={styles.notFoundButton}>
          <AppText style={styles.notFoundButtonText}>ステージへ戻る</AppText>
        </Pressable>
      </BookScreen>
    );
  }

  const record = retryPending ? undefined : learningRecords[item.id];
  const selected = record?.choiceId;
  const selectedChoice = item.choices.find((choice) => choice.id === selected);
  const selectedReview = selectedChoice ? getChoiceReview(item, selectedChoice) : null;
  const isBestMove = selected === item.goodChoiceId;
  const next = caseList.find((candidate) => candidate.stage === item.stage && candidate.number === item.number + 1)
    ?? caseList.find((candidate) => candidate.stage === item.stage + 1);
  const stage = learningStages.find((candidate) => candidate.number === item.stage);
  const stageCases = caseList.filter((candidate) => candidate.stage === item.stage);

  const relatedCards = item.relatedCardIds.map((id) => techniqueById.get(id)).filter(Boolean);
  const relatedTechnique = relatedCards[0];
  const relatedTheoryIds = relatedCards.flatMap((card) => card?.theoryTagIds ?? []);
  const relatedTheory = relatedTheoryIds
    .map((id) => theoryById.get(id))
    .find((candidate) => candidate
      && candidate.summary
      && !isLockedTheoryShell(candidate)
      && (isPaid || FREE_THEORY_ID_SET.has(candidate.tagId)));

  const openNext = () => {
    if (next) router.replace(`/learn/${next.id}`);
    else router.replace('/learn');
  };

  const retryCase = () => {
    resetLearningCase(item.id);
    setRetryPending(true);
  };

  return (
    <BookScreen contentContainerStyle={[styles.content, !desktop && styles.contentMobile]}>
      <CaseProgress
        item={item}
        stageTitle={stage?.title ?? ''}
        stageCases={stageCases}
        learningRecords={learningRecords}
        answeredCurrent={Boolean(record)}
        desktop={desktop}
      />

      {!record ? (
        <View style={[styles.questionCard, !desktop && styles.questionCardMobile]} testID="learning-question-card">
          <View style={[styles.sceneColumn, !desktop && styles.sceneColumnMobile]}>
            <AppText style={styles.eyebrow}>{item.eyebrow}</AppText>
            <AppText style={[styles.title, !desktop && styles.titleMobile]}>{item.title}</AppText>
            <AppText style={styles.situation}>{item.situation}</AppText>
          </View>

          <View style={[styles.answerColumn, desktop && styles.answerColumnDesktop]}>
            <AppText style={styles.question}>{item.question}</AppText>
            {item.choices.map((choice) => {
              const active = focusedChoice === choice.id || hoveredChoice === choice.id;
              return (
                <Pressable
                  key={choice.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${choice.id.toUpperCase()} ${choice.label}`}
                  onFocus={() => setFocusedChoice(choice.id)}
                  onBlur={() => setFocusedChoice(null)}
                  onHoverIn={() => setHoveredChoice(choice.id)}
                  onHoverOut={() => setHoveredChoice(null)}
                  onPress={() => {
                    answerLearningCase(item.id, choice.id);
                    setRetryPending(false);
                  }}
                  style={({ pressed }) => [styles.choice, active && styles.choiceActive, pressed && styles.choicePressed]}
                >
                  <View style={[styles.choiceBadge, active && styles.choiceBadgeActive]}>
                    <AppText style={[styles.choiceLetter, active && styles.choiceLetterActive]}>{choice.id.toUpperCase()}</AppText>
                  </View>
                  <AppText style={styles.choiceText}>{choice.label}</AppText>
                </Pressable>
              );
            })}
            <AppText style={styles.answerHint}>選ぶと、禄丸と一緒に理由を振り返ります。</AppText>
          </View>

          <View style={[styles.questionMascotHalo, !desktop && styles.questionMascotHaloMobile]} accessibilityElementsHidden />
          <Rokumaru mood="guide" style={[styles.questionMascot, !desktop && styles.questionMascotMobile]} />
        </View>
      ) : (
        <View style={[styles.resultCard, !desktop && styles.resultCardMobile]} testID="learning-result-card">
          <View style={[
            styles.resultBand,
            !desktop && styles.resultBandMobile,
            isBestMove ? styles.resultBandGood : styles.resultBandImprove,
          ]}>
            <View style={[styles.resultMark, isBestMove ? styles.resultMarkGood : styles.resultMarkImprove]}>
              <AppText style={[styles.resultMarkText, isBestMove ? styles.resultMarkTextGood : styles.resultMarkTextImprove]}>{isBestMove ? '○' : '×'}</AppText>
            </View>
            <View style={[styles.resultHeading, !desktop && styles.resultHeadingMobile]}>
              <AppText style={styles.resultStatusLabel}>この場面での評価</AppText>
              <AppText style={[styles.resultStatusTitle, isBestMove ? styles.goodInk : styles.improveInk]}>
                {isBestMove ? 'いい選択です。' : 'この選択だと、次の問題が起きる。'}
              </AppText>
            </View>
            <AppText style={[styles.resultSummary, !desktop && styles.resultSummaryMobile]}>{selectedReview?.text}</AppText>
            <View style={[styles.bandMascotGroup, !desktop && styles.bandMascotGroupMobile]}>
              <View style={[styles.speechBubble, isBestMove ? styles.speechBubbleGood : styles.speechBubbleImprove]}>
                <AppText style={styles.speechText}>{isBestMove ? '良い判断だね！' : 'おしい…\n次はきっとよくなるよ。'}</AppText>
              </View>
              <Rokumaru mood={isBestMove ? 'happy' : 'encourage'} style={[styles.bandMascot, !desktop && styles.bandMascotMobile]} />
            </View>
          </View>

          {!isBestMove ? (
            <View style={[styles.selectionReview, !desktop && styles.selectionReviewMobile]}>
              <View style={styles.selectionBlock}>
                <AppText style={styles.sectionEyebrow}>あなたの選択</AppText>
                <View style={styles.selectedChoice}>
                  <View style={styles.selectedBadge}><AppText style={styles.selectedLetter}>{selected?.toUpperCase()}</AppText></View>
                  <AppText style={styles.selectedText}>{selectedChoice?.label}</AppText>
                </View>
              </View>
              <View style={styles.problemBlock}>
                <AppText style={[styles.sectionEyebrow, styles.problemLabel]}>この選択による問題</AppText>
                <AppText style={styles.problemText}>{selectedReview?.text}</AppText>
              </View>
            </View>
          ) : null}

          <View style={styles.explanationSection}>
            <AppText style={styles.sectionEyebrow}>{isBestMove ? 'この手が活きる理由' : 'より良い関わり方'}</AppText>
            <AppText style={[styles.goodMove, !desktop && styles.goodMoveMobile]}>{item.goodMove}</AppText>
            <AppText style={styles.explanation}>{item.why}</AppText>
            <View style={styles.caution}>
              <AppText style={styles.cautionLabel}>注意点</AppText>
              <AppText style={styles.cautionText}>{item.caution}</AppText>
            </View>
          </View>

          <View style={[styles.relatedGrid, !desktop && styles.relatedGridMobile]}>
            {relatedTechnique ? (
              <RelatedCard
                mark="術"
                label="関連する処世術"
                title={relatedTechnique.title}
                summary={relatedTechnique.essence ?? ''}
                displayId={getTechniqueDisplayId(relatedTechnique)}
                locked={!isPaid && !FREE_TECHNIQUE_IDS.has(relatedTechnique.id)}
                onPress={() => router.push(`/card/${relatedTechnique.id}`)}
              />
            ) : null}
            {relatedTheory ? (
              <RelatedCard
                mark="理"
                label="関連する理論"
                title={relatedTheory.title}
                summary={`${getTheoryCategoryLabel(relatedTheory)}｜${relatedTheory.summary}`}
                displayId={getTheoryDisplayId(relatedTheory)}
                onPress={() => router.push(`/theory/${relatedTheory.tagId}`)}
              />
            ) : (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="完全版で関連理論を開く"
                onPress={() => router.push({ pathname: '/upgrade', params: { source: 'learning-theory' } })}
                style={({ pressed }) => [styles.relatedCard, pressed && styles.pressed]}
              >
                <AppText style={styles.relatedLabel}>関連する理論</AppText>
                <View style={styles.relatedBody}>
                  <View style={styles.relatedMark}><AppText style={styles.relatedMarkText}>理</AppText></View>
                  <View style={styles.relatedCopy}>
                    <AppText style={styles.relatedTitle}>完全版の関連理論</AppText>
                    <AppText style={styles.relatedSummary}>このケースを支える理論を読む。</AppText>
                    <AppText style={styles.relatedId}>完全版</AppText>
                  </View>
                  <AppText style={styles.relatedArrow}>›</AppText>
                </View>
              </Pressable>
            )}
          </View>

          <View style={[styles.resultActions, !desktop && styles.resultActionsMobile]}>
            <Pressable accessibilityRole="button" onPress={() => router.replace('/learn')} style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}>
              <AppText style={styles.closeButtonText}>解説を閉じる　⌃</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={retryCase} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
              <AppText style={styles.retryText}>もう一度考える</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openNext} style={({ pressed }) => [styles.nextButton, pressed && styles.pressed]}>
              <AppText style={styles.nextButtonText}>{next ? '次のケースへ' : 'ステージ選択へ'}　→</AppText>
            </Pressable>
          </View>
        </View>
      )}
    </BookScreen>
  );
}

function CaseProgress({
  item,
  stageTitle,
  stageCases,
  learningRecords,
  answeredCurrent,
  desktop,
}: {
  item: LearningCase;
  stageTitle: string;
  stageCases: LearningCase[];
  learningRecords: Record<string, unknown>;
  answeredCurrent: boolean;
  desktop: boolean;
}) {
  return (
    <View style={[styles.progressHeader, !desktop && styles.progressHeaderMobile]} testID="learning-case-progress">
      <AppText style={styles.casePosition}>CASE {String(item.number).padStart(2, '0')} / {COMPLETE_LEARNING_CASE_COUNT}</AppText>
      <View style={styles.caseLine} accessibilityLabel={`ステージ${item.stage}の7ケース進捗`}>
        <View style={styles.caseLineRule} />
        {stageCases.map((candidate) => {
          const current = candidate.id === item.id;
          const complete = Boolean(learningRecords[candidate.id]) || (current && answeredCurrent);
          return (
            <View
              key={candidate.id}
              accessibilityLabel={`ケース${candidate.number}${current ? '、現在地' : complete ? '、完了' : '、未完了'}`}
              style={[styles.caseDot, complete && styles.caseDotComplete, current && styles.caseDotCurrent]}
            >
              {complete ? <AppText style={styles.caseDotCheck}>✓</AppText> : null}
            </View>
          );
        })}
      </View>
      <AppText style={styles.stagePosition}>STAGE {String(item.stage).padStart(2, '0')}｜{stageTitle}</AppText>
    </View>
  );
}

function RelatedCard({
  mark,
  label,
  title,
  summary,
  displayId,
  locked = false,
  onPress,
}: {
  mark: '術' | '理';
  label: string;
  title: string;
  summary: string;
  displayId: string;
  locked?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={`${label}、${title}を開く${locked ? '、完全版' : ''}`}
      onPress={onPress}
      style={({ pressed }) => [styles.relatedCard, pressed && styles.pressed]}
    >
      <AppText style={styles.relatedLabel}>{label}</AppText>
      <View style={styles.relatedBody}>
        <View style={styles.relatedMark}><AppText style={styles.relatedMarkText}>{mark}</AppText></View>
        <View style={styles.relatedCopy}>
          <View style={styles.relatedTitleRow}>
            <AppText numberOfLines={2} style={styles.relatedTitle}>{title}</AppText>
            {locked ? <AppText style={styles.lockedTag}>完全版</AppText> : null}
          </View>
          <AppText numberOfLines={2} style={styles.relatedSummary}>{summary}</AppText>
          <AppText style={styles.relatedId}>{displayId}</AppText>
        </View>
        <AppText style={styles.relatedArrow}>›</AppText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingTop: 18, paddingBottom: 52 },
  contentMobile: { paddingHorizontal: 12, paddingTop: 14, paddingBottom: layout.bottomContentInset },
  notFound: { width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center', paddingTop: 80 },
  notFoundTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 },
  notFoundButton: { marginTop: 22, paddingHorizontal: 24, paddingVertical: 13, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  notFoundButtonText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13 },
  progressHeader: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 14 },
  progressHeaderMobile: { flexWrap: 'wrap', gap: 9, marginBottom: 14 },
  casePosition: { color: '#A97416', fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, letterSpacing: 1.4, fontWeight: '800' },
  caseLine: { position: 'relative', flex: 1, minWidth: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 1 },
  caseLineRule: { position: 'absolute', left: 5, right: 5, height: 1, backgroundColor: '#D7BE8A' },
  caseDot: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#C99A3A', backgroundColor: colors.surface },
  caseDotComplete: { backgroundColor: '#C4912A' },
  caseDotCurrent: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.ink },
  caseDotCheck: { color: colors.surface, fontFamily: fonts.sans, fontSize: 8, lineHeight: 9, fontWeight: '900' },
  stagePosition: { color: '#855F22', fontFamily: fonts.sans, fontSize: 11, lineHeight: 18, letterSpacing: 0.65, fontWeight: '700' },
  questionCard: { position: 'relative', minHeight: 475, flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#DDCBA9', borderRadius: radius.md, backgroundColor: colors.surface, ...bookCardShadow },
  questionCardMobile: { minHeight: 0, flexDirection: 'column', overflow: 'hidden' },
  sceneColumn: { width: '42%', paddingHorizontal: 34, paddingVertical: 46, borderRightWidth: 1, borderRightColor: '#E9DDC9' },
  sceneColumnMobile: { width: '100%', paddingHorizontal: 20, paddingTop: 24, paddingBottom: 24, borderRightWidth: 0, borderBottomWidth: 1, borderBottomColor: '#E9DDC9' },
  eyebrow: { color: colors.gold, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, letterSpacing: 0.9, fontWeight: '800' },
  title: { marginTop: 17, color: colors.ink, fontFamily: fonts.serif, fontSize: 30, lineHeight: 43, fontWeight: '700', letterSpacing: 1.4 },
  titleMobile: { marginTop: 10, fontSize: 24, lineHeight: 35, letterSpacing: 0.8 },
  situation: { marginTop: 20, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 27, letterSpacing: 0.45 },
  answerColumn: { flex: 1, paddingHorizontal: 34, paddingVertical: 40 },
  answerColumnDesktop: { paddingRight: 174 },
  question: { marginBottom: 13, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 27, fontWeight: '700', letterSpacing: 0.8 },
  choice: { minHeight: 64, marginTop: 10, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 13, borderWidth: 1, borderColor: '#DED3C1', borderRadius: 14, backgroundColor: '#FFFEFA' },
  choiceActive: { borderWidth: 2, borderColor: colors.gold, backgroundColor: '#FFF9EA' },
  choicePressed: { opacity: 0.74, transform: [{ scale: 0.992 }] },
  choiceBadge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#C99A3A', backgroundColor: colors.surface },
  choiceBadgeActive: { backgroundColor: colors.gold },
  choiceLetter: { color: colors.gold, fontFamily: fonts.serif, fontSize: 18, lineHeight: 23, fontWeight: '700' },
  choiceLetterActive: { color: colors.surface },
  choiceText: { flex: 1, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  answerHint: { marginTop: 14, color: colors.muted, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  questionMascotHalo: { position: 'absolute', right: -24, bottom: -46, width: 190, height: 190, borderRadius: 95, backgroundColor: '#F5E6B9', opacity: 0.7 },
  questionMascotHaloMobile: { right: -35, bottom: -34, width: 150, height: 150, borderRadius: 75 },
  questionMascot: { position: 'absolute', right: -1, bottom: -40, width: 170, height: 190 },
  questionMascotMobile: { right: -18, bottom: -34, width: 130, height: 145, opacity: 0.78 },
  resultCard: { padding: 20, borderWidth: 1, borderColor: '#DDCBA9', borderRadius: radius.md, backgroundColor: colors.surface, ...bookCardShadow },
  resultCardMobile: { padding: 12 },
  resultBand: { position: 'relative', minHeight: 126, paddingHorizontal: 18, paddingVertical: 17, paddingRight: 205, flexDirection: 'row', alignItems: 'center', gap: 17, overflow: 'hidden', borderRadius: 14 },
  resultBandMobile: { minHeight: 305, paddingHorizontal: 16, paddingTop: 18, paddingBottom: 145, paddingRight: 16, flexWrap: 'wrap', alignItems: 'flex-start' },
  resultBandGood: { backgroundColor: '#EDF2E7' },
  resultBandImprove: { backgroundColor: '#FAECE6' },
  resultMark: { width: 58, height: 58, borderRadius: 29, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  resultMarkGood: { borderColor: '#8CA080', backgroundColor: '#F8FBF4' },
  resultMarkImprove: { borderColor: '#D98265', backgroundColor: '#FFF8F5' },
  resultMarkText: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 40, fontWeight: '700' },
  resultMarkTextGood: { color: '#547153' },
  resultMarkTextImprove: { color: '#C55F43' },
  resultHeading: { width: 190 },
  resultHeadingMobile: { width: 205 },
  resultStatusLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 15, letterSpacing: 0.7, fontWeight: '800' },
  resultStatusTitle: { marginTop: 5, fontFamily: fonts.serif, fontSize: 19, lineHeight: 28, fontWeight: '700' },
  goodInk: { color: '#4F684E' },
  improveInk: { color: '#9A4F39' },
  resultSummary: { flex: 1, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 24, letterSpacing: 0.35 },
  resultSummaryMobile: { width: '100%', flexBasis: '100%', flexGrow: 0, marginTop: 2 },
  bandMascotGroup: { position: 'absolute', right: 4, bottom: -37, width: 198, height: 170, alignItems: 'center' },
  bandMascotGroupMobile: { right: 5, bottom: -35, width: 190, height: 175 },
  bandMascot: { position: 'absolute', right: 8, bottom: 0, width: 150, height: 155 },
  bandMascotMobile: { width: 145, height: 150 },
  speechBubble: { position: 'absolute', right: 93, top: 6, zIndex: 2, width: 98, minHeight: 58, paddingHorizontal: 9, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', borderRadius: 40, borderWidth: 1, backgroundColor: colors.surface },
  speechBubbleGood: { borderColor: '#A4B49A' },
  speechBubbleImprove: { borderColor: '#D89D89' },
  speechText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 10, lineHeight: 17, fontWeight: '700', textAlign: 'center' },
  selectionReview: { marginTop: 24, flexDirection: 'row', gap: 18 },
  selectionReviewMobile: { flexDirection: 'column' },
  selectionBlock: { flex: 1 },
  problemBlock: { flex: 1, padding: 16, borderWidth: 1, borderColor: '#E3B5A4', borderRadius: 13, backgroundColor: '#FFF7F3' },
  sectionEyebrow: { color: '#A87418', fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, letterSpacing: 1, fontWeight: '800' },
  problemLabel: { color: '#BE5A3D' },
  selectedChoice: { minHeight: 88, marginTop: 9, padding: 15, flexDirection: 'row', alignItems: 'center', gap: 15, borderWidth: 1, borderColor: '#DFD0B6', borderRadius: 13, backgroundColor: '#FFFEFA' },
  selectedBadge: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold },
  selectedLetter: { color: colors.gold, fontFamily: fonts.serif, fontSize: 25, lineHeight: 31, fontWeight: '700' },
  selectedText: { flex: 1, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 23, fontWeight: '700' },
  problemText: { marginTop: 8, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 23 },
  explanationSection: { marginTop: 27 },
  goodMove: { marginTop: 9, color: colors.ink, fontFamily: fonts.serif, fontSize: 27, lineHeight: 39, fontWeight: '700', letterSpacing: 1.4 },
  goodMoveMobile: { fontSize: 23, lineHeight: 34, letterSpacing: 0.8 },
  explanation: { marginTop: 12, maxWidth: 780, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 26, letterSpacing: 0.4 },
  caution: { marginTop: 15, paddingHorizontal: 15, paddingVertical: 11, flexDirection: 'row', gap: 12, borderLeftWidth: 2, borderLeftColor: '#D2B36A', backgroundColor: '#FBF7EC' },
  cautionLabel: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, lineHeight: 20, fontWeight: '800' },
  cautionText: { flex: 1, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 12, lineHeight: 20 },
  relatedGrid: { marginTop: 25, flexDirection: 'row', gap: 14 },
  relatedGridMobile: { flexDirection: 'column' },
  relatedCard: { flex: 1, minHeight: 148, padding: 16, borderWidth: 1, borderColor: '#DFD0B6', borderRadius: 13, backgroundColor: '#FFFEFA' },
  relatedLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 15, letterSpacing: 0.65, fontWeight: '800' },
  relatedBody: { marginTop: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  relatedMark: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#24221D', borderWidth: 1, borderColor: colors.gold },
  relatedMarkText: { color: '#E3BD64', fontFamily: fonts.serif, fontSize: 17, lineHeight: 22, fontWeight: '700' },
  relatedCopy: { flex: 1, minWidth: 0 },
  relatedTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  relatedTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '700' },
  lockedTag: { color: '#B07D1E', fontFamily: fonts.sans, fontSize: 9, lineHeight: 14, fontWeight: '800' },
  relatedSummary: { marginTop: 5, color: colors.muted, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18 },
  relatedId: { marginTop: 7, color: colors.muted, fontFamily: fonts.sans, fontSize: 9, lineHeight: 14, letterSpacing: 0.4 },
  relatedArrow: { color: colors.gold, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30 },
  resultActions: { marginTop: 24, paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 12, borderTopWidth: 1, borderTopColor: '#E7DAC4' },
  resultActionsMobile: { flexDirection: 'column', alignItems: 'stretch' },
  closeButton: { minWidth: 210, minHeight: 50, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: 10, backgroundColor: colors.surface },
  closeButtonText: { color: colors.ink, fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  retryButton: { minHeight: 50, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  retryText: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  nextButton: { flex: 1, minHeight: 52, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', borderRadius: 10, backgroundColor: '#C18B1D' },
  nextButtonText: { color: '#FFFFFF', fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, letterSpacing: 0.6, fontWeight: '800' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.994 }] },
});
