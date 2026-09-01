import { Redirect } from 'expo-router';
/** Compatibility route for links created before the welcome-page redesign. */
export default function LegacyOnboardingRedirect() {
  return <Redirect href="/welcome" />;
}
