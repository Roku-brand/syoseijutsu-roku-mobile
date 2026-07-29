import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BookHeader } from '@/components/book-ui';
import { colors } from '@/constants/theme';
import { PersistentBottomNav } from '@/components/persistent-bottom-nav';
import { AppStateProvider } from '@/state/app-state';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <View style={styles.container}>
          <StatusBar style="light" />
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
              animation: 'fade_from_bottom',
            }}
          />
          <PersistentBottomNav />
        </View>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.paper },
  headerSafeArea: { backgroundColor: colors.charcoal },
});
