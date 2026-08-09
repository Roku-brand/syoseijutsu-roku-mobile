import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';
import { useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { AppText } from './ui';

const items = [
  { key: 'main', label: 'ホーム', icon: 'roku', href: '/(tabs)' },
  { key: 'discover', label: '探す', icon: 'search', href: '/discover' },
  { key: 'learn', label: '学ぶ', icon: 'book', href: '/learn' },
  { key: 'my-os', label: 'マイページ', icon: 'circle', href: '/my-os' },
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
  const { desktop, bottomNavHeight } = useResponsiveLayout();
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
      testID="persistent-bottom-navigation"
      edges={desktop ? ['top', 'bottom', 'left'] : ['bottom', 'left', 'right']}
      style={[styles.safeArea, desktop && styles.safeAreaDesktop]}
    >
      <View style={[styles.bar, !desktop && { height: bottomNavHeight }, desktop && styles.barDesktop]}>
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
  const color = active ? colors.gold : '#44423E';
  if (type === 'roku') return <AppText style={[styles.rokuMark, { color }]}>禄</AppText>;
  if (type === 'search') return <View style={styles.searchMark}><View style={[styles.searchCircle, { borderColor: color }]} /><View style={[styles.searchHandle, { backgroundColor: color }]} /></View>;
  if (type === 'book') return <View style={styles.bookMark}><View style={[styles.bookPage, styles.bookPageLeft, { backgroundColor: color }]} /><View style={[styles.bookPage, styles.bookPageRight, { backgroundColor: color }]} /></View>;
  return <View style={[styles.circleMark, { borderColor: color }]} />;
}

const styles = StyleSheet.create({
  // ナビ本体と安全領域を同じ面として扱う。PWA では下端の安全領域が
  // 空白に見えないよう、バーを画面幅・物理下端まで連続させる。
  safeArea: { flexShrink: 0, backgroundColor: colors.surface },
  bar: {
    maxWidth: 620,
    alignSelf: 'stretch',
    height: 70,
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 0,
    marginHorizontal: 0,
    marginTop: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  safeAreaDesktop: {
    width: 92,
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.line,
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
    marginHorizontal: 0,
    marginTop: 0,
  },
  item: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemDesktop: { flex: 0, width: 92, minHeight: 100 },
  activeIndicator: {
    position: 'absolute',
    bottom: 5,
    width: 28,
    height: 3,
    borderRadius: 3,
    backgroundColor: colors.gold,
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
  rokuMark: { fontFamily: fonts.serif, fontSize: 22, lineHeight: 25, fontWeight: '700' },
  // 虫眼鏡の柄は、画面倍率に関係なく円と接続して描画する。
  searchMark: { width: 24, height: 24, position: 'relative' },
  searchCircle: { position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderWidth: 1.8, borderRadius: 9 },
  searchHandle: { position: 'absolute', width: 10, height: 2, borderRadius: 2, top: 15, left: 14, transform: [{ rotate: '45deg' }] },
  bookMark: { width: 25, height: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bookPage: { width: 11, height: 18, borderRadius: 2 },
  bookPageLeft: { borderTopRightRadius: 5, borderBottomRightRadius: 2 },
  bookPageRight: { borderTopLeftRadius: 5, borderBottomLeftRadius: 2 },
  circleMark: { width: 21, height: 21, borderWidth: 1.5, borderRadius: 12 },
  label: { color: '#44423E', fontSize: 10, lineHeight: 15, fontWeight: '600' },
  labelActive: { color: colors.gold },
});
