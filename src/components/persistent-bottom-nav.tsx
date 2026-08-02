import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AppText } from './ui';

const items = [
  { key: 'main', label: '禄', icon: 'roku', href: '/(tabs)' },
  { key: 'discover', label: '探す', icon: 'search', href: '/discover' },
  { key: 'learn', label: '学習', icon: 'book', href: '/learn' },
  { key: 'my-os', label: 'マイOS', icon: 'circle', href: '/my-os' },
] as const;

function activeKey(pathname: string) {
  if (
    pathname.includes('/discover') ||
    pathname.includes('/catalog') ||
    pathname.includes('/category/') ||
    pathname.includes('/subcategory/') ||
    pathname.includes('/topic/') ||
    pathname.includes('/theory/') ||
    pathname.includes('/theories/')
  ) return 'discover';
  if (pathname.includes('/learn')) return 'learn';
  if (
    pathname.includes('/my-os') ||
    pathname.includes('/collection/') ||
    pathname.includes('/library')
  ) return 'my-os';
  return 'main';
}

export function PersistentBottomNav() {
  const { width } = useHydratedWindowDimensions();
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
    if (isDoubleTap) return router.replace(item.href as never);
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
              {active ? (
                <View style={[styles.activeIndicator, desktop && styles.activeIndicatorDesktop]} />
              ) : null}
              <NavIcon type={item.icon} active={active} />
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

function NavIcon({ type, active }: { type: (typeof items)[number]['icon']; active: boolean }) {
  const color = active ? colors.goldLight : '#D7D3CA';
  if (type === 'roku') return <AppText style={[styles.rokuMark, { color }]}>禄</AppText>;
  if (type === 'search') return <View style={styles.searchMark}><View style={[styles.searchCircle, { borderColor: color }]} /><View style={[styles.searchHandle, { backgroundColor: color }]} /></View>;
  if (type === 'book') return <View style={styles.bookMark}><View style={[styles.bookPage, styles.bookPageLeft, { backgroundColor: color }]} /><View style={[styles.bookPage, styles.bookPageRight, { backgroundColor: color }]} /></View>;
  return <View style={[styles.circleMark, { borderColor: color }]} />;
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.paper },
  bar: {
    width: '100%',
    maxWidth: 620,
    alignSelf: 'center',
    height: 92,
    flexDirection: 'row',
    backgroundColor: colors.navInk,
    borderTopWidth: 1,
    borderColor: '#4B4840',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    shadowColor: '#000',
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
    paddingVertical: 24,
  },
  item: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 5, paddingTop: 4 },
  itemDesktop: { flex: 0, width: 92, minHeight: 100 },
  activeIndicator: {
    position: 'absolute',
    bottom: 8,
    width: 54,
    height: 5,
    borderRadius: 5,
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
  rokuMark: { fontFamily: fonts.serif, fontSize: 31, lineHeight: 34, fontWeight: '700' },
  searchMark: { width: 31, height: 31, position: 'relative' },
  searchCircle: { position: 'absolute', top: 1, left: 1, width: 19, height: 19, borderWidth: 2.2, borderRadius: 12 },
  searchHandle: { position: 'absolute', width: 13, height: 2.2, borderRadius: 2, top: 21, left: 18, transform: [{ rotate: '-48deg' }] },
  bookMark: { width: 34, height: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bookPage: { width: 15, height: 24, borderRadius: 2 },
  bookPageLeft: { borderTopRightRadius: 7, borderBottomRightRadius: 3 },
  bookPageRight: { borderTopLeftRadius: 7, borderBottomLeftRadius: 3 },
  circleMark: { width: 29, height: 29, borderWidth: 1.8, borderRadius: 16 },
  label: { color: '#D7D3CA', fontFamily: fonts.serif, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  labelActive: { color: colors.goldLight },
});
