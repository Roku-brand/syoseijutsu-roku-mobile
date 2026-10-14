import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { colors } from '@/constants/theme';
import type { EditorialCharacter } from '@/data/editorial-characters';
import { EDITORIAL_PRODUCER } from '@/data/editorial-policy';
import { contentImageUrl } from '@/lib/content-media';
import { editorialGuideRoute } from '@/navigation/app-routes';

export const EDITORIAL_PORTRAITS = [
  { id: 'bundled:sumino-haruka', name: '澄野 遥', source: require('../../assets/editorial/sumino-haruka.webp') },
  { id: 'bundled:sakaki-naoto', name: '榊 直人', source: require('../../assets/editorial/sakaki-naoto.webp') },
  { id: 'bundled:onose-tsumugi', name: '小野瀬 紬', source: require('../../assets/editorial/onose-tsumugi.webp') },
];

export function EditorialAvatar({ character, size = 36 }: { character: Pick<EditorialCharacter, 'name' | 'image_path' | 'image_alt'>; size?: number }) {
  const source = EDITORIAL_PORTRAITS.find(portrait => portrait.id === character.image_path)?.source ?? contentImageUrl(character.image_path);
  return source ? <Image source={typeof source === 'string' ? { uri: source } : source} accessibilityLabel={character.image_alt || `${character.name}のイラスト`} contentFit="cover" style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.line }} /> : <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}><AppText style={styles.initial}>{character.name.slice(0, 1) || '案'}</AppText></View>;
}
export function EditorialByline({ character, preview = false }: { character?: EditorialCharacter; preview?: boolean }) {
  const router = useRouter();
  return <View style={styles.byline} testID="editorial-byline"><AppText style={styles.text}>制作：{EDITORIAL_PRODUCER}</AppText>{character ? <Pressable accessibilityRole="link" accessibilityLabel={`${character.name}のプロフィール`} onPress={() => !preview && router.push(editorialGuideRoute(character.id))} style={styles.guide}><EditorialAvatar character={character} /><View><AppText style={styles.text}>案内人：{character.name}</AppText></View></Pressable> : null}</View>;
}
const styles = StyleSheet.create({ byline: { gap: 14, alignItems: 'flex-start', marginBottom: 32 }, guide: { flexDirection: 'row', gap: 10, alignItems: 'center', minHeight: 44 }, text: { color: colors.muted, fontSize: 13, lineHeight: 22 }, disclosure: { color: colors.muted, fontSize: 11, lineHeight: 20 }, fallback: { backgroundColor: '#EEE7DA', alignItems: 'center', justifyContent: 'center' }, initial: { color: colors.goldDeep, fontSize: 17 } });
