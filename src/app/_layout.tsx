import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BookHeader } from '@/components/book-ui';
import { colors } from '@/constants/theme';
import { PersistentBottomNav } from '@/components/persistent-bottom-nav';
import { AppStateProvider } from '@/state/app-state';
import { AppToastProvider } from '@/components/app-toast';

export default function RootLayout() {
  const { width } = useWindowDimensions();
  const desktop = width >= 1000;

  const appContent = (
    <View style={styles.contentColumn}>
      <SafeAreaView
        edges={['top', 'left', 'right']}
        style={styles.headerSafeArea}
      >
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
      <AppStateProvider>
        <AppToastProvider>
          <View style={styles.container}>
            <StatusBar style="light" />
            {desktop ? (
              <View style={styles.desktopFrame}>
                <PersistentBottomNav />
                {appContent}
              </View>
            ) : (
              appContent
            )}
          </View>
        </AppToastProvider>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  desktopFrame: { flex: 1, flexDirection: 'row' },
  contentColumn: { flex: 1, minWidth: 0 },
  headerSafeArea: { backgroundColor: colors.charcoal },
});
