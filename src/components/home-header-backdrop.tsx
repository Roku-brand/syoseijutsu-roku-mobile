import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

export const HOME_HEADER_COLOR = '#F7F0E4';

// Fit the low ridges to the full header, including when the top inset is zero.
const landscape = {
  uri: `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="720" height="72" viewBox="0 0 720 72" preserveAspectRatio="none">
      <defs>
        <linearGradient id="mist" x2="0" y2="1">
          <stop stop-color="#C5BAA8" stop-opacity=".32"/>
          <stop offset="1" stop-color="#DBCFBB" stop-opacity=".08"/>
        </linearGradient>
        <linearGradient id="fade">
          <stop offset=".2" stop-color="white" stop-opacity="0"/>
          <stop offset=".6" stop-color="white"/>
        </linearGradient>
        <mask id="right"><rect width="720" height="72" fill="url(#fade)"/></mask>
      </defs>
      <g mask="url(#right)">
        <path fill="url(#mist)" d="M140 72 236 56 281 61 326 47 354 52 410 33 442 43 474 36 518 16 554 29 587 22 632 38 674 27 720 40V72Z"/>
        <path fill="#BCAF99" opacity=".16" d="M210 72 300 59 340 64 393 50 428 57 465 47 501 54 549 37 584 45 623 39 670 52 720 44V72Z"/>
        <path fill="#AA9C84" opacity=".12" d="M300 72 382 62 418 66 464 56 499 60 543 51 582 59 626 48 664 56 720 51V72Z"/>
      </g>
    </svg>
  `.trim())}`,
};

export function HomeHeaderBackdrop() {
  return <View pointerEvents="none" aria-hidden accessibilityElementsHidden style={StyleSheet.absoluteFill} testID="home-header-landscape"><Image source={landscape} contentFit="fill" contentPosition="right bottom" style={StyleSheet.absoluteFill} /></View>;
}
