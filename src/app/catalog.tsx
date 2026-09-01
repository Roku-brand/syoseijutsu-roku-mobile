import { Redirect } from 'expo-router';

/** Compatibility redirect for the former catalog tab, now merged into Discover. */
export default function LegacyCatalogRedirect() {
  return <Redirect href="/discover" />;
}
