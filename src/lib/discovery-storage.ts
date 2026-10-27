import AsyncStorage from '@react-native-async-storage/async-storage';

const PREFIX = '@shoseijutsu-roku/discovery-deck/v1/';
let writes = Promise.resolve();
let generation = 0;
const resets = new Set<() => void>();

export function readDiscoveryState(scope: string) {
  return writes.then(() => new Promise<string | null>(resolve => {
    const timer = setTimeout(() => resolve(null), 900);
    void AsyncStorage.getItem(PREFIX + scope).then(value => { clearTimeout(timer); resolve(value); }, () => { clearTimeout(timer); resolve(null); });
  }));
}
export function writeDiscoveryState(scope: string, value: unknown) {
  const version = generation;
  const json = JSON.stringify(value);
  writes = writes.then(() => version === generation ? AsyncStorage.setItem(PREFIX + scope, json) : undefined).catch(() => undefined);
}
export function onDiscoveryReset(listener: () => void) {
  resets.add(listener);
  return () => { resets.delete(listener); };
}
/** Clear pending old impressions as part of the existing personal-data reset. */
export function clearDiscoveryState() {
  generation++;
  const reset = writes.then(() => AsyncStorage.multiRemove([PREFIX + 'free', PREFIX + 'paid']));
  writes = reset.catch(() => undefined);
  return reset.then(() => resets.forEach(listener => listener()));
}
