import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Animated, Easing, Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { categoryMeta, getTechniqueDisplayId, getTheoryDisplayId, getTheoryCategoryTitle } from '@/data/catalog';
import { getTheoryCategoryLabel, getTheoryCoverSummary } from '@/data/theory-display';
import { getPersonaPresentation } from '@/data/persona-presentation';
import { contentImageUrl } from '@/lib/content-media';
import { layoutTechniqueTitle } from '@/lib/technique-title-layout';
import { personaRoute, techniqueRoute, theoryRoute } from '@/navigation/app-routes';
import { useHomeDiscovery, type HomeDeckCard, type HomeDeckCover } from '@/hooks/use-home-discovery';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useWebDeckMotion } from '@/hooks/use-web-deck-motion';
import { deckPose, deckReturnEdge, deckShuffleFrames, HOME_DECK_SIZE, HOME_DECK_LAST } from '@/data/deck-motion';
import { useAppState } from '@/state/app-state';
import { DiscoveryFilterButton, discoveryFilterColor } from './discovery-filter-button';
import { DiscoveryActionButton } from './discovery-action-button';
import { DiscoveryControlIcon } from './discovery-control-icon';
import { TechniqueTitle } from './technique-title';
import type { DiscoveryFilter } from '@/data/discovery-filter';

const theoryImage = require('../../assets/home/deck-theory.webp');
const saveOutline = require('../../assets/home/deck-save-outline.png');
const saveFilled = require('../../assets/home/deck-save-filled.png');
const deckImages: Record<string, number> = {
  interpersonal: require('../../assets/home/deck-interpersonal.webp'),
  work: require('../../assets/home/deck-work.webp'),
  life: require('../../assets/home/deck-life.webp'),
};
const webGesture = Platform.OS === 'web' ? {
  // pan-up scrolls the viewport upward when the finger moves downward.
  touchAction: typeof CSS !== 'undefined' && CSS.supports('touch-action', 'pan-up pinch-zoom') ? 'pan-up pinch-zoom' : 'none',
  userSelect: 'none', WebkitUserSelect: 'none',
} as unknown as ViewStyle : {};
const faceShadow = Platform.OS === 'web' ? { boxShadow: '0 9px 18px -8px rgba(51,40,22,.23), 0 2px 5px rgba(51,40,22,.08)' } as ViewStyle
  : { shadowColor: '#332816', shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 2 };
function cardAccent(item: HomeDeckCard) {
  const content = item.type === 'cover' ? item.preview : item;
  return content.type === 'theory' ? '#627593' : catalogTheme.categoryBars[content.card.categoryKey] ?? colors.moss;
}
function imageFor(item: HomeDeckCard) {
  const content = item.type === 'cover' ? item.preview : item;
  const fallback = content.type === 'theory' ? theoryImage : deckImages[content.card.categoryKey] ?? theoryImage;
  const portrait = item.type === 'cover' && item.group.type === 'persona' ? getPersonaPresentation(item.group.name)?.image : undefined;
  if (typeof portrait === 'number') return { fallback, source: portrait };
  const uri = portrait?.uri || contentImageUrl(content.card.imagePath);
  return { fallback, source: uri ? { uri } : fallback };
}

function coverSummary({ group }: HomeDeckCover) {
  if (group.type === 'theory') return `${group.name}をひもとく、5つの理論。`;
  if (group.name === '言い争いに負けない人') return '相手の勢いに流されず、自分の意見を落ち着いて伝える。';
  return getPersonaPresentation(group.name)?.subtitle || 'この人物像につながる、5つの処世術。';
}

export function HomeRecommendationDeck({ cardWidth, cardHeight: baseCardHeight = cardWidth < 300 ? 378 : 408, night = false, fillViewport = false, onOpenCard }: { cardWidth: number; cardHeight?: number; night?: boolean; fillViewport?: boolean; onOpenCard?: () => void }) {
  const deck = useHomeDiscovery();
  const { desktop, width: viewportWidth } = useResponsiveLayout();
  const { fontScale } = useWindowDimensions();
  const [fontRevision, setFontRevision] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    let disposed = false;
    const update = () => { if (!disposed) setFontRevision(value => value + 1); };
    void document.fonts?.ready.then(update);
    document.fonts?.addEventListener('loadingdone', update);
    return () => { disposed = true; document.fonts?.removeEventListener('loadingdone', update); };
  }, []);
  // Keep the cover and all reading cards the same height. Long titles can use additional
  // lines without clipping or moving the shortcut shelf on every swipe.
  const cardHeight = useMemo(() => {
    const compact = night && !desktop;
    const baseSize = compact ? 24 : 25;
    const ratio = compact ? 33 / 24 : 34 / 25;
    const width = cardWidth - 2 - (compact ? 28 : 34);
    const context = Platform.OS === 'web' && typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null;
    const tallest = deck.items.reduce((height, item) => {
      if (!item) return height;
      const layout = layoutTechniqueTitle(item.type === 'cover' ? item.title : item.card.title, width, baseSize, 17, (text, size) => {
        if (context) { context.font = `700 ${size}px ${fonts.serif}`; return context.measureText(text).width + Math.max(0, [...text].length - 1) * .15; }
        return [...text].reduce((sum, char) => sum + (/^[\x20-\x7e]$/.test(char) ? .6 : 1), 0) * size * fontScale + Math.max(0, [...text].length - 1) * .15;
      });
      return Math.max(height, layout.lines.length * Math.ceil(layout.fontSize * ratio));
    }, 0);
    // Borders, padding, metadata, rule, up to three quote lines and the photo's
    // minimum height must all fit, including when a title needs extra lines.
    const otherContent = 2 + (compact ? 26 : 32) + 24 + 24 + 5 + 26 + 69 + 17 + (compact ? 100 : 110);
    return Math.max(baseCardHeight, otherContent + Math.ceil(tallest * fontScale) + Math.ceil(Math.max(0, fontScale - 1) * 117));
  }, [baseCardHeight, cardWidth, deck.items, desktop, fontScale, fontRevision, night]);
  const root = useRef<View>(null);
  const router = useRouter();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'moving' | 'shuffle'>('idle');
  const [pendingFilter, setPendingFilter] = useState<DiscoveryFilter | null>(null);
  const selectedFilter = pendingFilter ?? deck.filter;
  const [direction, setDirection] = useState(-1);
  const [returnRaised, setReturnRaised] = useState(false);
  const spin = useRef(new Animated.Value(0)).current;
  const x = useRef(new Animated.Value(0)).current;
  const mix = useRef(new Animated.Value(0)).current;
  const lift = useRef(new Animated.Value(0)).current;
  const dragDistance = useRef(0);
  const webMotion = useWebDeckMotion(cardWidth, viewportWidth);
  const locked = useRef(false);
  const queuedMoves = useRef<number[]>([]);
  const queuedFrame = useRef<number | null>(null);
  const dragged = useRef(false);
  const lastDrag = useRef(0);
  const lastMotion = useRef(0);
  const gestureStartX = useRef(0);
  const gestureAxis = useRef<'horizontal' | 'upward' | null>(null);
  const shuffleGesture = useRef<() => void>(() => undefined);
  const animation = useRef<Animated.CompositeAnimation | null>(null);
  const finish = useRef<(() => void) | null>(null);
  const latest = useRef({ deck, reduced, cardWidth });
  latest.current = { deck, reduced, cardWidth };
  const driver = Platform.OS !== 'web';
  const busy = phase !== 'idle';
  const current = deck.items[deck.cursor];
  const shuffleFrames = useMemo(() => Array.from({ length: HOME_DECK_SIZE }, (_, depth) => deckShuffleFrames(depth, cardWidth, viewportWidth)), [cardWidth, viewportWidth]);
  useEffect(() => {
    if (Platform.OS !== 'web' || deck.loading || !current) return;
    const frame = requestAnimationFrame(() => window.dispatchEvent(new Event('roku-home-ready')));
    return () => cancelAnimationFrame(frame);
  }, [deck.loading, !!current]);
  const returning = direction > 0;
  const reset = () => { webMotion?.reset(); spin.stopAnimation(); spin.setValue(0); x.setValue(0); lift.setValue(0); mix.setValue(0); dragDistance.current = 0; locked.current = false; dragged.current = false; finish.current = null; setPendingFilter(null); setReturnRaised(false); setDirection(-1); setPhase('idle');
    if (queuedMoves.current.length) queuedFrame.current = requestAnimationFrame(() => { queuedFrame.current = null; const step = queuedMoves.current.shift(); if (step) navigation.current(step); });
  };
  useLayoutEffect(() => { if (phase === 'moving') reset(); }, [deck.position]);
  useEffect(() => () => { finish.current = null; animation.current?.stop(); spin.stopAnimation(); if (queuedFrame.current !== null) cancelAnimationFrame(queuedFrame.current); queuedMoves.current = []; }, []);
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
    for (const ahead of [1, 2, HOME_DECK_LAST]) {
      const item = deck.items[(deck.cursor + ahead) % deck.items.length];
      if (!item) continue;
      const source = imageFor(item).source;
      const uri = typeof source === 'number' ? Image.resolveAssetSource(source)?.uri : source.uri;
      if (uri) void Image.prefetch(uri).catch(() => undefined);
    }
  }, [deck.cursor, deck.items[(deck.cursor + 1) % deck.items.length], deck.items[(deck.cursor + 2) % deck.items.length], deck.items[(deck.cursor + HOME_DECK_LAST) % deck.items.length]]);
  const navigate = (step: number, velocity = 0) => {
    const info = latest.current;
    if (info.deck.loading || info.deck.error) return;
    if (locked.current || queuedFrame.current !== null) { if (queuedMoves.current.length < HOME_DECK_SIZE * 2) queuedMoves.current.push(step); return; }
    locked.current = true;
    dragged.current = true;
    lastDrag.current = Date.now();
    setDirection(step > 0 ? -1 : 1);
    setPhase('moving');
    const complete = () => info.deck.move(step);
    finish.current = complete;
    if (info.reduced) { complete(); return; }
    const duration = Math.max(300, 370 - Math.abs(velocity) * 28);
    if (webMotion) { webMotion.cycleCard(step < 0, duration, () => { finish.current = null; complete(); }); return; }
    const edge = deckReturnEdge(info.cardWidth) * (step < 0 ? 1 : -1);
    animation.current = Animated.timing(x, { toValue: edge, duration: Math.max(50, duration * (step < 0 ? .58 : .42) * (1 - Math.min(1, Math.abs(dragDistance.current / edge)))), easing: Easing.out(Easing.cubic), useNativeDriver: true });
    animation.current.start(({ finished }) => {
      if (!finished) return;
      // Only change stacking after the moving card has cleared the deck.
      setReturnRaised(true);
      animation.current = Animated.timing(lift, { toValue: 1, duration: duration * (step < 0 ? .42 : .58), easing: Easing.out(Easing.cubic), useNativeDriver: true });
      animation.current.start(({ finished: done }) => { if (done) { finish.current = null; complete(); } });
    });
  };
  const navigation = useRef(navigate);
  navigation.current = navigate;
  const responder = useRef(PanResponder.create({
    // x0 is populated on grant, after the responder decision. Record touch-down
    // separately so excluding the browser edge never disables ordinary drags.
    onStartShouldSetPanResponderCapture: event => {
      gestureStartX.current = event.nativeEvent.pageX;
      gestureAxis.current = null;
      return false;
    },
    onMoveShouldSetPanResponder: (_, gesture) => {
      if (locked.current || latest.current.deck.loading || latest.current.deck.error || gesture.numberActiveTouches > 1 || gestureStartX.current <= 22) return false;
      const horizontal = Math.abs(gesture.dx) > 9 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.35;
      const upward = gesture.dy < -12 && -gesture.dy > Math.abs(gesture.dx) * 1.35;
      gestureAxis.current = horizontal ? 'horizontal' : upward ? 'upward' : null;
      return gestureAxis.current !== null;
    },
    onPanResponderGrant: () => { dragged.current = true; webMotion?.stop(); x.stopAnimation(); },
    onPanResponderMove: (_, gesture) => {
      if (locked.current || gestureAxis.current !== 'horizontal') return;
      lastMotion.current = Date.now();
      setDirection(gesture.dx < 0 ? -1 : 1);
      const displacement = gesture.dx;
      dragDistance.current = displacement;
      if (webMotion) webMotion.drag(displacement, gesture.dx > 0); else x.setValue(displacement);
    },
    onPanResponderRelease: (_, gesture) => {
      lastDrag.current = Date.now();
      if (gestureAxis.current === 'upward') {
        gestureAxis.current = null;
        dragged.current = false;
        if (gesture.dy < -70 && -gesture.dy > Math.abs(gesture.dx) * 1.35) shuffleGesture.current();
        return;
      }
      // PanResponder retains the last sampled velocity while the finger rests.
      const velocity = Date.now() - lastMotion.current < 80 ? gesture.vx : 0;
      if (Math.abs(gesture.dx) > latest.current.cardWidth * 0.24 || (Math.abs(velocity) > 0.55 && Math.abs(gesture.dx) > 20)) {
        const step = gesture.dx < 0 ? 1 : -1;
        navigation.current(step, velocity);
        return;
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
    if (locked.current || dragged.current || deck.loading || (deck.error && !filter)) return;
    locked.current = true;
    if (filter) setPendingFilter(filter);
    setPhase('shuffle');
    spin.setValue(0);
    if (!reduced) Animated.timing(spin, { toValue: 1, duration: 1160, easing: Easing.inOut(Easing.cubic), useNativeDriver: driver }).start();
    let exchanged = false;
    const exchange = () => { if (!exchanged) { exchanged = true; latest.current.deck.shuffle(filter); } };
    finish.current = exchange;
    if (reduced) { exchange(); reset(); return; }
    if (webMotion) { webMotion.shuffleCards(exchange, reset); return; }
    const timing = (toValue: number) => Animated.timing(mix, { toValue, duration: 540, easing: Easing.inOut(Easing.cubic), useNativeDriver: true });
    animation.current = timing(2.1);
    animation.current.start(({ finished }) => {
      if (!finished) return;
      exchange();
      animation.current = timing(4);
      animation.current.start(({ finished: done }) => { if (done) reset(); });
    });
  };
  shuffleGesture.current = () => {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') navigator.vibrate(22);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
    }
    shuffle();
  };
  const open = () => {
    if (!current || locked.current || dragged.current || Date.now() - lastDrag.current < 350) return;
    onOpenCard?.();
    if (current.type === 'cover') {
      const { group } = current;
      router.push(group.type === 'persona' ? personaRoute(group.categoryId, group.name) :
        { pathname: '/theories', params: { category: group.categoryId, subcategory: group.subcategoryId } });
      return;
    }
    router.push(current.type === 'technique' ? techniqueRoute(current.card.id) : theoryRoute(current.card.tagId));
  };
  // Keep actual stack order stable even when a gesture changes direction.
  const layers = Array.from({ length: HOME_DECK_SIZE }, (_, index) => HOME_DECK_LAST - index).map(depth => ({ depth, item: deck.items[(deck.cursor + depth) % deck.items.length] }));
  const nativePose = (depth: number) => {
    const edge = deckReturnEdge(cardWidth) * (returning ? 1 : -1);
    const start = deckPose(depth, 0, cardWidth, returning);
    const extracted = deckPose(depth, edge, cardWidth, returning);
    const settled = deckPose(depth, edge, cardWidth, returning, 1);
    const pull = x.interpolate({ inputRange: returning ? [0, edge] : [edge, 0], outputRange: returning ? [0, 1] : [1, 0], extrapolate: 'clamp' });
    const value = (key: keyof typeof start) => Animated.add(start[key], Animated.add(Animated.multiply(pull, extracted[key] - start[key]), Animated.multiply(lift, settled[key] - extracted[key])));
    return { opacity: value('opacity'), transform: [{ translateX: value('x') }, { translateY: value('y') }, { rotate: value('angle').interpolate({ inputRange: [-15, 15], outputRange: ['-15deg', '15deg'] }) }, { scale: value('scale') }] };
  };
  return <View ref={root} style={fillViewport && styles.fillViewport} testID="home-recommendation-deck" tabIndex={0} aria-label="おすすめのカードデッキ。左右にスワイプ、または矢印キーでカードをめくる。カードを上にスワイプしてシャッフル" aria-busy={busy || deck.loading} accessibilityState={{ busy: busy || deck.loading }}
    {...(Platform.OS === 'web' ? { onKeyDown: (event: any) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); event.stopPropagation(); root.current?.focus(); navigate(event.key === 'ArrowLeft' ? -1 : 1); } } } : {})}>
    <View style={[styles.heading, !desktop && styles.mobileHeading, night && styles.nightHeading]}>
      <View style={[styles.headingCopy, night && styles.nightHeadingCopy]}><Text testID="home-deck-heading" accessibilityRole="header" style={[styles.headingTitle, night && styles.nightTitle]}>あなたにおすすめ</Text></View>
      <View style={[styles.headingActions, night && styles.nightActions]}><DiscoveryFilterButton outlined={night} value={selectedFilter} disabled={busy || deck.loading} dimWhenDisabled={deck.loading} onChange={shuffle} />
      <DiscoveryActionButton testID="home-discovery-refresh" label="シャッフル" disabled={busy || deck.loading || deck.error} dimWhenDisabled={deck.loading || deck.error} onPress={() => shuffle()} color={discoveryFilterColor(selectedFilter)}
        icon={<Animated.View style={{ transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }] }}><DiscoveryControlIcon name="refresh" color={colors.white} /></Animated.View>} />
      </View>
    </View>
    <View testID="home-deck-stage" style={[styles.stage, { height: cardHeight + 30 }]}>
      {deck.error ? <View style={styles.empty}><Text style={styles.emptyTitle}>この種類のデッキを用意できませんでした</Text><Pressable accessibilityRole="button" onPress={deck.retry} style={styles.retry}><Text style={styles.subtitle}>もう一度読み込む →</Text></Pressable></View>
        : layers.map(({ depth, item }) => {
          const front = depth === 0;
          const rest = deckPose(depth, 0, cardWidth);
          // Web motion owns these transforms. React must not overwrite a drag
          // when the phase or gesture direction changes.
          const pose = webMotion ? { opacity: rest.opacity, transform: [{ translateX: rest.x }, { translateY: rest.y }, { rotate: `${rest.angle}deg` }, { scale: rest.scale }] } : phase === 'shuffle' ? {
            opacity: mix.interpolate({ inputRange: shuffleFrames[depth].stops, outputRange: shuffleFrames[depth].opacity }),
            transform: [{ translateX: mix.interpolate({ inputRange: shuffleFrames[depth].stops, outputRange: shuffleFrames[depth].x }) }, { translateY: mix.interpolate({ inputRange: shuffleFrames[depth].stops, outputRange: shuffleFrames[depth].y }) }, { rotate: mix.interpolate({ inputRange: shuffleFrames[depth].stops, outputRange: shuffleFrames[depth].angle.map(value => `${value}deg`) }) }, { scale: mix.interpolate({ inputRange: shuffleFrames[depth].stops, outputRange: shuffleFrames[depth].scale }) }],
          } : nativePose(depth);
          return <Animated.View key={depth} nativeID={`home-deck-slot-${depth}`} ref={node => webMotion?.slot(depth, node)} testID={front ? 'home-deck-front' : 'home-deck-layer'} pointerEvents={front && !busy ? 'auto' : 'none'} aria-hidden={!front} accessibilityElementsHidden={!front} importantForAccessibility={!front ? 'no-hide-descendants' : 'auto'}
            style={[styles.slot, { width: cardWidth, zIndex: returnRaised && (returning ? depth === HOME_DECK_LAST : front) ? (returning ? HOME_DECK_SIZE + 1 : 0) : HOME_DECK_SIZE - depth }, pose]}>
            <View style={styles.flipFace}>
              {phase !== 'shuffle' && (returning ? depth !== 0 && depth !== HOME_DECK_LAST : depth > 1) && item ? <View testID="home-deck-paper" style={[styles.card, styles.paper, { width: cardWidth, height: cardHeight, borderColor: cardAccent(item) }]}>
                <View style={[styles.paperEdge, { backgroundColor: cardAccent(item) }]} /><View style={[styles.paperEdge, styles.paperEdgeRight, { backgroundColor: cardAccent(item) }]} />
              </View> : item ? <DiscoveryFace item={item} width={cardWidth} height={cardHeight} compact={night && !desktop} active={front} disabled={busy} onPress={open} panHandlers={front ? responder.panHandlers : {}} onTouch={() => { if (!locked.current) dragged.current = false; }} />
                : <View testID="home-deck-skeleton" style={[styles.card, { width: cardWidth, height: cardHeight }]}><View style={styles.skeletonLabel} /><View style={styles.skeletonTitle} /><View style={styles.skeletonText} /><View style={styles.skeletonImage} /></View>}
            </View></Animated.View>;
        })}
    </View>
  </View>;
}

function DiscoveryFace({ item, width, height, compact, active, disabled, onPress, panHandlers, onTouch }: { item: HomeDeckCard; width: number; height: number; compact: boolean; active: boolean; disabled: boolean; onPress: () => void; panHandlers: object; onTouch: () => void }) {
  const { savedIds, savedTheoryIds, toggleSaved, toggleSavedTheory } = useAppState();
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState(false);
  const cover = item.type === 'cover' ? item : undefined;
  const content = item.type === 'cover' ? item.preview : item;
  const theoretical = content.type === 'theory';
  const id = theoretical ? content.card.tagId : content.card.id;
  const saved = (theoretical ? savedTheoryIds : savedIds).includes(id);
  const accent = cardAccent(item);
  const label = theoretical ? '理論' : categoryMeta[content.card.categoryKey]?.label ?? content.card.categoryName;
  const context = cover ? (cover.group.type === 'theory' ? 'テーマ' : '人物像')
    : theoretical ? getTheoryCategoryLabel(content.card) || getTheoryCategoryTitle(content.card.categoryId) : content.card.subcategory.trim();
  const title = cover?.title ?? content.card.title;
  const summary = cover ? coverSummary(cover) : theoretical ? getTheoryCoverSummary(content.card.summary) : content.card.essence || content.card.subtitle || '';
  const linkLabel = cover ? `${cover.group.name}の${cover.group.type === 'theory' ? '理論一覧' : '人物像ページ'}を開く` : `${title}を読む`;
  const image = imageFor(item);
  useEffect(() => setFailed(false), [id, cover?.group.id]);
  return <View {...panHandlers} testID={cover && active ? 'home-deck-cover' : undefined} onTouchStart={onTouch} style={[styles.card, webGesture, { width, height }, focused && styles.focused]}>
    <View pointerEvents="none" accessible={false} style={styles.innerFrame} />
    <Pressable testID={active ? 'home-recommendation-card' : undefined} accessibilityRole="link" accessibilityLabel={linkLabel} disabled={disabled || !active} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} onPress={onPress} style={({ pressed }) => [styles.cardLink, compact && styles.compactCardLink, pressed && { opacity: 0.88 }]}>
      <View style={styles.cardTop}><Text style={[styles.badge, { backgroundColor: accent }]}>{label}</Text><Text testID={active ? 'home-deck-context' : undefined} numberOfLines={1} accessibilityLabel={`${theoretical ? '理論分類' : '人物像'}：${context}`} style={styles.cardKind}>{context}</Text></View>
      {cover ? null : <Text testID={active ? 'home-deck-number' : undefined} style={styles.cardNumber}>{theoretical ? getTheoryDisplayId(content.card) : getTechniqueDisplayId(content.card)}</Text>}
      <TechniqueTitle testID={active ? 'home-deck-title' : undefined} title={title} minimumFontSize={17} style={[styles.title, compact && styles.compactTitle, cover && styles.coverTitle]} />
      <View style={styles.titleRule}><View style={styles.ruleAccent} /><View style={styles.ruleRest} /></View>
      <View style={styles.quotation}>
        <Text accessible={false} style={styles.quoteMark}>“</Text>
        <Text testID={active ? 'home-deck-essence' : undefined} numberOfLines={3} style={styles.summary}>{summary}</Text>
      </View>
      <View style={[styles.photoWrap, compact && styles.compactPhoto]}><Image testID="home-deck-photo" source={failed ? image.fallback : image.source} defaultSource={image.fallback} onError={() => setFailed(true)} resizeMode="cover" style={styles.photo} accessibilityLabel={`${label}のイメージ写真`} /><View testID={active ? 'home-deck-read-arrow' : undefined} style={styles.readArrow}><Text style={styles.readArrowText}>›</Text></View></View>
    </Pressable>
    {cover ? null : <Pressable
      testID={active ? 'home-deck-save' : undefined}
      accessibilityRole="button"
      accessibilityLabel={saved ? 'お気に入りから外す' : 'お気に入りに保存'}
      aria-pressed={saved}
      accessibilityState={{ selected: saved }}
      disabled={disabled || !active}
      onPress={() => theoretical ? toggleSavedTheory(id) : toggleSaved(id)}
      style={styles.save}
    >
      <Image
        testID="save-diamond"
        source={saved ? saveFilled : saveOutline}
        defaultSource={saveOutline}
        fadeDuration={0}
        accessible={false}
        style={styles.saveDiamond}
      />
    </Pressable>}
  </View>;
}

const styles = StyleSheet.create({
  nightHeading: { marginBottom: 0, gap: 8, flexDirection: 'column', alignItems: 'flex-start' }, nightHeadingCopy: { borderLeftWidth: 3, borderLeftColor: '#BC9650', paddingLeft: 11 }, nightTitle: { color: '#FFFDF5', fontSize: 26, lineHeight: 34, letterSpacing: .5 }, nightActions: { marginLeft: 14, gap: 10 },
  compactCardLink: { padding: 14, paddingTop: 13, paddingBottom: 13 }, compactTitle: { fontSize: 24, lineHeight: 33, fontWeight: '700', paddingTop: 5 }, compactPhoto: { marginTop: 17, minHeight: 100 },
  fillViewport: { flexGrow: 1 },
  mobileHeading: { flexDirection: 'column', alignItems: 'flex-start', gap: 12 },
  headingActions: { flexDirection: 'row', alignItems: 'center', flexShrink: 0, gap: 8 },
  paper: { backgroundColor: '#F8F1E5' },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12 }, headingCopy: { flexShrink: 1 }, headingTitle: { color: colors.ink, fontFamily: fonts.serif, fontWeight: '700', fontSize: 21, lineHeight: 31, letterSpacing: 0.3 }, subtitle: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, color: colors.inkSoft, marginTop: 3 },
  flipFace: { borderRadius: 20, ...faceShadow },
  stage: { alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8, zIndex: 1 }, slot: { position: 'absolute', top: 8, borderRadius: 20 },
  card: { borderRadius: 20, backgroundColor: '#FFF9F0', borderWidth: 1, borderColor: '#CDB98F', overflow: 'hidden' },
  innerFrame: { position: 'absolute', top: 4, left: 4, right: 4, bottom: 4, borderWidth: 1, borderColor: '#D8C7A4', borderRadius: 16 },
  cardLink: { flex: 1, padding: 17, paddingTop: 15 },
  cardTop: { flexDirection: 'row', alignItems: 'center', minHeight: 24, paddingRight: 30 }, badge: { color: '#FFFFFF', fontFamily: fonts.serif, fontSize: 12, lineHeight: 20, paddingHorizontal: 12, paddingVertical: 1, borderRadius: 12, overflow: 'hidden' },
  cardKind: { flex: 1, minWidth: 0, marginLeft: 8, paddingLeft: 8, borderLeftWidth: 1, borderLeftColor: '#D8C8B0', color: '#42413E', fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  cardNumber: { color: '#96702E', fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, fontWeight: '600', marginTop: 3, letterSpacing: .2 },
  title: { color: '#24313A', fontFamily: fonts.serif, fontSize: 25, lineHeight: 34, fontWeight: '700', letterSpacing: .15, paddingTop: 5 },
  coverTitle: { marginTop: 13, marginBottom: 7 },
  titleRule: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 11, marginBottom: 12 }, ruleAccent: { width: 72, height: 3, borderRadius: 2, backgroundColor: '#A67929' }, ruleRest: { flex: 1, height: 1, backgroundColor: '#E2D7C7' },
  quotation: { flexDirection: 'row', alignItems: 'flex-start', minHeight: 48 }, quoteMark: { color: '#B19152', fontFamily: fonts.serif, fontSize: 34, lineHeight: 36, width: 29 },
  summary: { flex: 1, color: '#42413E', fontFamily: fonts.serif, fontSize: 15, lineHeight: 23, fontWeight: '400', borderLeftWidth: 1, borderLeftColor: '#D8C7A4', paddingLeft: 10 },
  photoWrap: { marginTop: 17, flex: 1, minHeight: 110, borderRadius: 13, overflow: 'hidden', backgroundColor: '#E6E0D5' }, photo: { width: '100%', height: '100%' },
  readArrow: { position: 'absolute', right: 9, bottom: 9, width: 32, height: 32, borderRadius: 20, backgroundColor: '#FFFDF5', alignItems: 'center', justifyContent: 'center' }, readArrowText: { color: colors.goldDeep, fontSize: 27, lineHeight: 29 },
  save: { position: 'absolute', right: 6, top: 8, width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, focused: { borderColor: colors.gold },
  saveDiamond: { width: 22, height: 22 },
  paperEdge: { position: 'absolute', left: 0, top: 12, bottom: 12, width: 7, opacity: .35, borderRadius: 3 }, paperEdgeRight: { left: undefined, right: 0 },
  empty: { height: 300, justifyContent: 'center', alignItems: 'center' }, emptyTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 17 }, retry: { minHeight: 44, justifyContent: 'center' },
  skeletonLabel: { height: 22, width: 58, borderRadius: 12, backgroundColor: '#E9E3D8', margin: 20 }, skeletonTitle: { height: 55, marginHorizontal: 20, backgroundColor: '#EFEAE1', borderRadius: 4 }, skeletonText: { height: 32, margin: 20, backgroundColor: '#F1EDE5', borderRadius: 4 }, skeletonImage: { flex: 1, margin: 18, backgroundColor: '#E9E3D8', borderRadius: 8 },
});
