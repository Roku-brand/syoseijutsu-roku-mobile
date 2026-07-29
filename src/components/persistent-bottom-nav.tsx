import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/constants/theme';
import { AppText } from './ui';

const items = [
  { key: 'main', label: '禄', mark: '禄', href: '/(tabs)' },
  { key: 'discover', label: '探す', mark: '⌕', href: '/discover' },
  { key: 'catalog', label: '体系', mark: '▱', href: '/catalog' },
  { key: 'my-os', label: 'マイOS', mark: '○', href: '/my-os' },
] as const;

function activeKey(pathname: string) {
  if (pathname.includes('/discover') || pathname.includes('/topic/')) {
    return 'discover';
  }
  if (
    pathname.includes('/catalog') ||
    pathname.includes('/category/') ||
    pathname.includes('/subcategory/') ||
    pathname.includes('/theory/') ||
    pathname.includes('/theories/')
  ) {
    return 'catalog';
  }
  if (
    pathname.includes('/my-os') ||
    pathname.includes('/collection/') ||
    pathname.includes('/library')
  ) {
    return 'my-os';
  }
  return 'main';
}

export function PersistentBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const lastTap = useRef<Record<string, number>>({});

  if (pathname === '/onboarding') return null;
  const selected = activeKey(pathname);

  const navigate = (item: (typeof items)[number]) => {
    const now = Date.now();
    const isCurrent = selected === item.key;
    const isDoubleTap = isCurrent && now - (lastTap.current[item.key] ?? 0) < 320;
    lastTap.current[item.key] = now;
    void Haptics.selectionAsync().catch(() => undefined);

    if (isDoubleTap) {
      router.replace(item.href as never);
      return;
    }
    if (!isCurrent) router.replace(item.href as never);
  };

  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.safeArea}>
      <View style={styles.bar}>
        {items.map((item) => {
          const active = selected === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}。もう一度すばやく押すと最初の画面へ戻ります`}
              accessibilityState={{ selected: active }}
              onPress={() => navigate(item)}
              style={({ pressed }) => [styles.item, pressed && styles.pressed]}
            >
              {active && <View style={styles.activeIndicator} />}
              <AppText style={[styles.mark, active && styles.markActive]}>{item.mark}</AppText>
              <AppText variant="caption" style={[styles.label, active && styles.labelActive]}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: colors.paper,
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  bar: {
    width: '100%',
    maxWidth: 820,
    alignSelf: 'center',
    height: 76,
    flexDirection: 'row',
    backgroundColor: colors.navInk,
    borderWidth: 1,
    borderColor: '#4B4840',
    borderRadius: 38,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  item: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 38,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.goldLight,
  },
  pressed: { opacity: 0.65 },
  mark: {
    color: '#9A9C95',
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
  },
  markActive: { color: colors.goldLight, fontSize: 22 },
  label: { color: '#C9C6BE', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  labelActive: { color: colors.goldLight },
});
