import { useLocalSearchParams, useRouter } from 'expo-router';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';

import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { Rokumaru } from '@/components/rokumaru';
import { AppText } from '@/components/ui';
import { colors, fonts, layout, radius } from '@/constants/theme';
import { learningCases, learningStages, type LearningCase } from '@/data/learning';
import {
  getTechniqueDisplayId,
  getTheoryDisplayId,
  techniqueById,
  theoryById,
} from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
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
            <View style={[styles.resultMark, !desktop && styles.resultMarkMobile, isBestMove ? styles.resultMarkGood : styles.resultMarkImprove]}>
              <AppText style={[styles.resultMarkText, !desktop && styles.resultMarkTextMobile, isBestMove ? styles.resultMarkTextGood : styles.resultMarkTextImprove]}>{isBestMove ? '✓' : '×'}</AppText>
            </View>
            <View style={[styles.resultHeading, !desktop && styles.resultHeadingMobile]}>
              <AppText
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.82}
                style={[styles.resultStatusTitle, !desktop && styles.resultStatusTitleMobile, isBestMove ? styles.goodInk : styles.improveInk]}
              >
                {isBestMove ? '正解！' : 'おしい！'}
              </AppText>
              <AppText style={[styles.resultStatusCopy, !desktop && styles.resultStatusCopyMobile]}>
                {isBestMove ? 'いい判断です。' : 'ここで違いを覚えましょう。'}
              </AppText>
            </View>
            <View style={[styles.bandMascotGroup, !desktop && styles.bandMascotGroupMobile]}>
              <View style={[styles.speechBubble, !desktop && styles.speechBubbleMobile, isBestMove ? styles.speechBubbleGood : styles.speechBubbleImprove]}>
                <AppText style={styles.speechText}>{isBestMove ? 'いい判断です。\nその調子！' : '大丈夫。\nここで覚えれば\n次に活かせます。'}</AppText>
              </View>
              <Rokumaru mood={isBestMove ? 'happy' : 'encourage'} style={[styles.bandMascot, !desktop && styles.bandMascotMobile]} />
            </View>
          </View>

          <View style={[styles.resultBody, !desktop && styles.resultBodyMobile]}>
            <AppText style={styles.sectionEyebrow}>この問題</AppText>
            <View style={styles.problemPrompt}>
              <AppText style={styles.problemSituation}>{item.situation}</AppText>
              <AppText style={styles.problemQuestion}>{item.question}</AppText>
            </View>

            <AppText style={[styles.sectionEyebrow, styles.choicesHeading]}>選択肢と解説</AppText>
            <View style={styles.reviewChoices}>
              {item.choices.map((choice) => (
                <ReviewChoice
                  key={choice.id}
                  choice={choice}
                  correct={choice.id === item.goodChoiceId}
                  selected={choice.id === selected}
                  desktop={desktop}
                />
              ))}
            </View>

            <View style={[styles.explanationSection, !desktop && styles.explanationSectionMobile]}>
              <View style={styles.techniqueHeading}>
                <AppText style={styles.sectionEyebrow}>このケースの処世術</AppText>
                <AppText style={[styles.goodMove, !desktop && styles.goodMoveMobile]}>{item.goodMove}</AppText>
              </View>
              <AppText style={[styles.explanation, !desktop && styles.explanationMobile]}>{item.why}</AppText>
            </View>
            <View style={styles.caution}>
              <AppText style={styles.cautionLabel}>注意点</AppText>
              <AppText style={styles.cautionText}>{item.caution}</AppText>
            </View>

            <View style={[styles.resultActions, !desktop && styles.resultActionsMobile]}>
            <Pressable accessibilityRole="button" onPress={retryCase} style={({ pressed }) => [styles.retryButton, pressed && styles.pressed]}>
                <AppText style={styles.retryText}>もう一度挑戦</AppText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={openNext} style={({ pressed }) => [styles.nextButton, nextButtonSurface, pressed && styles.pressed]}>
                <AppText style={styles.nextButtonText}>{next ? '次の問題へ' : 'ステージ選択へ'}　→</AppText>
            </Pressable>
            </View>

            <View style={[styles.relatedGrid, !desktop && styles.relatedGridMobile]}>
              {relatedTechnique ? (
                <RelatedCard
                  mark="術"
                  label="関連する基礎知識"
                  title={relatedTechnique.title}
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
                    <AppText style={styles.relatedMarkText}>♢</AppText>
                    <AppText style={styles.relatedTitle}>完全版の関連理論</AppText>
                    <AppText style={styles.relatedArrow}>›</AppText>
                  </View>
                </Pressable>
              )}
            </View>
          </View>
        </View>
      )}
    </BookScreen>
  );
}

function ReviewChoice({
  choice,
  correct,
  selected,
  desktop,
}: {
  choice: LearningCase['choices'][number];
  correct: boolean;
  selected: boolean;
  desktop: boolean;
}) {
  const wrong = selected && !correct;
  return (
    <View
      testID={`learning-review-choice-${choice.id}`}
      style={[
        styles.reviewChoice,
        !desktop && styles.reviewChoiceMobile,
        correct && styles.reviewChoiceCorrect,
        wrong && styles.reviewChoiceWrong,
      ]}
    >
      <View style={[
        styles.reviewChoiceBadge,
        correct && styles.reviewChoiceBadgeCorrect,
        wrong && styles.reviewChoiceBadgeWrong,
      ]}>
        <AppText style={[
          styles.reviewChoiceLetter,
          correct && styles.reviewChoiceLetterCorrect,
          wrong && styles.reviewChoiceLetterWrong,
        ]}>{choice.id.toUpperCase()}</AppText>
      </View>
      <View style={[
        styles.reviewChoiceCopy,
        (correct || wrong) && desktop && styles.reviewChoiceCopyWithBadge,
        (correct || wrong) && !desktop && styles.reviewChoiceCopyWithBadgeMobile,
      ]}>
        <AppText style={[styles.reviewChoiceTitle, !desktop && styles.reviewChoiceTitleMobile]}>{choice.label}</AppText>
        <AppText style={[styles.reviewChoiceExplanation, !desktop && styles.reviewChoiceExplanationMobile]}>
          <AppText style={[styles.reviewChoiceExplanationLabel, wrong && styles.reviewChoiceExplanationLabelWrong]}>解説：</AppText>
          {choice.review}
        </AppText>
      </View>
      {selected ? <AppText style={[styles.answerBadge, wrong && styles.answerBadgeWrong]}>あなたの回答</AppText> : null}
      {correct ? (
        <View style={styles.judgementBadge}>
          <AppText style={styles.judgementMark}>✓</AppText>
          <AppText style={styles.judgementText}>正解</AppText>
        </View>
      ) : null}
      {wrong ? (
        <View style={[styles.judgementBadge, styles.judgementBadgeWrong]}>
          <AppText style={[styles.judgementMark, styles.judgementMarkWrong]}>×</AppText>
          <AppText style={[styles.judgementText, styles.judgementTextWrong]}>おしい</AppText>
        </View>
      ) : null}
    </View>
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
      <AppText style={[styles.casePosition, !desktop && styles.casePositionMobile]}>CASE {String(item.number).padStart(2, '0')} / {COMPLETE_LEARNING_CASE_COUNT}</AppText>
      <View style={[styles.caseLine, !desktop && styles.caseLineMobile]} accessibilityLabel={`ステージ${item.stage}の7ケース進捗`}>
        <View style={styles.caseLineRule} />
        {stageCases.map((candidate) => {
          const current = candidate.id === item.id;
          const complete = Boolean(learningRecords[candidate.id]) || (current && answeredCurrent);
          return (
            <View
              key={candidate.id}
              accessibilityLabel={`ケース${candidate.number}${current ? '、現在地' : complete ? '、完了' : '、未完了'}`}
              style={[styles.caseDot, complete && styles.caseDotComplete, current && styles.caseDotCurrent]}
            />
          );
        })}
      </View>
      <AppText numberOfLines={1} style={[styles.stagePosition, !desktop && styles.stagePositionMobile]}>STAGE {String(item.stage).padStart(2, '0')}｜{stageTitle}</AppText>
    </View>
  );
}

function RelatedCard({
  mark,
  label,
  title,
  displayId,
  locked = false,
  onPress,
}: {
  mark: '術' | '理';
  label: string;
  title: string;
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
        <AppText style={styles.relatedMarkText}>{mark === '術' ? '▤' : '♢'}</AppText>
        <AppText numberOfLines={2} style={styles.relatedTitle}>{title}</AppText>
        {locked ? <AppText style={styles.lockedTag}>完全版</AppText> : null}
        <AppText style={styles.relatedArrow}>›</AppText>
      </View>
      <AppText accessibilityElementsHidden style={styles.relatedId}>{displayId}</AppText>
    </Pressable>
  );
}

const nextButtonSurface = Platform.select({
  web: { backgroundImage: 'linear-gradient(105deg, #A87312 0%, #C99631 54%, #A87312 100%)' } as object,
  default: { backgroundColor: '#B98520' },
});

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingTop: 16, paddingBottom: 38 },
  contentMobile: { paddingHorizontal: 11, paddingTop: 9, paddingBottom: layout.bottomContentInset },
  notFound: { width: '100%', maxWidth: 560, alignSelf: 'center', alignItems: 'center', paddingTop: 80 },
  notFoundTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30 },
  notFoundButton: { marginTop: 22, paddingHorizontal: 24, paddingVertical: 13, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  notFoundButtonText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13 },
  progressHeader: { minHeight: 42, flexDirection: 'row', alignItems: 'center', gap: 24, marginBottom: 10 },
  progressHeaderMobile: { minHeight: 34, flexWrap: 'nowrap', gap: 8, marginBottom: 8 },
  casePosition: { color: '#A97416', fontFamily: fonts.sans, fontSize: 12, lineHeight: 18, letterSpacing: 1.4, fontWeight: '800' },
  casePositionMobile: { fontSize: 9, lineHeight: 13, letterSpacing: 0.25 },
  caseLine: { position: 'relative', flex: 1, minWidth: 300, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 1 },
  caseLineMobile: { minWidth: 0 },
  caseLineRule: { position: 'absolute', left: 5, right: 5, height: 1, backgroundColor: '#D7BE8A' },
  caseDot: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#C99A3A', backgroundColor: colors.surface },
  caseDotComplete: { backgroundColor: '#C4912A' },
  caseDotCurrent: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: colors.ink, backgroundColor: '#B98520' },
  caseDotCheck: { color: colors.surface, fontFamily: fonts.sans, fontSize: 8, lineHeight: 9, fontWeight: '900' },
  stagePosition: { color: '#855F22', fontFamily: fonts.sans, fontSize: 11, lineHeight: 18, letterSpacing: 0.65, fontWeight: '700' },
  stagePositionMobile: { maxWidth: 137, fontSize: 8.5, lineHeight: 12, letterSpacing: 0 },
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
  resultCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#DED4C5', borderRadius: 15, backgroundColor: '#FFFEFB', ...bookCardShadow },
  resultCardMobile: { borderRadius: 13 },
  resultBand: { position: 'relative', minHeight: 118, margin: 16, marginBottom: 0, paddingHorizontal: 22, paddingRight: 250, flexDirection: 'row', alignItems: 'center', gap: 24, overflow: 'hidden', borderRadius: 10 },
  resultBandMobile: { minHeight: 116, margin: 9, marginBottom: 0, paddingHorizontal: 12, paddingRight: 140, gap: 12, borderRadius: 8 },
  resultBandGood: { backgroundColor: '#EFF9EF' },
  resultBandImprove: { backgroundColor: '#FFF0F0' },
  resultMark: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', borderWidth: 2 },
  resultMarkMobile: { width: 55, height: 55, borderRadius: 28 },
  resultMarkGood: { borderColor: '#008D43', backgroundColor: '#FCFFFC' },
  resultMarkImprove: { borderColor: '#C8001E', backgroundColor: '#FFFCFC' },
  resultMarkText: { fontFamily: fonts.sans, fontSize: 36, lineHeight: 43, fontWeight: '500' },
  resultMarkTextMobile: { fontSize: 30, lineHeight: 36 },
  resultMarkTextGood: { color: '#008D43' },
  resultMarkTextImprove: { color: '#C8001E' },
  resultHeading: { minWidth: 240 },
  resultHeadingMobile: { minWidth: 0, width: 108, flexShrink: 0 },
  resultStatusTitle: { fontFamily: fonts.serif, fontSize: 37, lineHeight: 47, fontWeight: '700', letterSpacing: 1.5 },
  resultStatusTitleMobile: { fontSize: 24, lineHeight: 31, letterSpacing: 0.1 },
  resultStatusCopy: { color: '#17223B', fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, letterSpacing: 0.6 },
  resultStatusCopyMobile: { fontSize: 10.5, lineHeight: 16, letterSpacing: 0.1 },
  goodInk: { color: '#008D43' },
  improveInk: { color: '#C8001E' },
  bandMascotGroup: { position: 'absolute', right: 8, bottom: 0, width: 285, height: 128 },
  bandMascotGroupMobile: { right: -10, bottom: 0, width: 175, height: 116 },
  bandMascot: { position: 'absolute', right: 0, bottom: 0, width: 130, height: 126 },
  bandMascotMobile: { width: 105, height: 106 },
  speechBubble: { position: 'absolute', right: 103, top: 8, zIndex: 2, width: 143, minHeight: 72, paddingHorizontal: 13, paddingVertical: 9, alignItems: 'center', justifyContent: 'center', borderRadius: 46, borderWidth: 1, backgroundColor: '#FFFEFB', ...bookCardShadow },
  speechBubbleMobile: { right: 63, top: 10, width: 118, minHeight: 62, paddingHorizontal: 10, paddingVertical: 7 },
  speechBubbleGood: { borderColor: '#BEA97F' },
  speechBubbleImprove: { borderColor: '#BEA97F' },
  speechText: { color: '#17223B', fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, fontWeight: '600', textAlign: 'left' },
  resultBody: { paddingHorizontal: 20, paddingTop: 13, paddingBottom: 16 },
  resultBodyMobile: { paddingHorizontal: 11, paddingTop: 11, paddingBottom: 10 },
  sectionEyebrow: { color: '#A46D13', fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, letterSpacing: 0.5, fontWeight: '700' },
  problemPrompt: { marginTop: 7, paddingHorizontal: 17, paddingVertical: 16, borderWidth: 1, borderColor: '#DDD2C3', borderRadius: 8, backgroundColor: '#FFFEFC' },
  problemSituation: { color: '#17223B', fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, letterSpacing: 0.3 },
  problemQuestion: { color: '#17223B', fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, letterSpacing: 0.3 },
  choicesHeading: { marginTop: 12 },
  reviewChoices: { marginTop: 6, gap: 9 },
  reviewChoice: { position: 'relative', minHeight: 104, paddingHorizontal: 18, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 20, borderWidth: 1, borderColor: '#DED4C5', borderRadius: 8, backgroundColor: '#FFFEFB' },
  reviewChoiceMobile: { minHeight: 0, paddingHorizontal: 10, paddingVertical: 10, gap: 12 },
  reviewChoiceCorrect: { borderColor: '#07954A', backgroundColor: '#F0FBF3' },
  reviewChoiceWrong: { borderColor: '#D60020', backgroundColor: '#FFF2F3' },
  reviewChoiceBadge: { width: 55, height: 55, borderRadius: 28, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#B77A16', backgroundColor: '#FFFEFB' },
  reviewChoiceBadgeCorrect: { borderColor: '#008D43', backgroundColor: '#F8FFF9' },
  reviewChoiceBadgeWrong: { borderColor: '#D00020', backgroundColor: '#FFFAFA' },
  reviewChoiceLetter: { color: '#A66B0A', fontFamily: fonts.serif, fontSize: 31, lineHeight: 38, fontWeight: '500' },
  reviewChoiceLetterCorrect: { color: '#008D43' },
  reviewChoiceLetterWrong: { color: '#C8001E' },
  reviewChoiceCopy: { flex: 1, minWidth: 0 },
  reviewChoiceCopyWithBadge: { paddingRight: 128 },
  reviewChoiceCopyWithBadgeMobile: { marginTop: 25 },
  reviewChoiceTitle: { color: '#17223B', fontFamily: fonts.serif, fontSize: 16, lineHeight: 23, fontWeight: '700', letterSpacing: 0.3 },
  reviewChoiceTitleMobile: { fontSize: 13, lineHeight: 19 },
  reviewChoiceExplanation: { marginTop: 3, color: '#3D485E', fontFamily: fonts.serif, fontSize: 12, lineHeight: 19, letterSpacing: 0.15 },
  reviewChoiceExplanationMobile: { fontSize: 10.5, lineHeight: 16 },
  reviewChoiceExplanationLabel: { color: '#A46D13', fontWeight: '700' },
  reviewChoiceExplanationLabelWrong: { color: '#C8001E' },
  answerBadge: { position: 'absolute', right: 83, top: 12, paddingHorizontal: 10, paddingVertical: 5, color: '#087B40', backgroundColor: '#E4F6E8', borderRadius: 4, fontFamily: fonts.serif, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  answerBadgeWrong: { right: 85, color: '#C8001E', backgroundColor: '#FFE3E6' },
  judgementBadge: { position: 'absolute', right: 12, top: 12, minHeight: 26, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 4, backgroundColor: '#E0F4E5' },
  judgementBadgeWrong: { backgroundColor: '#FFE1E4' },
  judgementMark: { width: 19, height: 19, borderRadius: 10, color: '#FFFFFF', backgroundColor: '#008D43', fontFamily: fonts.sans, fontSize: 12, lineHeight: 19, fontWeight: '800', textAlign: 'center' },
  judgementMarkWrong: { backgroundColor: '#C8001E' },
  judgementText: { color: '#087B40', fontFamily: fonts.serif, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  judgementTextWrong: { color: '#C8001E' },
  explanationSection: { marginTop: 12, paddingLeft: 15, flexDirection: 'row', alignItems: 'center', gap: 18, borderLeftWidth: 2, borderLeftColor: '#B77A16' },
  explanationSectionMobile: { alignItems: 'flex-start', flexDirection: 'column', gap: 4 },
  techniqueHeading: { minWidth: 470 },
  goodMove: { marginTop: 4, color: '#17223B', fontFamily: fonts.serif, fontSize: 25, lineHeight: 34, fontWeight: '700', letterSpacing: 0.7 },
  goodMoveMobile: { fontSize: 21, lineHeight: 30, letterSpacing: 0.35 },
  explanation: { flex: 1, paddingLeft: 18, borderLeftWidth: 1, borderLeftColor: '#E5DCCE', color: '#3D485E', fontFamily: fonts.serif, fontSize: 11.5, lineHeight: 19, letterSpacing: 0.15 },
  explanationMobile: { paddingLeft: 0, borderLeftWidth: 0, fontSize: 10.5, lineHeight: 17 },
  caution: { marginTop: 10, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', gap: 12, backgroundColor: '#F8F4E9', borderRadius: 3 },
  cautionLabel: { color: '#A46D13', fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, fontWeight: '700' },
  cautionText: { flex: 1, color: '#4A5260', fontFamily: fonts.serif, fontSize: 10.5, lineHeight: 18 },
  relatedGrid: { marginTop: 9, flexDirection: 'row', gap: 10 },
  relatedGridMobile: { gap: 7 },
  relatedCard: { flex: 1, minHeight: 78, paddingHorizontal: 13, paddingVertical: 9, borderWidth: 1, borderColor: '#DED4C5', borderRadius: 8, backgroundColor: '#FFFEFB' },
  relatedLabel: { color: '#3D485E', fontFamily: fonts.serif, fontSize: 9.5, lineHeight: 14, fontWeight: '700' },
  relatedBody: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 11 },
  relatedMarkText: { color: '#B77A16', fontFamily: fonts.serif, fontSize: 23, lineHeight: 28, fontWeight: '500' },
  relatedTitle: { flex: 1, color: '#17223B', fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  lockedTag: { color: '#B07D1E', fontFamily: fonts.sans, fontSize: 8, lineHeight: 12, fontWeight: '800' },
  relatedId: { position: 'absolute', width: 1, height: 1, opacity: 0 },
  relatedArrow: { color: '#17223B', fontFamily: fonts.serif, fontSize: 22, lineHeight: 26 },
  resultActions: { width: 460, maxWidth: '100%', alignSelf: 'center', marginTop: 10, flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultActionsMobile: { width: '100%', gap: 7 },
  retryButton: { flex: 1, minHeight: 40, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#B77A16', borderRadius: radius.pill, backgroundColor: '#FFFEFB' },
  retryText: { color: '#17223B', fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  nextButton: { flex: 1.25, minHeight: 40, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#B98520' },
  nextButtonText: { color: '#FFFFFF', fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, letterSpacing: 0.6, fontWeight: '800' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.994 }] },
});
