import { Redirect } from 'expo-router';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
export default function IndexScreen() {
  const { hydrated, onboardingCompleted } = useAppState();
  const { accessState } = useAccess();
  // Local preferences are allowed a short bounded hydration window.  Access
  // verification intentionally does not gate this route.
  if (!hydrated) return null;
  if (accessState === 'paid') return <Redirect href="/(tabs)" />;
  return <Redirect href={onboardingCompleted ? '/(tabs)' : '/welcome'} />;
}
