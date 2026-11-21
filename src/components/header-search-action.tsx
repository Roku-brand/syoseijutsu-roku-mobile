import { useGlobalSearchParams, usePathname } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { colors } from '@/constants/theme';
import type { BrowseMode } from '@/data/search-catalog';
import { useDiscoverSearchEntry } from '@/navigation/discover-search-entry';
import { SearchMark } from './search-mark';

export function HeaderSearchAction({ initialMode = 'techniques', label = '検索', size = 25, color = colors.ink }: {
  initialMode?: BrowseMode; label?: string; size?: number; color?: string;
}) {
  const { open } = useDiscoverSearchEntry();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ category?: string | string[]; q?: string | string[] }>();
  const category = Array.isArray(params.category) ? params.category[0] : params.category;
  const q = Array.isArray(params.q) ? params.q[0] : params.q;
  const techniqueCategory = pathname === '/techniques' ? category || 'all' : undefined;
  return <Pressable accessibilityRole="button" accessibilityLabel={label}
    onPress={() => open({ mode: initialMode, techniqueCategory, query: techniqueCategory ? q ?? '' : undefined })}
    style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}><SearchMark size={size} color={color} /></Pressable>;
}

const styles = StyleSheet.create({
  trigger: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.65 },
});
