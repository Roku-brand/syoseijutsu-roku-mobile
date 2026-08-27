import 'react-native-gesture-handler';
import '@/lib/pwa-install';
import { Stack, useLocalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BookHeader } from '@/components/book-ui';
import { colors } from '@/constants/theme';
import { PersistentBottomNav } from '@/components/persistent-bottom-nav';
import { AppStateProvider } from '@/state/app-state';
import { AppToastProvider } from '@/components/app-toast';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { AccessProvider } from '@/access/access-state';
import { AccessBoundary } from '@/access/access-boundary';
import { AuthProvider } from '@/auth/auth-state';
import { useAppState } from '@/state/app-state';
import { SeoMeta } from '@/components/seo-meta';

function AppFrame() {
  const pathname = usePathname();
  const params = useLocalSearchParams<{ checkout?: string | string[] }>();
  const { width } = useHydratedWindowDimensions();
  const { hydrated, welcomePageHidden } = useAppState();
  const desktop = width >= 1000;
  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
  const isCheckoutReturn = pathname === '/' && (checkout === 'success' || checkout === 'cancelled');
  // `/onboarding` is retained only for existing links.  While its redirect
  // resolves, it must not show the regular application chrome.
  const isRootWelcome = pathname === '/' && !isCheckoutReturn && (!hydrated || !welcomePageHidden);
  const isWelcome = pathname === '/welcome' || pathname === '/onboarding' || isRootWelcome;
  // Purchase and settings-detail screens are focused tasks.  Keeping the
  // global navigation there wastes the limited mobile viewport and can cover
  // the purchase CTA at the bottom of the page.
  const showPersistentNavigation = !isWelcome && !isCheckoutReturn && !isFocusedScreen(pathname);
  const appContent = (
    <View style={styles.contentColumn}>
      {!isWelcome ? <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}><BookHeader /></SafeAreaView> : null}
      <View style={styles.navigator}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }} />
      </View>
      {showPersistentNavigation && !desktop ? <PersistentBottomNav /> : null}
    </View>
  );
  return <View style={styles.container}><StatusBar style="dark" />{desktop && showPersistentNavigation ? <View style={styles.desktopFrame}><PersistentBottomNav />{appContent}</View> : appContent}</View>;
}

function isFocusedScreen(pathname: string) {
  return pathname === '/upgrade'
    || pathname === '/auth'
    || pathname.startsWith('/legal/');
}

export default function RootLayout() {
  return <SafeAreaProvider><SeoMeta /><AuthProvider><AppStateProvider><AccessProvider><AccessBoundary><AppToastProvider><AppFrame /></AppToastProvider></AccessBoundary></AccessProvider></AppStateProvider></AuthProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  desktopFrame: { flex: 1, minHeight: 0, flexDirection: 'row' },
  contentColumn: { flex: 1, minWidth: 0, minHeight: 0 },
  navigator: { flex: 1, minHeight: 0 },
  headerSafeArea: { flexShrink: 0, backgroundColor: colors.surface },
});
