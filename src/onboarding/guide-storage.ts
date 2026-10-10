import AsyncStorage from '@react-native-async-storage/async-storage';

// Installation-local storage, deliberately separate from account/profile data,
// SecureStore/Keychain and the personal-data reset. Uninstall removes this marker.
export const WELCOME_GUIDE_KEY = '@shoseijutsu-roku/installation-welcome/v1';
export const COMPLETE_GUIDE_KEY = '@shoseijutsu-roku/purchase-guide/v1';

export async function readGuideMarker(key: string): Promise<string | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      AsyncStorage.getItem(key).catch(() => null),
      new Promise<null>((resolve) => { timer = setTimeout(() => resolve(null), 1500); }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export function writeGuideMarker(key: string, value: string) {
  // A storage failure must never prevent dismissal or entry into the app.
  void AsyncStorage.setItem(key, value).catch(() => undefined);
}
