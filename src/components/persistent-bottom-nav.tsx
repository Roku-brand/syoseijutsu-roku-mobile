import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/constants/theme';
import { AppText } from './ui';

const items = [
  { key: 'main', label: 'メイン', mark: '禄', href: '/(tabs)' },
  { key: 'discover', label: '探す', mark: '探', href: '/discover' },
  { key: 'catalog', label: '体系', mark: '系', href: '/catalog' },
  { key: 'my-os', label: 'マイOS', mark: '私', href: '/my-os' },
] as const;

function activeKey(pathname: string) {
  if (pathname.includes('/discover')) return 'discover';
  if (
    pathname.includes('/catalog') ||
    pathname.includes('/category/') ||
    pathname.includes('/subcategory/') ||
    pathname.includes('/theory/') ||
    pathname.includes('/theories/')
  ) {
    return 'catalog';
  }
  if (pathname.includes('/my-os') || pathname.includes('/collection/')) return 'my-os';
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
    <SafeAreaView edges={['bottom']} style={styles.safeArea}>
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
  safeArea: { backgroundColor: colors.navInk },
  bar: {
    height: 62,
    flexDirection: 'row',
    backgroundColor: colors.navInk,
    borderTopWidth: 1,
    borderTopColor: '#3E493F',
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
    top: 0,
    width: 34,
    height: 3,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.goldLight,
  },
  pressed: { opacity: 0.65 },
  mark: {
    color: '#9A9C95',
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
  },
  markActive: { color: colors.goldLight, fontSize: 19 },
  label: { color: '#9A9C95', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  labelActive: { color: colors.goldLight },
});
