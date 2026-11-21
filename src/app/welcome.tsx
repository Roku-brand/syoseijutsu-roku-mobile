import { Redirect } from 'expo-router';

/** Compatibility entry for older links. The installation guide is opened from home. */
export default function LegacyWelcomeRedirect() {
  return <Redirect href="/" />;
}
