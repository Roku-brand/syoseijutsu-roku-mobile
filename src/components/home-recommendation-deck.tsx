import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { categoryMeta } from '@/data/catalog';
import { getTheoryCoverSummary } from '@/data/theory-display';
import type { ReadingContent } from '@/data/reading-recommendations';
import { contentImageUrl } from '@/lib/content-media';
import { techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { useHomeDiscovery } from '@/hooks/use-home-discovery';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useWebDeckMotion } from '@/hooks/use-web-deck-motion';
import { deckLayerAngle as layerAngle, deckLayerX as layerX, deckReturnEdge } from '@/data/deck-motion';
import { useAppState } from '@/state/app-state';
import { SaveDiamond } from './save-diamond';
import { DiscoveryFilterButton } from './discovery-filter-button';
import type { DiscoveryFilter } from '@/data/discovery-filter';

const theoryImage = require('../../assets/home/deck-theory.webp');
const deckImages: Record<string, number> = {
  interpersonal: require('../../assets/home/deck-interpersonal.webp'),
  work: require('../../assets/home/deck-work.webp'),
  life: require('../../assets/home/deck-life.webp'),
};
const webGesture = Platform.OS === 'web' ? { touchAction: 'pan-y', userSelect: 'none', WebkitUserSelect: 'none' } as unknown as ViewStyle : {};
const faceShadow = Platform.OS === 'web' ? { boxShadow: '0 12px 30px -12px rgba(51,40,22,.32), 0 2px 7px rgba(51,40,22,.12)' } as ViewStyle
  : { shadowColor: '#332816', shadowOpacity: 0.18, shadowRadius: 16, shadowOffset: { width: 0, height: 7 }, elevation: 7 };
function imageFor(item: ReadingContent) {
  const fallback = item.type === 'theory' ? theoryImage : deckImages[item.card.categoryKey] ?? theoryImage;
  const uri = contentImageUrl(item.card.imagePath);
  return { fallback, source: uri ? { uri } : fallback };
}

export function HomeRecommendationDeck({ cardWidth, fillViewport = false, onOpenCard }: { cardWidth: number; fillViewport?: boolean; onOpenCard?: () => void }) {
  const deck = useHomeDiscovery();
  const { desktop } = useResponsiveLayout();
  const root = useRef<View>(null);
  const router = useRouter();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'moving' | 'shuffle'>('idle');
  const [direction, setDirection] = useState(-1);
  const [returnRaised, setReturnRaised] = useState(false);
  const [hovered, setHovered] = useState(false);
  const x = useRef(new Animated.Value(0)).current;
  const mix = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const dragDistance = useRef(0);
  const webMotion = useWebDeckMotion(cardWidth);
  const locked = useRef(false);
  const dragged = useRef(false);
  const lastDrag = useRef(0);
  const lastMotion = useRef(0);
  const gestureStartX = useRef(0);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const finish = useRef<(() => void) | null>(null);
  const latest = useRef({ deck, reduced, cardWidth });
  latest.current = { deck, reduced, cardWidth };
  const driver = Platform.OS !== 'web';
  const busy = phase !== 'idle';
  const current = deck.items[deck.cursor];
  const returning = direction > 0 && deck.position > 0;
  const returnPull = x.interpolate({ inputRange: [0, deckReturnEdge(cardWidth)], outputRange: [0, 1], extrapolate: 'clamp' });
  const returnProgress = Animated.add(Animated.multiply(returnPull, .45), Animated.multiply(lift, .55));
  const forwardPull = x.interpolate({ inputRange: [-deckReturnEdge(cardWidth), 0], outputRange: [1, 0], extrapolate: 'clamp' });
  const progress = Animated.add(Animated.multiply(forwardPull, .55), Animated.multiply(lift, .45));
  const reset = () => { webMotion?.reset(); x.setValue(0); lift.setValue(0); mix.setValue(0); dragDistance.current = 0; locked.current = false; dragged.current = false; finish.current = null; setReturnRaised(false); setDirection(-1); setPhase('idle'); };
  useLayoutEffect(() => { if (phase === 'moving') reset(); }, [deck.position]);
  useEffect(() => () => { finish.current = null; animation.current?.stop(); }, []);
  useEffect(() => {
    if (reduced && finish.current) {
      const complete = finish.current;
      finish.current = null;
      animation.current?.stop();
      webMotion?.stop();
      complete();
      reset();
    }
  }, [reduced]);
  useEffect(() => {
    for (const ahead of [1, 2, 4]) {
      const item = deck.items[(deck.cursor + ahead) % deck.items.length];
      if (!item) continue;
      const source = imageFor(item).source;
      const uri = typeof source === 'number' ? Image.resolveAssetSource(source)?.uri : source.uri;
      if (uri) void Image.prefetch(uri).catch(() => undefined);
    }
  }, [deck.cursor, deck.items[(deck.cursor + 1) % deck.items.length], deck.items[(deck.cursor + 2) % deck.items.length], deck.items[(deck.cursor + 4) % deck.items.length]]);
  const navigate = (step: number, velocity = 0) => {
    const info = latest.current;
    if (locked.current || info.deck.loading || info.deck.error || (step < 0 && info.deck.position === 0)) return;
    locked.current = true;
    dragged.current = true;
    lastDrag.current = Date.now();
    setDirection(step > 0 ? -1 : 1);
    setPhase('moving');
    const complete = () => info.deck.move(step);
    finish.current = complete;
    if (info.reduced) { complete(); return; }
    const duration = Math.max(280, 360 - Math.abs(velocity) * 24);
    if (webMotion) { webMotion.cycleCard(step < 0, duration, () => { finish.current = null; complete(); }); return; }
    const edge = deckReturnEdge(info.cardWidth) * (step < 0 ? 1 : -1);
    animation.current = Animated.timing(x, { toValue: edge, duration: Math.max(50, duration * .42 * (1 - Math.min(1, Math.abs(dragDistance.current / edge)))), easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.current.start(({ finished }) => {
      if (!finished) return;
      // Only change stacking after the moving card has cleared the deck.
      setReturnRaised(true);
      animation.current = Animated.timing(lift, { toValue: 1, duration: duration * .58, easing: Easing.out(Easing.cubic), useNativeDriver: true });
      animation.current.start(({ finished: done }) => { if (done) { finish.current = null; complete(); } });
    });
  };
  const navigation = useRef(navigate);
  navigation.current = navigate;
  const responder = useRef(PanResponder.create({
    // x0 is populated on grant, after the responder decision. Record touch-down
    // separately so excluding the browser edge never disables ordinary drags.
    onStartShouldSetPanResponderCapture: event => { gestureStartX.current = event.nativeEvent.pageX; return false; },
    onMoveShouldSetPanResponder: (_, gesture) => !locked.current && !latest.current.deck.loading && !latest.current.deck.error && gestureStartX.current > 22 && Math.abs(gesture.dx) > 9 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35,
    onPanResponderGrant: () => { dragged.current = true; webMotion?.stop(); x.stopAnimation(); },
    onPanResponderMove: (_, gesture) => {
      if (locked.current) return;
      lastMotion.current = Date.now();
      setDirection(gesture.dx < 0 ? -1 : 1);
      const displacement = gesture.dx > 0 && latest.current.deck.position === 0 ? gesture.dx * 0.18 : gesture.dx;
      dragDistance.current = displacement;
      if (webMotion) webMotion.drag(displacement, gesture.dx > 0 && latest.current.deck.position > 0); else x.setValue(displacement);
    },
    onPanResponderRelease: (_, gesture) => {
      lastDrag.current = Date.now();
      // PanResponder retains the last sampled velocity while the finger rests.
      const velocity = Date.now() - lastMotion.current < 80 ? gesture.vx : 0;
      if (Math.abs(gesture.dx) > latest.current.cardWidth * 0.24 || (Math.abs(velocity) > 0.55 && Math.abs(gesture.dx) > 20)) {
        const step = gesture.dx < 0 ? 1 : -1;
        if (step > 0 || latest.current.deck.position > 0) { navigation.current(step, velocity); return; }
      }
      if (latest.current.reduced) { reset(); return; }
      if (webMotion) { webMotion.animate(0, 260, reset, true); return; }
      animation.current = Animated.spring(x, { toValue: 0, stiffness: 240, damping: 28, mass: 0.8, useNativeDriver: driver });
      animation.current.start(({ finished }) => { if (finished) reset(); });
    },
    onPanResponderTerminate: () => {
      lastDrag.current = Date.now();
      if (webMotion) { webMotion.animate(0, 260, reset, true); return; }
      animation.current = Animated.spring(x, { toValue: 0, stiffness: 240, damping: 28, useNativeDriver: driver });
      animation.current.start(({ finished }) => { if (finished) reset(); });
    },
    onPanResponderTerminationRequest: () => !locked.current,
  })).current;
  const shuffle = (filter?: DiscoveryFilter) => {
    if (locked.current || dragged.current || deck.loading || deck.error) return;
    locked.current = true;
    setPhase('shuffle');
    let exchanged = false;
    const exchange = () => { if (!exchanged) { exchanged = true; latest.current.deck.shuffle(filter); } };
    finish.current = exchange;
    if (reduced) { exchange(); reset(); return; }
    const timing = (toValue: number) => Animated.timing(mix, { toValue, duration: 150, easing: Easing.inOut(Easing.cubic), useNativeDriver: driver });
    animation.current = Animated.sequence([timing(1), timing(2)]);
    animation.current.start(({ finished }) => {
      if (!finished) return;
      exchange();
      animation.current = Animated.sequence([timing(3), timing(4)]);
      animation.current.start(({ finished: done }) => { if (done) reset(); });
    });
  };
  const open = () => {
    if (!current || locked.current || dragged.current || Date.now() - lastDrag.current < 350) return;
    onOpenCard?.();
    router.push(current.type === 'technique' ? techniqueRoute(current.card.id) : theoryRoute(current.card.tagId));
  };
  // Keep actual stack order stable even when a gesture changes direction.
  const layers = [4, 3, 2, 1, 0].map(depth => ({ depth, item: deck.items[(deck.cursor + depth) % deck.items.length] }));
  const nativeReturnTransform = (depth: number) => depth === 4 ? [
    { translateX: Animated.multiply(returnPull.interpolate({ inputRange: [0, 1], outputRange: [layerX(4), deckReturnEdge(cardWidth)] }), lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })) },
    { translateY: Animated.multiply(returnPull.interpolate({ inputRange: [0, 1], outputRange: [36, 24] }), lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })) },
    { rotate: Animated.multiply(returnPull.interpolate({ inputRange: [0, 1], outputRange: [layerAngle(4), 6] }), lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })).interpolate({ inputRange: [0, 6], outputRange: ['0deg', '6deg'] }) },
    { scale: Animated.add(returnPull.interpolate({ inputRange: [0, 1], outputRange: [.9, .94] }), Animated.multiply(lift, .06)) },
  ] : [
    { translateX: returnProgress.interpolate({ inputRange: [0, 1], outputRange: [layerX(depth), layerX(depth + 1)] }) },
    { translateY: returnProgress.interpolate({ inputRange: [0, 1], outputRange: [depth * 9, (depth + 1) * 9] }) },
    { rotate: returnProgress.interpolate({ inputRange: [0, 1], outputRange: [`${layerAngle(depth)}deg`, `${layerAngle(depth + 1)}deg`] }) },
    { scale: returnProgress.interpolate({ inputRange: [0, 1], outputRange: [1 - depth * .025, 1 - (depth + 1) * .025] }) },
  ];
  const arrow = (step: number) => {
    const disabled = busy || deck.loading || deck.error || (step < 0 && deck.position === 0);
    return <Pressable testID={step < 0 ? 'home-deck-previous' : 'home-deck-next'} accessibilityRole="button" accessibilityLabel={step < 0 ? '前のカード' : '次のカード'} disabled={disabled} onPress={() => navigate(step)}
      style={({ pressed }) => [styles.arrow, desktop && styles.desktopArrow, desktop && (step < 0 ? styles.arrowLeft : styles.arrowRight), disabled && styles.arrowDisabled, pressed && styles.buttonPressed]}>
      <Text style={[styles.arrowText, desktop && styles.desktopArrowText]}>{step < 0 ? '‹' : '›'}</Text>
    </Pressable>;
  };
  return <View ref={root} style={fillViewport && styles.fillViewport} testID="home-recommendation-deck" tabIndex={0} aria-label="おすすめのカードデッキ。左右の矢印キーでカードをめくる" aria-busy={busy || deck.loading} accessibilityState={{ busy: busy || deck.loading }}
    {...(Platform.OS === 'web' ? { onKeyDown: (event: any) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); root.current?.focus(); navigate(event.key === 'ArrowLeft' ? -1 : 1); } } } : {})}>
    <View style={[styles.heading, !desktop && styles.mobileHeading]}>
      <View style={styles.headingCopy}><Text style={styles.headingTitle}>あなたにおすすめ</Text><Text style={styles.subtitle}>思いがけない知識との出会いを。</Text></View>
      <View style={styles.headingActions}><DiscoveryFilterButton value={deck.filter} disabled={busy || deck.loading || deck.error} onChange={shuffle} />
      <Pressable testID="home-discovery-refresh" accessibilityRole="button" accessibilityLabel="シャッフル" onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} disabled={busy || deck.loading || deck.error} onPress={() => shuffle()} style={({ pressed }) => [styles.shuffle, hovered && styles.shuffleHover, pressed && styles.buttonPressed, phase === 'shuffle' && { opacity: 0.65 }]}>
        <SymbolView name={{ ios: 'shuffle', android: 'shuffle', web: 'shuffle' }} size={17} tintColor="#FFFDF8" fallback={<Text style={styles.shuffleIcon}>⤨</Text>} /><Text style={styles.shuffleText}>シャッフル</Text>
      </Pressable></View>
    </View>
    <View testID="home-deck-stage" style={[styles.stage, { height: cardWidth < 300 ? 426 : 456 }, fillViewport && styles.fillViewport]}>
      {desktop ? <>{arrow(-1)}{arrow(1)}</> : null}
      {deck.error ? <View style={styles.empty}><Text style={styles.emptyTitle}>知識を読み込めませんでした</Text><Pressable accessibilityRole="button" onPress={deck.retry} style={styles.retry}><Text style={styles.subtitle}>もう一度読み込む →</Text></Pressable></View>
        : layers.map(({ depth, item }) => {
          const front = depth === 0;
          const offset = depth * 9;
          return <Animated.View key={depth} nativeID={`home-deck-slot-${depth}`} ref={node => webMotion?.slot(depth, node)} testID={front ? 'home-deck-front' : 'home-deck-layer'} pointerEvents={front && !busy ? 'auto' : 'none'} aria-hidden={!front} accessibilityElementsHidden={!front} importantForAccessibility={!front ? 'no-hide-descendants' : 'auto'}
            style={[styles.slot, { width: cardWidth, zIndex: returnRaised && (returning ? depth === 4 : front) ? (returning ? 6 : 0) : 5 - depth, opacity: front ? 1 : 1 - depth * 0.1, transform: [
              { translateX: phase === 'shuffle' ? mix.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: [layerX(depth), 0, (depth - 2) * 26, (2 - depth) * 20, layerX(depth)] }) : front ? x : progress.interpolate({ inputRange: [0, 1], outputRange: [layerX(depth), layerX(Math.max(0, depth - 1))] }) },
              { translateY: phase === 'shuffle' ? mix.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: [offset, 0, depth * -5, depth * 4, offset] }) : front ? 0 : progress.interpolate({ inputRange: [0, 1], outputRange: [offset, Math.max(0, depth - 1) * 9] }) },
              { rotate: phase === 'shuffle' ? mix.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: [`${layerAngle(depth)}deg`, '0deg', `${(depth - 2) * 3.5}deg`, `${(2 - depth) * 2.5}deg`, `${layerAngle(depth)}deg`] }) : front ? x.interpolate({ inputRange: [-cardWidth, 0, cardWidth], outputRange: ['-7deg', '0deg', '7deg'], extrapolate: 'clamp' }) : progress.interpolate({ inputRange: [0, 1], outputRange: [`${layerAngle(depth)}deg`, `${layerAngle(Math.max(0, depth - 1))}deg`] }) },
              { scale: phase === 'shuffle' ? mix.interpolate({ inputRange: [0, 1, 2, 3, 4], outputRange: [1 - depth * 0.025, 0.94, 0.93, 0.97, 1 - depth * 0.025] }) : front ? 1 : progress.interpolate({ inputRange: [0, 1], outputRange: [1 - depth * 0.025, 1 - Math.max(0, depth - 1) * 0.025] }) },
            ] }, !returning && !webMotion && phase !== 'shuffle' && { ...(front ? { transform: [
              { translateX: Animated.add(Animated.multiply(x, lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })), Animated.multiply(lift, layerX(4))) },
              { translateY: Animated.multiply(lift, 36) },
              { rotate: Animated.add(Animated.multiply(x.interpolate({ inputRange: [-cardWidth, 0, cardWidth], outputRange: [-7, 0, 7], extrapolate: 'clamp' }), lift.interpolate({ inputRange: [0, 1], outputRange: [1, 0] })), Animated.multiply(lift, layerAngle(4))).interpolate({ inputRange: [-7, 7], outputRange: ['-7deg', '7deg'] }) },
              { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, .9] }) },
            ] } : {}), opacity: front ? lift.interpolate({ inputRange: [0, 1], outputRange: [1, .6] }) : progress.interpolate({ inputRange: [0, 1], outputRange: [1 - depth * .1, 1 - (depth - 1) * .1] }) }, returning && !webMotion && phase !== 'shuffle' && { transform: nativeReturnTransform(depth), opacity: depth === 4 ? returnPull.interpolate({ inputRange: [0, 1 / 3, 1], outputRange: [.6, 1, 1] }) : returnProgress.interpolate({ inputRange: [0, 1], outputRange: [1 - depth * .1, 1 - (depth + 1) * .1] }) }, webMotion && phase !== 'shuffle' && { transform: [{ translateX: layerX(depth) }, { translateY: offset }, { rotate: `${layerAngle(depth)}deg` }, { scale: 1 - depth * .025 }] }, Platform.OS === 'web' && { willChange: 'transform', backfaceVisibility: 'hidden' } as ViewStyle]}>
            <Animated.View style={{ opacity: mix.interpolate({ inputRange: [0, 1.65, 2, 2.35, 4], outputRange: [1, 1, 0, 1, 1] }) }}>
              {(returning ? depth !== 0 && depth !== 4 : depth > 1) && item ? <View testID="home-deck-paper" style={[styles.card, styles.paper, item.type === 'theory' && styles.theoryCard, { width: cardWidth, height: cardWidth < 300 ? 378 : 408 }]} /> : item ? <DiscoveryFace item={item} width={cardWidth} active={front} disabled={busy} onPress={open} panHandlers={front ? responder.panHandlers : {}} onTouch={() => { if (!locked.current) dragged.current = false; }} />
                : <View testID="home-deck-skeleton" style={[styles.card, { width: cardWidth, height: cardWidth < 300 ? 378 : 408 }]}><View style={styles.skeletonLabel} /><View style={styles.skeletonTitle} /><View style={styles.skeletonText} /><View style={styles.skeletonImage} /></View>}
            </Animated.View></Animated.View>;
        })}
    </View>
    <View style={styles.controls}>
      {!desktop ? arrow(-1) : null}
      <View style={styles.position} accessibilityLiveRegion="polite"><View style={styles.marks}>{[0, 1, 2, 3, 4].map(index => <View key={index} style={[styles.mark, index === deck.cursor && styles.markActive]} />)}</View><Text testID="home-deck-position" style={styles.positionText}>{String(deck.cursor + 1).padStart(2, '0')} <Text style={{ color: '#AAA397' }}> / 05</Text></Text></View>
      {!desktop ? arrow(1) : null}
    </View><Text style={styles.hint}>スワイプするか、シャッフルで次の一枚へ。</Text>
  </View>;
}

function DiscoveryFace({ item, width, active, disabled, onPress, panHandlers, onTouch }: { item: ReadingContent; width: number; active: boolean; disabled: boolean; onPress: () => void; panHandlers: object; onTouch: () => void }) {
  const { savedIds, savedTheoryIds, toggleSaved, toggleSavedTheory } = useAppState();
  const reduced = useReducedMotion();
  const pulse = useRef(new Animated.Value(1)).current;
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const theoretical = item.type === 'theory';
  const id = theoretical ? item.card.tagId : item.card.id;
  const saved = (theoretical ? savedTheoryIds : savedIds).includes(id);
  const accent = theoretical ? '#627593' : catalogTheme.categoryBars[item.card.categoryKey] ?? colors.moss;
  const label = theoretical ? '理論' : categoryMeta[item.card.categoryKey]?.label ?? item.card.categoryName;
  const summary = theoretical ? getTheoryCoverSummary(item.card.summary) : item.card.essence || item.card.subtitle || '';
  const titleSize = width < 300 || item.card.title.length > 22 ? 21 : 24;
  const titleLine = titleSize === 21 ? 27 : 33;
  const titleUnits = [...item.card.title].reduce((sum, character) => sum + (/^[\x20-\x7e]$/.test(character) ? 0.6 : 1), 0);
  const titleLines = Math.min(3, Math.max(1, Math.ceil((titleUnits * titleSize + item.card.title.length * 0.3) / (width - 38))));
  const image = imageFor(item);
  useEffect(() => setFailed(false), [id]);
  useEffect(() => () => pulse.stopAnimation(), [pulse]);
  return <View {...panHandlers} onTouchStart={onTouch} style={[styles.card, webGesture, theoretical && styles.theoryCard, { width, height: width < 300 ? 378 : 408 }, focused && styles.focused]}>
    <Pressable testID={active ? 'home-recommendation-card' : undefined} accessibilityRole="link" accessibilityLabel={`${item.card.title}を読む`} disabled={disabled || !active} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress} style={({ pressed }) => [styles.cardLink, pressed && { opacity: 0.88 }]}>
      <View style={styles.cardTop}><Text style={[styles.badge, { backgroundColor: accent }]}>{label}</Text><Text style={styles.cardKind}>{theoretical ? 'THEORY' : 'PRACTICE'}</Text></View>
      <Text numberOfLines={3} style={[styles.title, { fontSize: titleSize, lineHeight: titleLine, height: Math.max(66, titleLines * titleLine + 17) }, theoretical && { color: '#263B53' }]}>{item.card.title}</Text>
      <View style={[styles.rule, theoretical && { backgroundColor: '#D9E0E6' }]} /><Text numberOfLines={2} style={styles.summary}>{summary}</Text>
      <View style={styles.photoWrap}><Image source={failed ? image.fallback : image.source} onError={() => setFailed(true)} resizeMode="cover" style={styles.photo} accessibilityLabel={`${label}のイメージ写真`} /><View style={styles.readArrow}><Text style={styles.readArrowText}>›</Text></View></View>
    </Pressable>
    {active ? <Animated.View style={[styles.save, { transform: [{ scale: pulse }] }]}><Pressable testID="home-deck-save" accessibilityRole="button" accessibilityLabel={saved ? 'お気に入りから外す' : 'お気に入りに保存'} aria-pressed={saved} accessibilityState={{ selected: saved }} disabled={disabled}
      onPress={() => { if (theoretical) toggleSavedTheory(id); else toggleSaved(id); if (!reduced) Animated.sequence([Animated.timing(pulse, { toValue: 1.18, duration: 100, useNativeDriver: Platform.OS !== 'web' }), Animated.spring(pulse, { toValue: 1, damping: 18, stiffness: 300, useNativeDriver: Platform.OS !== 'web' })]).start(); }} style={styles.saveTouch}><SaveDiamond saved={saved} /></Pressable></Animated.View> : null}
  </View>;
}

const styles = StyleSheet.create({
  fillViewport: { flexGrow: 1 },
  mobileHeading: { flexDirection: 'column', alignItems: 'stretch', gap: 10 }, headingActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 8 },
  paper: { backgroundColor: '#F8F5EF' },
  desktopArrow: { position: 'absolute', top: 192, width: 58, height: 58, borderRadius: 30, zIndex: 10, shadowColor: '#705423', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 4 } },
  arrowLeft: { left: '12%' }, arrowRight: { right: '12%' }, desktopArrowText: { fontSize: 38, lineHeight: 45 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 12 }, headingCopy: { flexShrink: 1 }, headingTitle: { color: colors.ink, fontFamily: fonts.serif, fontWeight: '700', fontSize: 21, lineHeight: 31, letterSpacing: 0.3 }, subtitle: { fontFamily: fonts.sans, fontSize: 11, lineHeight: 19, color: colors.muted, marginTop: 3 },
  shuffle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, borderRadius: 24, backgroundColor: '#987029', borderWidth: 1, borderColor: '#B28A43', shadowColor: '#8A6528', shadowOpacity: 0.14, shadowOffset: { width: 0, height: 3 }, shadowRadius: 6 }, shuffleHover: { transform: [{ translateY: -2 }], backgroundColor: '#886224' }, buttonPressed: { transform: [{ scale: 0.95 }] }, shuffleIcon: { color: colors.white, fontSize: 22 }, shuffleText: { color: '#FFFDF8', fontSize: 11, fontWeight: '600' },
  stage: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 13, zIndex: 1 }, slot: { position: 'absolute', top: 13, ...faceShadow, borderRadius: 14, backgroundColor: '#FFFDF9' }, card: { borderRadius: 14, backgroundColor: '#FFFDF9', borderWidth: 1, borderColor: '#E4DDD2', overflow: 'hidden' }, theoryCard: { backgroundColor: '#F9FBFC', borderColor: '#D6DFE6' }, cardLink: { flex: 1, padding: 18, paddingTop: 17 }, cardTop: { flexDirection: 'row', alignItems: 'center', height: 27, paddingRight: 32 }, badge: { color: '#FFFFFF', fontFamily: fonts.serif, fontSize: 11, lineHeight: 20, paddingHorizontal: 11, paddingVertical: 1, borderRadius: 12, overflow: 'hidden' }, cardKind: { marginLeft: 10, color: '#9B968D', fontSize: 8, letterSpacing: 1.5 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 24, lineHeight: 33, fontWeight: '600', letterSpacing: 0.3, height: 94, paddingTop: 11 }, rule: { height: 1, backgroundColor: '#ECE5D9', marginTop: 5, marginBottom: 10 }, summary: { color: '#69655E', fontFamily: fonts.sans, fontSize: 13, lineHeight: 23, height: 46 }, photoWrap: { marginTop: 13, flex: 1, minHeight: 90, borderRadius: 8, overflow: 'hidden', backgroundColor: '#E6E0D5' }, photo: { width: '100%', height: '100%' }, readArrow: { position: 'absolute', right: 10, bottom: 10, width: 36, height: 36, borderRadius: 20, backgroundColor: '#FFFDF5', alignItems: 'center', justifyContent: 'center' }, readArrowText: { color: colors.goldDeep, fontSize: 29, lineHeight: 32 }, save: { position: 'absolute', right: 5, top: 7 }, saveTouch: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, focused: { borderColor: colors.gold, borderWidth: 2 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 22, marginTop: 4 }, arrow: { minWidth: 44, minHeight: 44, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E4D9C7', backgroundColor: '#FFFDF8' }, arrowText: { fontSize: 29, lineHeight: 34, color: colors.goldDeep }, arrowDisabled: { opacity: 0.3 }, position: { alignItems: 'center', gap: 7 }, marks: { flexDirection: 'row', gap: 5 }, mark: { height: 3, width: 12, borderRadius: 3, backgroundColor: '#E8E2D8' }, markActive: { width: 22, backgroundColor: colors.gold }, positionText: { fontSize: 9, letterSpacing: 1.5, color: colors.goldDeep }, hint: { color: '#79736A', fontSize: 10, lineHeight: 19, textAlign: 'center', marginTop: 9, marginBottom: 10 }, empty: { height: 300, justifyContent: 'center', alignItems: 'center' }, emptyTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 17 }, retry: { minHeight: 44, justifyContent: 'center' },
  skeletonLabel: { height: 22, width: 58, borderRadius: 12, backgroundColor: '#E9E3D8', margin: 20 }, skeletonTitle: { height: 55, marginHorizontal: 20, backgroundColor: '#EFEAE1', borderRadius: 4 }, skeletonText: { height: 32, margin: 20, backgroundColor: '#F1EDE5', borderRadius: 4 }, skeletonImage: { flex: 1, margin: 18, backgroundColor: '#E9E3D8', borderRadius: 8 },
});
