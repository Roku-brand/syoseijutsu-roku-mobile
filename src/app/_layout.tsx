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

export default function RootLayout() {
  const { width } = useHydratedWindowDimensions();
  const pathname = usePathname();
  const desktop = width >= 1000;
  const lightHeader = pathname === '/upgrade' || pathname.startsWith('/subcategory/');

  const appContent = (
    <View style={styles.contentColumn}>
      <SafeAreaView edges={['top', 'left', 'right']} style={[styles.headerSafeArea, lightHeader && styles.headerSafeAreaLight]}>
        <BookHeader />
      </SafeAreaView>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.paper },
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
      {!desktop ? <PersistentBottomNav /> : null}
    </View>
  );

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AccessProvider>
          <AccessBoundary>
            <AppStateProvider>
              <AppToastProvider>
                <View style={styles.container}>
                  <StatusBar style={lightHeader ? 'dark' : 'light'} />
                  {desktop ? (
                    <View style={styles.desktopFrame}>
                      <PersistentBottomNav />
                      {appContent}
                    </View>
                  ) : appContent}
                </View>
              </AppToastProvider>
            </AppStateProvider>
          </AccessBoundary>
        </AccessProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  desktopFrame: { flex: 1, flexDirection: 'row' },
  contentColumn: { flex: 1, minWidth: 0 },
  headerSafeArea: { backgroundColor: colors.charcoal },
  headerSafeAreaLight: { backgroundColor: colors.paper },
});
