import { SymbolView } from 'expo-symbols';
import { useGlobalSearchParams, usePathname, useRouter, type Href } from 'expo-router';
import { useRef } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { APP_ROUTES, getMainSection, type MainSection } from '@/navigation/app-routes';
import { AppText } from './ui';

const items = [
  { key: 'main', label: 'ホーム', icon: 'home', href: APP_ROUTES.home },
  { key: 'discover', label: '探す', icon: 'compass', href: APP_ROUTES.discover },
  { key: 'learn', label: '学ぶ', icon: 'book', href: APP_ROUTES.learn },
  { key: 'my-os', label: 'マイページ', icon: 'person', href: APP_ROUTES.myPage },
] as const satisfies ReadonlyArray<{
  key: MainSection;
  label: string;
  icon: 'home' | 'compass' | 'book' | 'person';
  href: Href;
}>;

export function PersistentBottomNav() {
  const { desktop, bottomNavHeight } = useResponsiveLayout();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ checkout?: string | string[] }>();
  const router = useRouter();
  const lastTap = useRef<Record<string, number>>({});
  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;

  if (pathname === '/welcome' || pathname === '/onboarding' || (pathname === '/' && (checkout === 'success' || checkout === 'cancelled'))) return null;
  const selected = getMainSection(pathname);

  const navigate = (item: (typeof items)[number]) => {
    const now = Date.now();
    const isCurrent = selected === item.key && (item.key === 'main' ? pathname === '/' : pathname === item.href);
    const isDoubleTap = isCurrent && now - (lastTap.current[item.key] ?? 0) < 320;
    lastTap.current[item.key] = now;
    if (isDoubleTap) return router.replace(item.href);
    if (!isCurrent) router.replace(item.href);
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
                accessibilityRole="link"
                accessibilityLabel={`${item.label}。もう一度すばやく押すと最初の画面へ戻ります`}
                accessibilityState={{ selected: active }}
                onPress={() => navigate(item)}
                style={desktop ? styles.itemDesktop : styles.item}
              >
                {active ? <View style={[styles.activeIndicator, desktop && styles.activeIndicatorDesktop]} /> : null}
                <NavIcon type={item.icon} active={active} />
                <AppText variant="caption" style={[styles.label, active && styles.labelActive]}>{item.label}</AppText>
            </Pressable>
          );
        })}
      </View>
    </SafeAreaView>
  );
}

function NavIcon({ type, active }: { type: (typeof items)[number]['icon']; active: boolean }) {
  const color = active ? colors.gold : '#44423E';
  if (type === 'home') return Platform.OS === 'ios'
    ? <SymbolView name="house.fill" size={25} tintColor={color} weight="regular" />
    : <View style={styles.homeMark}><View style={[styles.homeRoof, { backgroundColor: color }]} /><View style={[styles.homeBody, { backgroundColor: color }]} /><View style={styles.homeDoor} /></View>;
  if (type === 'compass') return Platform.OS === 'ios'
    ? <SymbolView name="safari" size={25} tintColor={color} weight="regular" />
    : <View style={[styles.compassMark, { borderColor: color }]}><View style={[styles.compassNeedleNorth, { borderBottomColor: color }]} /><View style={[styles.compassNeedleSouth, { borderTopColor: color }]} /></View>;
  if (type === 'book') return <View style={styles.bookMark}><View style={[styles.bookPage, styles.bookPageLeft, { backgroundColor: color }]} /><View style={[styles.bookPage, styles.bookPageRight, { backgroundColor: color }]} /></View>;
  return <View style={styles.personMark}><View style={[styles.personHead, { backgroundColor: color }]} /><View style={[styles.personShoulders, { backgroundColor: color }]} /></View>;
}

const styles = StyleSheet.create({
  // ナビ本体と安全領域を同じ面として扱う。PWA では下端の安全領域が
  // 空白に見えないよう、バーを画面幅・物理下端まで連続させる。
  safeArea: { width: '100%', minWidth: 0, flexShrink: 0, backgroundColor: colors.surface },
  bar: {
    width: '100%',
    maxWidth: '100%',
    minWidth: 0,
    alignSelf: 'stretch',
    height: 58,
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
    width: 114,
    minWidth: 114,
    maxWidth: 114,
    flexBasis: 114,
    flexGrow: 0,
    flexShrink: 0,
    height: '100%',
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderRightColor: colors.line,
  },
  barDesktop: {
    width: 114,
    minWidth: 114,
    maxWidth: 114,
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
  item: { flex: 1, position: 'relative', alignItems: 'center', justifyContent: 'center', gap: 1 },
  itemDesktop: { flex: 0, position: 'relative', width: 114, minWidth: 114, maxWidth: 114, minHeight: 100, alignItems: 'center', justifyContent: 'center', gap: 1 },
  activeIndicator: {
    position: 'absolute',
    bottom: 2,
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
  homeMark: { width: 25, height: 25, position: 'relative' },
  homeRoof: { position: 'absolute', top: 4, left: 5, width: 15, height: 15, borderTopLeftRadius: 2, transform: [{ rotate: '45deg' }] },
  homeBody: { position: 'absolute', bottom: 2, left: 4, width: 17, height: 13, borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  homeDoor: { position: 'absolute', bottom: 2, left: 10, width: 5, height: 8, borderTopLeftRadius: 2, borderTopRightRadius: 2, backgroundColor: colors.surface },
  compassMark: { width: 24, height: 24, borderWidth: 1.7, borderRadius: 12, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  compassNeedleNorth: { position: 'absolute', top: 3, left: 8, width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderBottomWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', transform: [{ rotate: '42deg' }] },
  compassNeedleSouth: { position: 'absolute', bottom: 3, right: 8, width: 0, height: 0, borderLeftWidth: 3, borderRightWidth: 3, borderTopWidth: 9, borderLeftColor: 'transparent', borderRightColor: 'transparent', transform: [{ rotate: '42deg' }] },
  // 虫眼鏡の柄は、画面倍率に関係なく円と接続して描画する。
  searchMark: { width: 24, height: 24, position: 'relative' },
  searchCircle: { position: 'absolute', top: 2, left: 2, width: 14, height: 14, borderWidth: 1.8, borderRadius: 9 },
  searchHandle: { position: 'absolute', width: 10, height: 2, borderRadius: 2, top: 15, left: 14, transform: [{ rotate: '45deg' }] },
  bookMark: { width: 25, height: 21, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2 },
  bookPage: { width: 11, height: 18, borderRadius: 2 },
  bookPageLeft: { borderTopRightRadius: 5, borderBottomRightRadius: 2 },
  bookPageRight: { borderTopLeftRadius: 5, borderBottomLeftRadius: 2 },
  personMark: { width: 24, height: 24, alignItems: 'center', justifyContent: 'flex-end', overflow: 'hidden' },
  personHead: { width: 8, height: 8, borderRadius: 4, marginBottom: 2 },
  personShoulders: { width: 20, height: 10, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  label: { color: '#44423E', fontSize: 10, lineHeight: 14, fontWeight: '600' },
  labelActive: { color: colors.goldDeep },
});
