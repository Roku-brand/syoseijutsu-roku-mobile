import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui';
import { fonts } from '@/constants/theme';

type Source = 'reel' | 'discover_technique' | 'discover_theory' | 'learning' | 'my_os';

/** Paid content no longer has an intermediate lock preview: it opens the purchase page immediately. */
export function LockedPreview({ source }: { source: Source; title?: string; description?: string; count?: number }) {
  const router = useRouter();
  useEffect(() => { router.replace({ pathname: '/upgrade', params: { source } }); }, [router, source]);
  return null;
}

export function EditionCover({ small = false, compact = false }: { small?: boolean; compact?: boolean }) {
  return <View style={[styles.cover, small && styles.coverSmall, compact && styles.coverCompact]}><View style={styles.frame} /><AppText variant="serif" style={[styles.coverName, compact && styles.coverNameCompact]}>処世術{`\n`}禄</AppText><View style={styles.coverEdition}><AppText style={styles.coverEditionText}>完全版</AppText></View><AppText style={styles.coverCrown}>♛</AppText></View>;
}

const styles = StyleSheet.create({
  cover: { position: 'relative', width: 142, height: 142, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#11110F', borderWidth: 1, borderColor: '#3A3020' }, coverSmall: { width: 128, height: 128 }, coverCompact: { width: 105, height: 105, borderRadius: 10 }, frame: { position: 'absolute', top: 8, right: 8, bottom: 8, left: 8, borderWidth: 1, borderColor: '#8E691F', borderRadius: 7 }, coverName: { color: '#D3AD4E', fontSize: 25, lineHeight: 38, textAlign: 'center', fontWeight: '700' }, coverNameCompact: { fontSize: 18, lineHeight: 25, transform: [{ translateY: -7 }] }, coverEdition: { position: 'absolute', bottom: 18, borderWidth: 1, borderColor: '#C49A41', borderRadius: 4, paddingHorizontal: 10, paddingVertical: 2 }, coverEditionText: { color: '#D2B36E', fontFamily: fonts.serif, fontSize: 9, lineHeight: 13, letterSpacing: 1.5 }, coverCrown: { position: 'absolute', bottom: 4, color: '#BD8B29', fontSize: 12, lineHeight: 14 },
});
