import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, layout, radius, shadow, spacing } from '@/constants/theme';
import { getChoiceReview, getLearningCase, learningCases, type LearningCase, type LearningChoice } from '@/data/learning';
import { techniqueById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function LearningCaseScreen() {
  const { caseId, retry } = useLocalSearchParams<{ caseId: string; retry?: string }>();
  const router = useRouter();
  const item = getLearningCase(caseId ?? '');
  const { learningRecords, answerLearningCase, resetLearningCase } = useAppState();

  if (!item) {
    return <BookScreen contentContainerStyle={styles.content}><AppText>この局面は見つかりません。</AppText></BookScreen>;
  }

  const record = retry === '1' ? undefined : learningRecords[item.id];
  const selected = record?.choiceId;
  const selectedChoice = item.choices.find((choice) => choice.id === selected);
  const selectedReview = selectedChoice ? getChoiceReview(item, selectedChoice) : null;
  const isBestMove = selected === item.goodChoiceId;
  const next = learningCases.find((candidate) => candidate.stage === item.stage && candidate.number === item.number + 1)
    ?? learningCases.find((candidate) => candidate.stage === item.stage + 1);

  const openNext = () => {
    if (next) router.replace(`/learn/${next.id}`);
    else router.replace('/learn');
  };

  return (
    <BookScreen scroll={Boolean(record)} contentContainerStyle={[styles.content, !record && styles.questionContent]}>
      <View style={styles.positionRow}>
        <AppText style={styles.position}>CASE {String(item.number).padStart(2, '0')} / {learningCases.length}</AppText>
        <AppText style={styles.stage}>STAGE {String(item.stage).padStart(2, '0')}</AppText>
      </View>
      <View style={styles.headingRule} />
      <AppText style={styles.eyebrow}>{item.eyebrow}</AppText>
      <AppText numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.76} style={styles.title}>{item.title}</AppText>
      <AppText numberOfLines={3} style={styles.situation}>{item.situation}</AppText>

      {!record ? (
        <View style={styles.answerArea}>
          <AppText numberOfLines={2} adjustsFontSizeToFit minimumFontScale={0.78} style={styles.question}>{item.question}</AppText>
          {item.choices.map((choice) => (
            <Pressable key={choice.id} accessibilityRole="button" onPress={() => answerLearningCase(item.id, choice.id)} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
              <AppText style={styles.choiceLetter}>{choice.id.toUpperCase()}</AppText>
              <AppText numberOfLines={2} style={styles.choiceText}>{choice.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.result}>
          <View style={[styles.resultStatus, isBestMove ? styles.resultStatusGood : styles.resultStatusAlternative]}>
            <View style={[styles.resultMark, isBestMove ? styles.resultMarkGood : styles.resultMarkAlternative]}>
              <AppText style={[styles.resultMarkText, isBestMove ? styles.resultMarkTextGood : styles.resultMarkTextAlternative]}>
                {isBestMove ? '○' : '×'}
              </AppText>
            </View>
            <View style={styles.resultStatusCopy}>
              <AppText style={styles.resultStatusLabel}>この局面での評価</AppText>
              <AppText style={[styles.resultStatusText, isBestMove ? styles.resultStatusTextGood : styles.resultStatusTextAlternative]}>
                {isBestMove ? 'いい手。' : '今回は、別の手がよりよい。'}
              </AppText>
            </View>
          </View>
          <AppText style={styles.selectedLabel}>あなたが選んだ手</AppText>
          <View style={styles.selectedChoice}>
            <AppText style={styles.selectedLetter}>{selected?.toUpperCase()}</AppText>
            <AppText style={styles.selectedText}>{selectedChoice?.label}</AppText>
          </View>
          {!isBestMove && selectedReview && <AppText style={styles.selectedReview}>{selectedReview.text}</AppText>}

          <View style={styles.moveBlock}>
            <AppText style={styles.resultLabel}>{isBestMove ? 'この一手が活きる理由' : 'この局面で活きる一手'}</AppText>
            <AppText style={styles.goodMove}>{item.goodMove}</AppText>
            <AppText style={styles.resultText}>
              {item.why}
            </AppText>
          </View>

          <View style={styles.comparison}>
            <AppText style={styles.comparisonLabel}>ほかの手と比べる</AppText>
            {item.choices.map((choice) => (
              <ChoiceComparison
                key={choice.id}
                item={item}
                choice={choice}
                selected={selected}
              />
            ))}
          </View>
          <View style={styles.caution}>
            <AppText style={styles.cautionLabel}>注意点</AppText>
            <AppText style={styles.cautionText}>{item.caution}</AppText>
          </View>
          <View style={styles.related}>
            <AppText style={styles.relatedLabel}>関連する処世術</AppText>
            {item.relatedCardIds.map((id) => {
              const card = techniqueById.get(id);
              if (!card) return null;
              return <Pressable key={id} accessibilityRole="link" onPress={() => router.push(`/card/${id}`)} style={({ pressed }) => [styles.relatedRow, pressed && styles.pressed]}><AppText style={styles.relatedTitle}>{card.title}</AppText><AppText style={styles.relatedArrow}>→</AppText></Pressable>;
            })}
          </View>
          <Pressable accessibilityRole="button" onPress={() => resetLearningCase(item.id)} style={({ pressed }) => [styles.retry, pressed && styles.pressed]}>
            <AppText style={styles.retryText}>このケースをもう一度解く</AppText>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={openNext} style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
            <AppText style={styles.nextText}>{next ? '次の局面へ  →' : 'STAGE SELECTへ  →'}</AppText>
          </Pressable>
        </View>
      )}
    </BookScreen>
  );
}

function ChoiceComparison({
  item,
  choice,
  selected,
}: {
  item: LearningCase;
  choice: LearningChoice;
  selected?: LearningChoice['id'];
}) {
  const review = getChoiceReview(item, choice);
  const isGood = review.isPreferred;
  const isSelected = choice.id === selected;

  return (
    <View style={[styles.comparisonRow, isGood && styles.comparisonRowGood]}>
      <View style={[styles.comparisonBadge, isGood && styles.comparisonBadgeGood]}>
        <AppText style={[styles.comparisonLetter, isGood && styles.comparisonLetterGood]}>{choice.id.toUpperCase()}</AppText>
      </View>
      <View style={styles.comparisonContent}>
        <AppText style={[styles.comparisonTitle, isGood && styles.comparisonTitleGood]}>{choice.label}</AppText>
        <AppText style={styles.comparisonText}>{review.text}</AppText>
      </View>
      {isSelected && <AppText style={styles.youMark}>選んだ</AppText>}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, paddingBottom: layout.bottomContentInset },
  questionContent: { flex: 1, paddingTop: spacing.sm, paddingBottom: spacing.sm },
  positionRow: { marginTop: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  position: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  stage: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  headingRule: { marginTop: 8, width: 32, height: 2, backgroundColor: colors.gold },
  eyebrow: { marginTop: 10, color: colors.muted, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 0.5, fontWeight: '600' },
  title: { marginTop: 4, color: colors.ink, fontFamily: fonts.serif, fontSize: 26, lineHeight: 36, fontWeight: '700', letterSpacing: 0.4 },
  situation: { marginTop: 8, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  answerArea: { flex: 1, marginTop: 14 },
  question: { marginBottom: 5, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  choice: { minHeight: 54, marginTop: 7, paddingHorizontal: 13, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card },
  choiceLetter: { color: colors.gold, fontFamily: fonts.serif, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  choiceText: { flex: 1, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  result: { marginTop: 34, padding: 20, borderWidth: 1, borderColor: colors.line, borderRadius: radius.lg, backgroundColor: colors.surface, ...shadow.card },
  resultStatus: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderRadius: radius.md },
  resultStatusGood: { backgroundColor: colors.sage },
  resultStatusAlternative: { backgroundColor: '#F3E8D5' },
  resultMark: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  resultMarkGood: { backgroundColor: '#D3E0CD' },
  resultMarkAlternative: { backgroundColor: '#EBD7B6' },
  resultMarkText: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 36, fontWeight: '700' },
  resultMarkTextGood: { color: colors.success },
  resultMarkTextAlternative: { color: '#85652B' },
  resultStatusCopy: { flex: 1 },
  resultStatusLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 14, letterSpacing: 0.75, fontWeight: '700' },
  resultStatusText: { marginTop: 2, fontFamily: fonts.serif, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  resultStatusTextGood: { color: colors.success },
  resultStatusTextAlternative: { color: '#85652B' },
  selectedLabel: { marginTop: 20, color: colors.muted, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  selectedChoice: { marginTop: 8, padding: 13, flexDirection: 'row', gap: 11, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  selectedLetter: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '700' },
  selectedText: { flex: 1, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 23, fontWeight: '700' },
  selectedReview: { marginTop: 9, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 13, lineHeight: 22 },
  moveBlock: { marginTop: 23 },
  resultLabel: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  goodMove: { marginTop: 8, color: colors.ink, fontFamily: fonts.serif, fontSize: 23, lineHeight: 34, fontWeight: '700' },
  resultText: { marginTop: 12, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 14, lineHeight: 24 },
  comparison: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderColor: colors.line },
  comparisonLabel: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  comparisonRow: { marginTop: 10, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9, borderRadius: radius.sm, backgroundColor: colors.paper },
  comparisonRowGood: { borderWidth: 1, borderColor: '#CDB57B', backgroundColor: '#FAF4E5' },
  comparisonBadge: { width: 23, height: 23, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: '#E4DDD0' },
  comparisonBadgeGood: { backgroundColor: colors.gold },
  comparisonLetter: { color: colors.muted, fontFamily: fonts.sans, fontSize: 11, fontWeight: '800' },
  comparisonLetterGood: { color: colors.white },
  comparisonContent: { flex: 1 },
  comparisonTitle: { color: colors.ink, fontFamily: fonts.sans, fontSize: 13, lineHeight: 20, fontWeight: '700' },
  comparisonTitleGood: { color: '#624F28' },
  comparisonText: { marginTop: 3, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 12, lineHeight: 19 },
  youMark: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 18 },
  caution: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderColor: colors.line },
  cautionLabel: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  cautionText: { marginTop: 7, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 13, lineHeight: 22 },
  related: { marginTop: 23, paddingTop: 18, borderTopWidth: 1, borderColor: colors.line },
  relatedLabel: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  relatedRow: { paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: colors.line, gap: 10 },
  relatedTitle: { color: colors.ink, flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  relatedArrow: { color: colors.gold, fontSize: 16 },
  next: { marginTop: 24, minHeight: 54, alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.gold },
  nextText: { color: '#FFFFFF', fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.6, fontWeight: '800' },
  retry: { marginTop: 12, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, backgroundColor: colors.surface },
  retryText: { color: colors.gold, fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.4, fontWeight: '800' },
  pressed: { opacity: 0.65 },
});
