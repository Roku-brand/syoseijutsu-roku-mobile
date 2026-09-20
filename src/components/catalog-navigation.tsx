import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { SearchMark } from './search-mark';
import { AppText } from './ui';

export function CatalogTitleBar({ title, searchMode }: { title: string; searchMode: 'personas' | 'techniques' | 'theories' }) {
  const router = useRouter();
  return (
    <View style={styles.titleBar}>
      <View style={styles.titleSpacer} />
      <AppText accessibilityRole="header" aria-level={1} style={styles.title}>{title}</AppText>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${title}を検索`}
        onPress={() => router.push({ pathname: '/search', params: { mode: searchMode } })}
        hitSlop={8}
        style={({ pressed }) => [styles.searchButton, pressed && styles.pressed]}
      >
        <SearchMark size={29} color={colors.gold} />
      </Pressable>
    </View>
  );
}

export function CatalogModeSwitch({ active }: { active: 'personas' | 'theories' }) {
  const router = useRouter();
  return (
    <View accessibilityRole="tablist" style={styles.switch}>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === 'personas' }} onPress={() => router.push('/discover')} style={[styles.switchButton, active === 'personas' && styles.switchButtonActive]}>
        <AppText style={[styles.switchText, active === 'personas' && styles.switchTextActive]}>人物像</AppText>
      </Pressable>
      <Pressable accessibilityRole="tab" accessibilityState={{ selected: active === 'theories' }} onPress={() => router.push('/theories')} style={[styles.switchButton, active === 'theories' && styles.switchButtonActive]}>
        <AppText style={[styles.switchText, active === 'theories' && styles.switchTextActive]}>理論</AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  titleBar: { minHeight: 72, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  titleSpacer: { width: 44 },
  title: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 28, lineHeight: 39, fontWeight: '700', letterSpacing: 1.5, textAlign: 'center' },
  searchButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
  switch: { width: '100%', maxWidth: 420, alignSelf: 'center', marginTop: spacing.lg, padding: 3, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  switchButton: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  switchButtonActive: { backgroundColor: colors.charcoal },
  switchText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  switchTextActive: { color: colors.goldLight },
  pressed: { opacity: 0.65 },
});
