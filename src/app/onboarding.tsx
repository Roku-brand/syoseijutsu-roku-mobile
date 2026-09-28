import { Redirect } from 'expo-router';
/** Compatibility route for links created before onboarding was retired. */
export default function LegacyOnboardingRedirect() {
  return <Redirect href="/" />;
}
