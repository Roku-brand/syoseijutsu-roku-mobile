import { useLocalSearchParams } from 'expo-router';
import UpgradeScreen from './upgrade';
import MainScreen from './(tabs)/index';

/** Native users enter the library immediately.  The marketing welcome page
 * remains the Web/PWA entry point. */
export default function NativeIndexScreen() {
  const params = useLocalSearchParams<{ checkout?: string | string[] }>();
  const checkout = Array.isArray(params.checkout) ? params.checkout[0] : params.checkout;
  if (checkout === 'success' || checkout === 'cancelled') return <UpgradeScreen />;
  // The root and tab-home share the same URL in the Web export. Rendering the
  // existing home screen directly is also safer during native cold starts than
  // redirecting through the route group.
  return <MainScreen />;
}
