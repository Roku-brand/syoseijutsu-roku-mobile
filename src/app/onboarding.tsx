import { Redirect } from 'expo-router';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
import { LoadingScreen } from '@/components/loading-screen';

/** 旧URLの互換ルート。古いリンクも販売ファーストの導線へ統一する。 */
export default function OnboardingScreen() {
  const { hydrated, onboardingCompleted } = useAppState();
  const { accessState } = useAccess();

  if (!hydrated || accessState === 'checking') return <LoadingScreen />;
  if (accessState === 'paid' || onboardingCompleted) return <Redirect href="/(tabs)" />;
  return <Redirect href="/welcome" />;
}
