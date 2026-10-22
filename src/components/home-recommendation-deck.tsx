import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { colors, fonts } from '../constants/theme';
import type { ReadingContent } from '../data/reading-recommendations';
import { useReducedMotion } from '../hooks/use-reduced-motion';

type Phase = 'idle' | 'collecting' | 'dealing';

export function HomeRecommendationDeck({ items, cardWidth, onRefresh, renderCard }: {
  items: readonly ReadingContent[];
  cardWidth: number;
  onRefresh: () => void;
  renderCard: (item: ReadingContent, disabled: boolean) => ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const rail = useRef<ScrollView>(null);
  const locked = useRef(false);
  const scrollOffset = useRef(0);
  const firstVisible = useRef(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [railWidth, setRailWidth] = useState(0);
  const [{ flip, travel, reveal }] = useState(() => ({
    flip: new Animated.Value(0),
    travel: new Animated.Value(0),
    reveal: new Animated.Value(0),
  }));
  const distance = Math.max(railWidth, cardWidth) + cardWidth;
  const busy = phase !== 'idle';

  useEffect(() => {
    if (phase === 'idle') return;
    const reset = () => {
      flip.setValue(0);
      travel.setValue(0);
      reveal.setValue(0);
      locked.current = false;
      setPhase('idle');
    };
    // A preference change during the exchange must also leave a usable deck.
    if (reducedMotion) {
      if (phase === 'collecting') onRefresh();
      rail.current?.scrollTo({ x: 0, animated: false });
      reset();
      return;
    }
    const timing = (value: Animated.Value, toValue: number, duration: number) =>
      Animated.timing(value, { toValue, duration, easing: Easing.inOut(Easing.cubic), useNativeDriver: Platform.OS !== 'web' });
    const animation = phase === 'collecting'
      ? Animated.sequence([timing(flip, 1, 350), timing(travel, -1, 375)])
      : Animated.sequence([timing(travel, 0, 415), timing(reveal, 1, 575)]);
    animation.start(({ finished }) => {
      if (!finished) return;
      if (phase === 'collecting') {
        // Change the contents and reset the scroll only while every card is offstage.
        onRefresh();
        rail.current?.scrollTo({ x: 0, animated: false });
        travel.setValue(1);
        setPhase('dealing');
      } else reset();
    });
    return () => animation.stop();
  }, [phase, reducedMotion, onRefresh, flip, travel, reveal]);

  const refresh = () => {
    if (locked.current) return;
    if (reducedMotion) {
      onRefresh();
      rail.current?.scrollTo({ x: 0, animated: false });
      return;
    }
    locked.current = true;
    firstVisible.current = Math.floor(scrollOffset.current / (cardWidth + 11));
    setPhase('collecting');
  };

  return <View testID="home-recommendation-deck" aria-busy={busy} accessibilityState={{ busy }}>
    <View style={styles.heading}>
      <Pressable testID="home-discovery-refresh" accessibilityRole="button" accessibilityLabel="別のおすすめに入れ替える" aria-busy={busy} accessibilityState={{ disabled: busy, busy }} disabled={busy} onPress={refresh} style={[styles.refresh, busy && styles.refreshBusy]}>
        <Text style={styles.refreshText}>別の出会い ↻</Text>
      </Pressable>
    </View>
    <ScrollView ref={rail} horizontal testID="home-recommendation-rail" accessibilityLabel="おすすめの処世術と理論" showsHorizontalScrollIndicator={false} scrollEnabled={!busy} onLayout={event => setRailWidth(event.nativeEvent.layout.width)} onScroll={event => { scrollOffset.current = event.nativeEvent.contentOffset.x; }} scrollEventThrottle={16} contentContainerStyle={styles.rail}>
      {items.map((item, index) => {
        // The cards currently in view lead the collection; the new deck starts at card one.
        const order = phase === 'collecting' ? Math.max(0, index - firstVisible.current) : index;
        const delay = Math.min(order, 4) * 0.08;
        const turn = Animated.subtract(flip, reveal.interpolate({ inputRange: [delay, delay + 0.68], outputRange: [0, 1], extrapolate: 'clamp' }));
        return <Animated.View key={index} testID="home-deck-slot" pointerEvents={busy ? 'none' : 'auto'} aria-hidden={busy} accessibilityElementsHidden={busy} importantForAccessibility={busy ? 'no-hide-descendants' : 'auto'} style={{ width: cardWidth, flexShrink: 0, opacity: travel.interpolate({ inputRange: [-1, -0.75, 0, 0.75, 1], outputRange: [0, 0.5, 1, 0.5, 0] }), transform: [{ translateX: travel.interpolate({ inputRange: [-1, 0, 1], outputRange: [-distance, 0, distance] }) }, { rotate: travel.interpolate({ inputRange: [-1, 0, 1], outputRange: [`-${3 + order * 0.5}deg`, '0deg', `${3 + order * 0.5}deg`] }) }] }}>
          <Animated.View testID="home-deck-front" style={[styles.face, { opacity: turn.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [1, 1, 0, 0] }), transform: [{ perspective: 1000 }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] }) }] }]}>
            {renderCard(item, busy)}
          </Animated.View>
          <Animated.View testID="home-deck-back" pointerEvents="none" aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.back, styles.face, { opacity: turn.interpolate({ inputRange: [0, 0.499, 0.5, 1], outputRange: [0, 0, 1, 1] }), transform: [{ perspective: 1000 }, { rotateY: turn.interpolate({ inputRange: [0, 1], outputRange: ['-180deg', '0deg'] }) }] }]}>
            <View style={styles.backFrame}>
              <Text style={styles.ornament}>✦</Text>
              <View style={styles.backRule} />
              <Text style={styles.backTitle}>処世術禄</Text>
              <View style={styles.backRule} />
              <Text style={styles.ornament}>✦</Text>
            </View>
          </Animated.View>
        </Animated.View>;
      })}
    </ScrollView>
  </View>;
}

const styles = StyleSheet.create({
  heading: { flexDirection: 'row', marginBottom: 8 },
  refresh: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  refreshBusy: { opacity: 0.5 },
  refreshText: { color: colors.ink, fontSize: 12, lineHeight: 18 },
  rail: { gap: 11, paddingBottom: 4, paddingRight: 16 },
  face: { backfaceVisibility: 'hidden' },
  back: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, borderRadius: 14, borderWidth: 1, borderColor: '#B28D50', backgroundColor: '#20241F', padding: 10, overflow: 'hidden' },
  backFrame: { flex: 1, borderWidth: 1, borderColor: '#847047', borderRadius: 8, justifyContent: 'center', alignItems: 'center', gap: 15 },
  backTitle: { color: '#E2CCA1', fontFamily: fonts.serif, fontSize: 23, lineHeight: 34, letterSpacing: 5 },
  backRule: { width: 38, height: 1, backgroundColor: '#847047' },
  ornament: { color: '#BA995D', fontSize: 13, lineHeight: 16 },
});
