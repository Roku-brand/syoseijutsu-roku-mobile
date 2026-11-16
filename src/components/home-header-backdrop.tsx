import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export const HOME_HEADER_COLOR = '#F7F0E4';

const landscape = { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 180" preserveAspectRatio="xMaxYMax slice"><defs><linearGradient id="mist" x2="0" y2="1"><stop stop-color="#C5BAA8" stop-opacity=".32"/><stop offset="1" stop-color="#DBCFBB" stop-opacity=".08"/></linearGradient><linearGradient id="fade"><stop offset=".2" stop-color="white" stop-opacity="0"/><stop offset=".6" stop-color="white"/></linearGradient><mask id="right"><rect width="720" height="180" fill="url(#fade)"/></mask></defs><g mask="url(#right)"><path fill="url(#mist)" d="M140 180 240 131 282 140 323 104 352 116 409 65 438 83 466 69 516 30 554 52 589 41 636 67 674 55 720 79V180Z"/><path fill="#BCAF99" opacity=".16" d="M210 180 306 142 340 150 396 112 424 126 465 103 503 125 548 87 585 110 625 92 677 119 720 95V180Z"/><path fill="#AA9C84" opacity=".12" d="M300 180 384 154 416 161 465 132 494 143 541 121 581 144 625 120 666 141 720 118V180Z"/></g></svg>`)}` };

export function HomeHeaderBackdrop() {
  return <View pointerEvents="none" aria-hidden accessibilityElementsHidden style={StyleSheet.absoluteFill} testID="home-header-landscape"><Image source={landscape} contentFit="cover" contentPosition="right bottom" style={StyleSheet.absoluteFill} /></View>;
}
