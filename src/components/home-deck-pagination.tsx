import { memo } from 'react';
import { Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { colors } from '@/constants/theme';
import { HOME_DECK_SIZE } from '@/data/deck-motion';
import { DiscoveryControlIcon } from './discovery-control-icon';

const webTouch = Platform.OS === 'web' ? { WebkitTapHighlightColor: 'transparent' } as ViewStyle : {};

/** Compositor progress and animation locks never change this persistent UI.
 * Requests made while cards settle are queued by the deck, not disabled here. */
export const HomeDeckPagination = memo(function HomeDeckPagination({ cursor, unavailable, onMove }: {
  cursor: number; unavailable: boolean; onMove: (step: number) => void;
}) {
  return <View testID="home-deck-controls" style={styles.controls}>
    {[-1, 0, 1].map(step => step === 0 ? <View key="position" style={styles.position} accessibilityLiveRegion="polite">
      <Text testID="home-deck-position" style={styles.number}>{String(cursor + 1).padStart(2, '0')}<Text style={styles.total}> / {String(HOME_DECK_SIZE).padStart(2, '0')}</Text></Text>
      <View testID="home-deck-indicators" style={styles.marks} accessible={false}>{Array.from({ length: HOME_DECK_SIZE }, (_, index) => <View key={index} testID={index === cursor ? 'home-deck-active-indicator' : undefined} style={[styles.mark, index === cursor && styles.active]} />)}</View>
    </View> : <Pressable key={step} testID={step < 0 ? 'home-deck-previous' : 'home-deck-next'} accessibilityRole="button" accessibilityLabel={step < 0 ? '前のカード' : '次のカード'} disabled={unavailable} accessibilityState={{ disabled: unavailable }} onPress={() => onMove(step)}
      style={({ pressed }) => [styles.arrow, webTouch, unavailable && styles.unavailable, pressed && styles.pressed]}>
      <DiscoveryControlIcon name={step < 0 ? 'previous' : 'next'} color={colors.goldDeep} size={21} />
    </Pressable>)}
  </View>;
});

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24, paddingVertical: 5 },
  arrow: { width: 44, height: 44, borderRadius: 24, borderWidth: 1, borderColor: '#DED3C0', backgroundColor: '#FFFCF6', alignItems: 'center', justifyContent: 'center', shadowColor: '#493A25', shadowOpacity: .07, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, elevation: 1 },
  pressed: { backgroundColor: '#F2E7D2', borderColor: '#B4904F' }, unavailable: { opacity: .4 },
  position: { width: 120, alignItems: 'center', gap: 7 }, number: { fontSize: 13, lineHeight: 19, letterSpacing: .7, color: colors.goldDeep, fontVariant: ['tabular-nums'] }, total: { color: colors.inkSoft },
  marks: { flexDirection: 'row', gap: 5, height: 4 }, mark: { height: 4, width: 12, borderRadius: 3, backgroundColor: '#E2DBD0' }, active: { backgroundColor: colors.gold },
});
