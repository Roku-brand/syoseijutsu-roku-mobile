import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

const motifs = [
  '<g fill="none" stroke="#C9AD77" stroke-width="1"><path d="M-16 42a24 24 0 0 1 48 0m-42 0a18 18 0 0 1 36 0m-30 0a12 12 0 0 1 24 0M20 48a24 24 0 0 1 48 0m-42 0a18 18 0 0 1 36 0m-30 0a12 12 0 0 1 24 0M-4 22a24 24 0 0 1 48 0m-42 0a18 18 0 0 1 36 0m-30 0a12 12 0 0 1 24 0"/></g>',
  '<g fill="none" stroke="#C9AD77" stroke-width="1.2"><path d="m57 45 14-35m-5 15 18-9m-21 16-9-13m24 30 8-29"/><path d="M70 21q16-15 18-11-3 8-18 11M65 29q-15-14-16-9 4 8 16 9M83 33q12-9 14-5-5 7-14 5"/></g>',
  '<g fill="none" stroke="#C9AD77"><path d="M120 18C75 7 40 25 77 28S65 42 10 45" stroke-width="3"/><path d="M120 13C73 5 20 25 58 30S49 40 0 41M120 24C89 15 57 24 89 28s-1 19-50 19" stroke-width="1"/></g>',
  '<path d="m0 46 25-17 9 5L64 9l17 16 8-4 31 25" fill="#C9AD77" opacity=".45"/><g fill="none" stroke="#C9AD77" stroke-width=".7"><path d="m19 46 45-37-20 37m20-37 8 37m-8-37 29 37M0 46h120"/></g>',
];
const sources = motifs.map(motif => ({ uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 48">${motif}</svg>`)}` }));

export function HomeShortcutDecoration({ variant }: { variant: number }) {
  return <Image source={sources[variant]} contentFit="fill" pointerEvents="none" accessible={false} accessibilityElementsHidden style={styles.motif} />;
}
const styles = StyleSheet.create({ motif: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 32, opacity: .35 } });
