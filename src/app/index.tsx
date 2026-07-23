import { Redirect } from 'expo-router';
import { LoadingScreen } from '@/components/loading-screen';
import { useAppState } from '@/state/app-state';

export default function IndexScreen() {
  const { hydrated, onboardingCompleted } = useAppState();
  if (!hydrated) return <LoadingScreen />;
  return (
    <Redirect href={onboardingCompleted ? '/(tabs)' : '/onboarding'} />
  );
}
