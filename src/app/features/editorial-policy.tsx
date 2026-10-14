import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { StyleSheet, View } from 'react-native';
import { Link } from 'expo-router';
import { EditorialAvatar } from '@/components/editorial-guide';
import { useEditorialCharacters } from '@/data/editorial-characters';
import { editorialGuideRoute } from '@/navigation/app-routes';
import { colors, fonts } from '@/constants/theme';
import { EDITORIAL_PRODUCER, EDITORIAL_INTRODUCTION, KNOWLEDGE_PHILOSOPHY, LASTING_KNOWLEDGE_VALUE, EDITORIAL_POLICY_PARAGRAPHS } from '@/data/editorial-policy';

export default function EditorialPolicyScreen() {
  const { characters } = useEditorialCharacters();
  return <BookScreen contentContainerStyle={styles.page} testID="editorial-policy"><AppText accessibilityRole="header" aria-level={1} style={styles.title}>処世術禄の編集方針</AppText><AppText style={styles.intro}>{EDITORIAL_INTRODUCTION}</AppText><View style={styles.statement}><AppText style={styles.paragraph}>{KNOWLEDGE_PHILOSOPHY}</AppText><AppText style={styles.paragraph}>{LASTING_KNOWLEDGE_VALUE}</AppText></View>{EDITORIAL_POLICY_PARAGRAPHS.map((paragraph, index) => <AppText key={index} style={styles.paragraph}>{paragraph}</AppText>)}{characters.length ? <View style={styles.roster}><AppText accessibilityRole="header" aria-level={2} style={styles.intro}>編集案内人</AppText>{characters.map(character => <View key={character.id} style={styles.person}><EditorialAvatar character={character} /><Link href={editorialGuideRoute(character.id)} accessibilityLabel={`${character.name}のプロフィール`}><AppText style={styles.producer}>{character.name} →</AppText></Link></View>)}</View> : null}<AppText style={styles.producer}>制作：{EDITORIAL_PRODUCER}</AppText></BookScreen>;
}
const styles = StyleSheet.create({ roster: { gap: 14, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 24 }, person: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 }, page: { width: '100%', maxWidth: 780, alignSelf: 'center', paddingHorizontal: 22, paddingVertical: 36, gap: 26 }, title: { fontFamily: fonts.serif, fontSize: 29, lineHeight: 45 }, intro: { fontFamily: fonts.serif, color: colors.muted, fontSize: 16, lineHeight: 30 }, statement: { borderLeftWidth: 1, borderLeftColor: colors.gold, paddingLeft: 18, gap: 18 }, paragraph: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 32, color: colors.ink }, producer: { fontSize: 13, color: colors.muted, lineHeight: 24 } });
