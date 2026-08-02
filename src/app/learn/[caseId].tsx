import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, layout, radius, shadow, spacing } from '@/constants/theme';
import { getLearningCase, learningCases } from '@/data/learning';
import { techniqueById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function LearningCaseScreen() {
  const { caseId } = useLocalSearchParams<{ caseId: string }>();
  const router = useRouter();
  const item = getLearningCase(caseId ?? '');
  const { learningRecords, answerLearningCase } = useAppState();

  if (!item) {
    return <BookScreen contentContainerStyle={styles.content}><AppText>この局面は見つかりません。</AppText></BookScreen>;
  }

  const record = learningRecords[item.id];
  const selected = record?.choiceId;
  const next = learningCases.find((candidate) => candidate.stage === item.stage && candidate.number === item.number + 1)
    ?? learningCases.find((candidate) => candidate.stage === item.stage + 1);

  const openNext = () => {
    if (next) router.replace(`/learn/${next.id}`);
    else router.replace('/learn');
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.positionRow}>
        <AppText style={styles.position}>CASE {String(item.number).padStart(2, '0')} / {learningCases.length}</AppText>
        <AppText style={styles.stage}>STAGE {String(item.stage).padStart(2, '0')}</AppText>
      </View>
      <View style={styles.headingRule} />
      <AppText style={styles.eyebrow}>{item.eyebrow}</AppText>
      <AppText style={styles.title}>{item.title}</AppText>
      <AppText style={styles.situation}>{item.situation}</AppText>

      {!record ? (
        <View style={styles.answerArea}>
          <AppText style={styles.question}>{item.question}</AppText>
          {item.choices.map((choice) => (
            <Pressable key={choice.id} accessibilityRole="button" onPress={() => answerLearningCase(item.id, choice.id)} style={({ pressed }) => [styles.choice, pressed && styles.pressed]}>
              <AppText style={styles.choiceLetter}>{choice.id.toUpperCase()}</AppText>
              <AppText style={styles.choiceText}>{choice.label}</AppText>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={styles.result}>
          <AppText style={styles.resultLabel}>{selected === item.goodChoiceId ? 'いい手。' : '別の一手もある。'}</AppText>
          <AppText style={styles.goodMove}>{item.goodMove}</AppText>
          <AppText style={styles.resultText}>{item.why}</AppText>
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
          <Pressable accessibilityRole="button" onPress={openNext} style={({ pressed }) => [styles.next, pressed && styles.pressed]}>
            <AppText style={styles.nextText}>{next ? '次の局面へ  →' : 'STAGE SELECTへ  →'}</AppText>
          </Pressable>
        </View>
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', padding: spacing.lg, paddingBottom: layout.bottomContentInset },
  positionRow: { marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  position: { color: colors.gold, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.5, fontWeight: '700' },
  stage: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, letterSpacing: 1.1, fontWeight: '700' },
  headingRule: { marginTop: 15, width: 40, height: 2, backgroundColor: colors.gold },
  eyebrow: { marginTop: 24, color: colors.muted, fontFamily: fonts.sans, fontSize: 12, letterSpacing: 0.5, fontWeight: '600' },
  title: { marginTop: 8, color: colors.ink, fontFamily: fonts.serif, fontSize: 31, lineHeight: 45, fontWeight: '700', letterSpacing: 0.6 },
  situation: { marginTop: 23, color: colors.inkSoft, fontFamily: fonts.sans, fontSize: 16, lineHeight: 28 },
  answerArea: { marginTop: 34 },
  question: { marginBottom: 12, color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 29, fontWeight: '700' },
  choice: { minHeight: 74, marginTop: 10, padding: 16, flexDirection: 'row', alignItems: 'flex-start', gap: 13, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card },
  choiceLetter: { color: colors.gold, fontFamily: fonts.serif, fontSize: 18, lineHeight: 25, fontWeight: '700' },
  choiceText: { flex: 1, color: colors.ink, fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, fontWeight: '600' },
  result: { marginTop: 34, padding: 22, borderWidth: 1, borderColor: '#4C493F', borderRadius: radius.lg, backgroundColor: colors.charcoal, ...shadow.card },
  resultLabel: { color: colors.goldLight, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.4, fontWeight: '700' },
  goodMove: { marginTop: 10, color: colors.surface, fontFamily: fonts.serif, fontSize: 25, lineHeight: 37, fontWeight: '700' },
  resultText: { marginTop: 16, color: '#E0DDD4', fontFamily: fonts.sans, fontSize: 15, lineHeight: 26 },
  caution: { marginTop: 22, paddingTop: 18, borderTopWidth: 1, borderColor: '#565248' },
  cautionLabel: { color: colors.goldLight, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  cautionText: { marginTop: 7, color: '#D7D3CA', fontFamily: fonts.sans, fontSize: 13, lineHeight: 22 },
  related: { marginTop: 23, paddingTop: 18, borderTopWidth: 1, borderColor: '#565248' },
  relatedLabel: { color: colors.goldLight, fontFamily: fonts.sans, fontSize: 11, letterSpacing: 1.1, fontWeight: '700' },
  relatedRow: { paddingVertical: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#565248', gap: 10 },
  relatedTitle: { color: colors.surface, flex: 1, fontFamily: fonts.sans, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  relatedArrow: { color: colors.goldLight, fontSize: 16 },
  next: { marginTop: 24, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.goldLight },
  nextText: { color: colors.charcoal, fontFamily: fonts.sans, fontSize: 13, letterSpacing: 0.6, fontWeight: '800' },
  pressed: { opacity: 0.65 },
});
