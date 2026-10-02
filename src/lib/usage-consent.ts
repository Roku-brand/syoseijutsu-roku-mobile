import AsyncStorage from '@react-native-async-storage/async-storage';

export const USAGE_CONSENT_KEY = '@shoseijutsu-roku/usage-consent/v1';
export const ANALYTICS_ACTOR_KEY = '@shoseijutsu-roku/analytics-actor/v1';

// Missing, malformed or inaccessible preferences never authorize transmission.
export async function isUsageSharingEnabled(): Promise<boolean> {
  try { return await AsyncStorage.getItem(USAGE_CONSENT_KEY) === 'enabled'; }
  catch { return false; }
}

export async function setUsageSharingEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(USAGE_CONSENT_KEY, enabled ? 'enabled' : 'disabled');
  if (!enabled) await AsyncStorage.removeItem(ANALYTICS_ACTOR_KEY);
}
