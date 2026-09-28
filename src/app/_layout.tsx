import 'react-native-gesture-handler';
import '@/lib/pwa-install';
import { Stack, useGlobalSearchParams, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View } from 'react-native';
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
import { SeoMeta } from '@/components/seo-meta';
import { RouteTransition } from '@/components/route-transition';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { motion } from '@/constants/motion';

function AppFrame() {
  const reducedMotion = useReducedMotion();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ checkout?: string | string[] }>();
  const { width } = useHydratedWindowDimensions();
  const desktop = width >= 1000;
  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
  const isCheckoutReturn = pathname === '/' && (checkout === 'success' || checkout === 'cancelled');
  // Legacy entry URLs redirect to the home screen without flashing app chrome.
  const isWelcome = pathname === '/welcome' || pathname === '/onboarding';
  // Purchase and settings-detail screens are focused tasks.  Keeping the
  // global navigation there wastes the limited mobile viewport and can cover
  // the purchase CTA at the bottom of the page.
  const showPersistentNavigation = !isWelcome && !isCheckoutReturn && !isFocusedScreen(pathname);
  const appContent = (
    <View style={styles.contentColumn}>
      {!isWelcome ? <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}><BookHeader /></SafeAreaView> : null}
      <RouteTransition disabled={isWelcome}>
        <Stack screenOptions={({ route }) => ({
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: Platform.OS === 'web' || reducedMotion ? 'none' : route.name === 'upgrade' ? 'slide_from_bottom' : 'slide_from_right',
          animationDuration: motion.detailDuration,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        })} />
      </RouteTransition>
      {showPersistentNavigation && !desktop ? <PersistentBottomNav /> : null}
    </View>
  );
  return <View style={styles.container}><StatusBar style="dark" />{desktop ? <View style={styles.desktopFrame}>{showPersistentNavigation ? <PersistentBottomNav /> : null}{appContent}</View> : appContent}</View>;
}

function isFocusedScreen(pathname: string) {
  return pathname === '/upgrade'
    || pathname === '/auth'
    || pathname.startsWith('/legal/')
    || pathname.startsWith('/about/');
}

export default function RootLayout() {
  return <SafeAreaProvider><SeoMeta /><AuthProvider><AppStateProvider><AccessProvider><AccessBoundary><AppToastProvider><AppFrame /></AppToastProvider></AccessBoundary></AccessProvider></AppStateProvider></AuthProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  desktopFrame: { flex: 1, minHeight: 0, flexDirection: 'row' },
  contentColumn: { flex: 1, minWidth: 0, minHeight: 0 },
  headerSafeArea: { flexShrink: 0, backgroundColor: colors.surface },
});
