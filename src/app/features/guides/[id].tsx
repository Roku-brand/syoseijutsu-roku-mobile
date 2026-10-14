import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText, EmptyState } from '@/components/ui';
import { EditorialAvatar } from '@/components/editorial-guide';
import { FeatureCard } from '@/components/feature-card';
import { colors, fonts } from '@/constants/theme';
import { INITIAL_EDITORIAL_CHARACTER_IDS, refreshEditorialCharacters, useEditorialCharacters } from '@/data/editorial-characters';
import { EDITORIAL_PRODUCER } from '@/data/editorial-policy';
import { useFeatures, refreshFeatures } from '@/data/features';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export function generateStaticParams() { return INITIAL_EDITORIAL_CHARACTER_IDS.map(id => ({ id })); }
export default function EditorialGuideScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const { characters, loading, error } = useEditorialCharacters();
  const features = useFeatures();
  const character = characters.find(item => item.id === id);
  const articles = features.articles.filter(article => article.editorial_character_id === id);
  return <BookScreen contentContainerStyle={styles.page} testID="editorial-profile">{loading ? <EmptyState title="案内人を読み込んでいます" description="少しお待ちください。" /> : error ? <><EmptyState title="案内人を読み込めませんでした" description={error} /><Pressable accessibilityRole="button" onPress={() => void refreshEditorialCharacters()}><AppText style={styles.link}>もう一度読み込む</AppText></Pressable></> : !character ? <EmptyState title="この案内人は現在公開されていません" description="記事は処世術禄編集部が制作しています。特集一覧から引き続きお読みいただけます。" /> : <><View style={styles.identity}><EditorialAvatar character={character} size={104} /><View style={styles.copy}><AppText style={styles.role}>{character.role}</AppText><AppText accessibilityRole="header" aria-level={1} style={styles.title}>{character.name}</AppText></View></View><AppText style={styles.bio}>{character.bio}</AppText>{character.interests.length ? <View style={styles.interests}><AppText style={styles.label}>関心領域</AppText><AppText style={styles.role}>{character.interests.join(' ／ ')}</AppText></View> : null}<AppText accessibilityRole="header" aria-level={2} style={styles.section}>案内する特集</AppText>{features.loading ? <AppText style={styles.note}>特集を読み込んでいます。</AppText> : features.error ? <Pressable accessibilityRole="button" onPress={() => void refreshFeatures()}><AppText style={styles.link}>特集をもう一度読み込む</AppText></Pressable> : articles.length ? <View style={styles.grid}>{articles.map(article => <FeatureCard key={article.id} article={article} compact={width < 700} style={{ width: width < 700 ? '100%' : '47%' }} />)}</View> : <AppText style={styles.note}>この案内人が設定された特集は、まだありません。</AppText>}<AppText style={styles.note}>制作：{EDITORIAL_PRODUCER}</AppText></>}<View style={styles.links}><Pressable accessibilityRole="link" onPress={() => router.push('/features')} style={styles.back}><AppText style={styles.link}>← 特集一覧へ</AppText></Pressable><Pressable accessibilityRole="link" onPress={() => router.push('/features/editorial-policy')} style={styles.back}><AppText style={styles.link}>編集方針 →</AppText></Pressable></View></BookScreen>;
}
const styles = StyleSheet.create({ page: { width: '100%', maxWidth: 850, alignSelf: 'center', padding: 24, paddingTop: 40, gap: 24 }, identity: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 22 }, copy: { flex: 1, minWidth: 150, gap: 6 }, role: { color: colors.muted, fontSize: 13, lineHeight: 25 }, title: { fontFamily: fonts.serif, fontSize: 30, lineHeight: 46 }, bio: { fontFamily: fonts.serif, fontSize: 17, lineHeight: 33 }, interests: { gap: 8 }, label: { fontSize: 13, color: colors.ink }, disclosure: { borderLeftWidth: 1, borderLeftColor: colors.gold, paddingLeft: 16 }, note: { color: colors.muted, fontSize: 13, lineHeight: 25 }, section: { fontFamily: fonts.serif, fontSize: 24, lineHeight: 38, marginTop: 12 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 }, back: { minHeight: 44, justifyContent: 'center' }, link: { color: colors.goldDeep, fontSize: 14, lineHeight: 25 } });
