import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import MainScreen from './(tabs)/index';
import WelcomeScreen from './welcome';

export default function IndexScreen() {
  const { hydrated, onboardingCompleted } = useAppState();
  const { accessState } = useAccess();

  // The root index and the tabs index both map to `/` on static Web builds.
  // Rendering the selected entry directly avoids relying on a same-URL route
  // group redirect, which can leave only the shared application chrome.
  if (!hydrated || (accessState !== 'paid' && !onboardingCompleted)) {
    return <WelcomeScreen />;
  }
  return <MainScreen />;
}
