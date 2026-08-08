import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/loading-screen';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
export default function IndexScreen() {
  const { hydrated, onboardingCompleted } = useAppState();
  const { accessState } = useAccess();
  if (!hydrated || accessState === 'checking') return <LoadingScreen />;
  if (accessState === 'paid') return <Redirect href="/(tabs)" />;
  return <Redirect href={onboardingCompleted ? '/(tabs)' : '/welcome'} />;
}