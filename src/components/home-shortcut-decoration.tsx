import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const ridges = [
  'M0 23 15 15 28 21 45 7 62 18 79 12 101 23 120 17V48H0Z',
  'M0 25 18 20 40 10 58 18 73 5 92 21 107 17 120 25V48H0Z',
  'M0 27 21 20 34 23 55 10 72 19 94 7 120 21V48H0Z',
  'M0 22 20 29 42 20 67 5 87 22 102 16 120 25V48H0Z',
];
const sources = ridges.map(ridge => ({ uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 48"><defs><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#C5A776" stop-opacity=".75"/><stop offset="1" stop-color="#EFE2CD" stop-opacity=".12"/></linearGradient></defs><path d="${ridge}" fill="url(#mist)"/><path d="M0 35 24 29 39 34 62 23 83 34 106 27 120 33V48H0Z" fill="#DAC6A2" opacity=".3"/></svg>`)}` }));

export function HomeShortcutDecoration({ variant }: { variant: number }) {
  return <Image source={sources[variant]} contentFit="fill" pointerEvents="none" accessible={false} accessibilityElementsHidden style={styles.motif} />;
}
const styles = StyleSheet.create({ motif: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 27, opacity: .55 } });
