import { Redirect, useLocalSearchParams, useRouter, type Href } from 'expo-router';
import { Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen, SectionHeader } from '@/components/ui';
import { getLegalDocuments, type LegalDocumentKey } from '@/data/legal-documents';

export function generateStaticParams() {
 return [{ document: 'about' }, ...Object.keys(getLegalDocuments()).map(document => ({ document }))];
}

export default function LegalDocumentScreen() {
 const router = useRouter();
 const { document } = useLocalSearchParams<{ document: LegalDocumentKey | 'about' }>();
 if (document === 'about') return <Redirect href={'/about/shoseijutsu' as Href} />;
 const content = getLegalDocuments(Platform.OS === 'ios' ? 'ios' : 'web')[document as LegalDocumentKey];
 if (!content) return <Screen><EmptyState title="文書が見つかりません" description="前の画面へ戻ってください。" /></Screen>;
 return <Screen>
  <AppText variant="title">{content.title}</AppText>
  <AppText style={styles.lead}>{content.lead}</AppText>
  {content.sections.map(section => <View key={section.title}>
   <SectionHeader title={section.title} />
   {section.paragraphs.map((paragraph, index) => <AppText key={index} style={styles.paragraph}>{paragraph}</AppText>)}
   {section.links?.map(link => <Pressable accessibilityRole="link" key={link.url} style={styles.link} onPress={() => void Linking.openURL(link.url)}><AppText style={styles.linkText}>{link.title} ↗</AppText></Pressable>)}
  </View>)}
  {document === 'terms' ? <Pressable accessibilityRole="button" style={styles.link} onPress={() => router.push('/legal/terms-history')}><AppText style={styles.linkText}>利用規約の履歴を見る</AppText></Pressable> : null}
 </Screen>;
}
const styles = StyleSheet.create({
 lead: { marginTop: 16, opacity: 0.68 }, paragraph: { marginBottom: 14 },
 link: { alignSelf: 'flex-start', paddingVertical: 10, marginBottom: 8 },
 linkText: { color: '#8B672A', fontSize: 14, lineHeight: 21, textDecorationLine: 'underline' },
});
