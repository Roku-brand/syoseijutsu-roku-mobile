import 'react-native-gesture-handler';
import { Stack, usePathname } from 'expo-router';
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
import { useAccess } from '@/access/access-state';

function AppFrame() {
  const pathname = usePathname();
  const { width } = useHydratedWindowDimensions();
  const { hydrated, onboardingCompleted } = useAppState();
  const { isPaid } = useAccess();
  const desktop = width >= 1000;
  // `/onboarding` is retained only for existing links.  While its redirect
  // resolves, it must not show the regular application chrome.
  const isRootWelcome = pathname === '/' && (!hydrated || (!onboardingCompleted && !isPaid));
  const isWelcome = pathname === '/welcome' || pathname === '/onboarding' || isRootWelcome;
  const appContent = (
    <View style={styles.contentColumn}>
      {!isWelcome ? <SafeAreaView edges={['top', 'left', 'right']} style={styles.headerSafeArea}><BookHeader /></SafeAreaView> : null}
      <View style={styles.navigator}>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.paper }, animation: 'slide_from_right', gestureEnabled: true, fullScreenGestureEnabled: true }} />
      </View>
      {!isWelcome && !desktop ? <PersistentBottomNav /> : null}
    </View>
  );
  return <View style={styles.container}><StatusBar style="dark" />{desktop && !isWelcome ? <View style={styles.desktopFrame}><PersistentBottomNav />{appContent}</View> : appContent}</View>;
}

export default function RootLayout() {
  return <SafeAreaProvider><AuthProvider><AccessProvider><AccessBoundary><AppStateProvider><AppToastProvider><AppFrame /></AppToastProvider></AppStateProvider></AccessBoundary></AccessProvider></AuthProvider></SafeAreaProvider>;
}
const styles = StyleSheet.create({
  container: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  desktopFrame: { flex: 1, minHeight: 0, flexDirection: 'row' },
  contentColumn: { flex: 1, minWidth: 0, minHeight: 0 },
  navigator: { flex: 1, minHeight: 0 },
  headerSafeArea: { flexShrink: 0, backgroundColor: colors.surface },
});
