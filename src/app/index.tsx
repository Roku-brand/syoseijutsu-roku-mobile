import { Redirect } from 'expo-router';
import { useAppState } from '@/state/app-state';
import { useAccess } from '@/access/access-state';
export default function IndexScreen() {
  const { hydrated, onboardingCompleted } = useAppState();
  const { accessState } = useAccess();
  // Local preferences are allowed a short bounded hydration window.  Access
  // verification intentionally does not gate this route.
  // Never leave the root route blank while local preferences are restored.
  // Existing users are redirected on as soon as hydration completes; new or
  // storage-blocked visitors can use the welcome screen immediately.
  if (!hydrated) return <Redirect href="/welcome" />;
  if (accessState === 'paid') return <Redirect href="/(tabs)" />;
  return <Redirect href={onboardingCompleted ? '/(tabs)' : '/welcome'} />;
}
