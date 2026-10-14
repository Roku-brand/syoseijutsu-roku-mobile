import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { EDITORIAL_PRODUCER, EDITORIAL_INTRODUCTION, KNOWLEDGE_PHILOSOPHY, LASTING_KNOWLEDGE_VALUE, EDITORIAL_POLICY_PARAGRAPHS } from '@/data/editorial-policy';

export default function EditorialPolicyScreen() {
  return <BookScreen contentContainerStyle={styles.page} testID="editorial-policy"><AppText accessibilityRole="header" aria-level={1} style={styles.title}>処世術禄の編集方針</AppText><AppText style={styles.intro}>{EDITORIAL_INTRODUCTION}</AppText><View style={styles.statement}><AppText style={styles.paragraph}>{KNOWLEDGE_PHILOSOPHY}</AppText><AppText style={styles.paragraph}>{LASTING_KNOWLEDGE_VALUE}</AppText></View>{EDITORIAL_POLICY_PARAGRAPHS.map((paragraph, index) => <AppText key={index} style={styles.paragraph}>{paragraph}</AppText>)}<AppText style={styles.producer}>制作：{EDITORIAL_PRODUCER}</AppText></BookScreen>;
}
const styles = StyleSheet.create({ page: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 36, gap: 26 }, title: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 45 }, intro: { fontFamily: fonts.serif, color: colors.muted, fontSize: 16, lineHeight: 30 }, statement: { borderLeftWidth: 1, borderLeftColor: colors.gold, paddingLeft: 18, gap: 18 }, paragraph: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 32, color: colors.ink }, producer: { fontSize: 13, color: colors.muted, lineHeight: 24 } });
