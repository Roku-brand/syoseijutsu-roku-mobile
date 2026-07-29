import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
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
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;
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
    <SafeAreaView
      edges={desktop ? ['top', 'bottom', 'left'] : ['bottom', 'left', 'right']}
      style={[styles.safeArea, desktop && styles.safeAreaDesktop]}
    >
      <View style={[styles.bar, desktop && styles.barDesktop]}>
        {items.map((item) => {
          const active = selected === item.key;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="button"
              accessibilityLabel={`${item.label}。もう一度すばやく押すと最初の画面へ戻ります`}
              accessibilityState={{ selected: active }}
              onPress={() => navigate(item)}
              style={({ pressed }) => [
                styles.item,
                desktop && styles.itemDesktop,
                pressed && styles.pressed,
              ]}
            >
              {active && (
                <View
                  style={[
                    styles.activeIndicator,
                    desktop && styles.activeIndicatorDesktop,
                  ]}
                />
              )}
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
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  bar: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    height: 70,
    flexDirection: 'row',
    backgroundColor: colors.navInk,
    borderTopWidth: 1,
    borderColor: '#4B4840',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000000',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 8,
  },
  safeAreaDesktop: {
    width: 92,
    height: '100%',
    backgroundColor: colors.navInk,
    borderRightWidth: 1,
    borderRightColor: '#4B4840',
  },
  barDesktop: {
    width: 92,
    maxWidth: 92,
    height: '100%',
    flexDirection: 'column',
    borderWidth: 0,
    borderRadius: 0,
    shadowOpacity: 0,
    elevation: 0,
    paddingVertical: 20,
  },
  item: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemDesktop: {
    flex: 0,
    width: 92,
    minHeight: 84,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 6,
    width: 38,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.goldLight,
  },
  activeIndicatorDesktop: {
    left: 0,
    bottom: 'auto',
    width: 4,
    height: 38,
    borderTopRightRadius: 4,
    borderBottomRightRadius: 4,
  },
  pressed: { opacity: 0.65 },
  mark: {
    color: '#D7D3CA',
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 25,
    fontWeight: '700',
  },
  markActive: { color: colors.goldLight, fontSize: 22 },
  label: { color: '#D7D3CA', fontSize: 11, lineHeight: 15, fontWeight: '600' },
  labelActive: { color: colors.goldLight },
});
