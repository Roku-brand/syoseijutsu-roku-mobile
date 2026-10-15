import { Platform } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';
import MainScreen from './(tabs)/index';
import UpgradeScreen from './upgrade';

export default function IndexScreen() {
  const params = useLocalSearchParams<{ checkout?: string | string[] }>();

  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
  if (checkout === 'success' || checkout === 'cancelled') {
    // Keep the browser on the always-valid Pages root URL. Rendering the
    // purchase screen here avoids a reloadable `/upgrade` URL without `.html`.
    return <UpgradeScreen />;
  }

  // Keep native home in the same navigator as the other tabs.
  if (Platform.OS !== 'web') return <Redirect href="/(tabs)" />;

  // The root index and the tabs index both map to `/` on static Web builds.
  // Rendering the selected entry directly avoids relying on a same-URL route
  // group redirect, which can leave only the shared application chrome.
  return <MainScreen />;
}
