import { Redirect } from 'expo-router';

/** Legacy URL kept as a redirect; the previous screen implementation lives in src/screens/welcome-screen.tsx. */
export default function LegacyWelcomeRedirect() {
  return <Redirect href="/" />;
}
