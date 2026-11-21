import { useEffect, useRef, useState } from 'react';
import { Image } from 'expo-image';
import { Animated, Platform, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { GuideCovers, GuideKnowledgeNetwork, guideWaves } from './installation-guide-art';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, fonts } from '@/constants/theme';
import type { GuideKind } from '@/onboarding/guide-provider';

const logo = require('../../assets/brand/icon.png');
const landscape = require('../../assets/welcome/guide-ink-plum.webp');
const ink = '#1B1914';
const paper = '#FBF4EA';
const gold = '#99702F';
const pages = [
  { eyebrow: '処世術禄へようこそ', title: '人生をうまく生きる\n方法を全ての人へ。', copy: '聞いたことがあるで終わらせない。' },
  { eyebrow: '知恵を、つながりで学ぶ。', title: '人物像から入り、\n処世術を学び、\n理論まで理解する。', copy: 'バラバラの知識ではなく、\n体系化された知識で学べます。' },
  { eyebrow: '学びを、自分のものに。', title: '気に入った知恵も、\n自分で見つけた答えも。', copy: 'お気に入りを残し、自分の処世術を書き留め、自分だけの処世術集を作り上げよう！' },
] as const;

export function InstallationGuide({ kind, onFinish }: { kind: GuideKind; onFinish: () => void }) {
  const [page, setPage] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const reduced = useReducedMotion();
  const fade = useRef(new Animated.Value(1)).current;
  const { width, height } = useWindowDimensions();
  const desktop = width >= 700;
  const sheetWidth = Math.min(width || 390, desktop ? Math.max(440, Math.min(510, height * .61)) : 480);
  const compact = height < 735;
  const complete = kind === 'complete';
  const slide = pages[page];
  const network = !complete && page === 1;
  const hasNext = !complete && page < pages.length - 1;
  const headingSize = Math.min(38, Math.max(23, sheetWidth * (network ? .068 : .079)));
  const next = () => hasNext ? setPage(page + 1) : onFinish();

  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    if (reduced) return;
    fade.setValue(.86);
    const animation = Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== 'web' });
    animation.start();
    return () => { animation.stop(); fade.setValue(1); };
  }, [fade, page, reduced]);

  useEffect(() => {
    if (Platform.OS !== 'web' || complete) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      if (event.key === 'ArrowLeft') setPage(value => Math.max(0, value - 1));
      if (event.key === 'ArrowRight') setPage(value => Math.min(pages.length - 1, value + 1));
      if (event.key === 'Escape' && hasNext) onFinish();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [complete, hasNext, onFinish]);

  return <SafeAreaView testID="installation-guide" edges={['top', 'bottom', 'left', 'right']} style={styles.safe}>
    <View style={[styles.sheet, { maxWidth: sheetWidth }]}>
      <View style={[styles.top, compact && styles.topCompact]}>
        <View style={styles.header}>
          <View style={styles.brand}>
            <Image source={logo} contentFit="contain" style={styles.logo} accessibilityElementsHidden aria-hidden />
            <AppText style={styles.wordmark}>処世術禄</AppText>
          </View>
          {!complete ? <View style={styles.progress} accessibilityLabel={`${pages.length}ページ中${page + 1}ページ目`}>
            <AppText testID="guide-counter" style={styles.counter}>{page + 1} / {pages.length}</AppText>
            <View aria-hidden style={styles.steps}>{pages.map((item, index) => <View key={item.eyebrow} style={[styles.step, index === page && styles.stepActive]} />)}</View>
          </View> : null}
        </View>
        {network ? <View style={styles.track} accessibilityElementsHidden aria-hidden><View style={[styles.trackFill, { width: `${(page + 1) / pages.length * 100}%` }]} /></View> : null}
      </View>

      <ScrollView ref={scroll} style={styles.scroll} contentContainerStyle={styles.body} showsVerticalScrollIndicator={false} testID="guide-scroll">
        <Animated.View style={[styles.composition, network && styles.compositionNetwork, compact && styles.compositionCompact, { opacity: fade }]}>
          {network ? <Image aria-hidden accessibilityElementsHidden source={guideWaves} contentFit="fill" style={styles.waves} /> : null}
          <View style={[styles.copy, network && styles.copyLeft]}>
            <View style={[styles.eyebrowRow, network && styles.eyebrowLeft]}>
              {!network ? <View style={styles.eyebrowRule} /> : null}
              <AppText style={[styles.eyebrow, complete && styles.completeEyebrow]}>{complete ? '処世術禄完全版へようこそ' : slide.eyebrow}</AppText>
              {!network ? <View style={styles.eyebrowRule} /> : null}
            </View>
            {complete ? <>
              <AppText style={styles.thanks}>ご購入いただきありがとうございます！</AppText>
              <AppText testID="guide-title" accessibilityRole="header" aria-level={1} style={[styles.title, { fontSize: headingSize * .98, lineHeight: headingSize * 1.38 }]}>
                論理性<AppText style={styles.multiply}> × </AppText>網羅性<AppText style={styles.multiply}> × </AppText>体系性
              </AppText>
              <View aria-hidden accessibilityElementsHidden style={styles.brushline} />
              <AppText style={styles.description}>すべての知恵を、ひとつの体系に。</AppText>
            </> : <>
              <AppText accessibilityRole="header" accessibilityLiveRegion="polite" aria-level={1} testID="guide-title" style={[styles.title, { fontSize: headingSize, lineHeight: headingSize * 1.37 }, network && styles.textLeft]}>{slide.title}</AppText>
              <AppText style={[styles.description, network && styles.textLeft]}>{slide.copy}</AppText>
            </>}
          </View>

          <View style={styles.art}>
            {network ? <>
              <Image aria-hidden accessibilityElementsHidden source={landscape} contentFit="fill" style={styles.networkLandscape} />
              <GuideKnowledgeNetwork width={sheetWidth} />
            </> : <GuideCovers width={sheetWidth} variant={complete ? 'complete' : page === 0 ? 'knowledge' : 'personal'} />}
          </View>
        </Animated.View>
      </ScrollView>

      <View style={[styles.footer, compact && styles.footerCompact]}>
        <Pressable accessibilityRole="button" testID="guide-primary" onPress={next} style={({ pressed }) => [styles.primary, complete && styles.primaryComplete, pressed && styles.pressed]}>
          <AppText style={styles.primaryText}>{hasNext ? '次へ' : 'はじめる'}</AppText>
          <AppText aria-hidden accessibilityElementsHidden style={styles.arrow}>→</AppText>
        </Pressable>
        {hasNext ? <Pressable accessibilityRole="button" testID="guide-skip" onPress={onFinish} style={({ pressed }) => [styles.skip, pressed && styles.pressed]}>
          <AppText style={styles.skipText}>スキップ</AppText>
        </Pressable> : null}
      </View>
    </View>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: paper },
  sheet: { flex: 1, minHeight: 0, width: '100%', alignSelf: 'center', overflow: 'hidden' },
  top: { paddingTop: 16, marginHorizontal: '7.5%', paddingBottom: 4 },
  topCompact: { paddingTop: 10 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logo: { width: 33, height: 33, borderRadius: 8 },
  wordmark: { fontFamily: fonts.serif, fontSize: 19, lineHeight: 29, fontWeight: '700', color: ink },
  progress: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 4 },
  counter: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, color: ink, fontVariant: ['tabular-nums'] },
  steps: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  step: { width: 17, height: 4, borderRadius: 4, backgroundColor: '#E9DCC9' },
  stepActive: { backgroundColor: '#A7782B' },
  track: { marginTop: 9, height: 3, borderRadius: 3, backgroundColor: '#E9DCC9', overflow: 'hidden' },
  trackFill: { height: '100%', backgroundColor: '#A7782B', borderRadius: 3 },
  scroll: { flex: 1, minHeight: 0 },
  body: { flexGrow: 1 },
  composition: { flexGrow: 1, paddingTop: 45, paddingBottom: 14, gap: 22 },
  compositionNetwork: { paddingTop: 17, gap: 12 },
  compositionCompact: { paddingTop: 14, gap: 10, paddingBottom: 8 },
  copy: { paddingHorizontal: '6.5%', alignItems: 'center', gap: 15, zIndex: 1 },
  copyLeft: { alignItems: 'flex-start', paddingLeft: '10%', gap: 7 },
  eyebrowRow: { width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  eyebrowLeft: { justifyContent: 'flex-start' },
  eyebrowRule: { width: '12%', height: StyleSheet.hairlineWidth, backgroundColor: '#C0A16B' },
  eyebrow: { flexShrink: 1, fontFamily: fonts.serif, fontWeight: '700', fontSize: 17, lineHeight: 25, color: gold, textAlign: 'center' },
  completeEyebrow: { color: ink, fontSize: 16 },
  title: { fontFamily: fonts.serif, color: ink, fontWeight: '700', textAlign: 'center' },
  textLeft: { textAlign: 'left' },
  description: { color: '#5E594F', fontFamily: fonts.serif, fontSize: 15, lineHeight: 24, textAlign: 'center' },
  thanks: { textAlign: 'center', color: '#625A4C', fontFamily: fonts.serif, fontSize: 14, lineHeight: 23 },
  multiply: { color: '#B88F4D' },
  brushline: { height: 2, width: '78%', marginTop: -5, transform: [{ rotate: '-1.5deg' }], backgroundColor: '#CFAD6F', borderRadius: 5 },
  art: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  waves: { position: 'absolute', top: -45, right: -20, width: 170, height: 145, opacity: .28 },
  networkLandscape: { position: 'absolute', bottom: -18, width: '100%', height: 96, opacity: .23 },
  footer: { paddingHorizontal: '7%', paddingTop: 10, paddingBottom: 20, gap: 2 },
  footerCompact: { paddingTop: 6, paddingBottom: 9 },
  primary: { minHeight: 50, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 999, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 13, backgroundColor: '#201E18' },
  primaryComplete: { borderColor: '#C6A262', borderWidth: 1.3 },
  primaryText: { color: colors.white, fontFamily: fonts.serif, fontSize: 20, lineHeight: 28, fontWeight: '700' },
  arrow: { color: '#DBB875', fontSize: 22, lineHeight: 28 },
  skip: { minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  skipText: { color: '#5E594E', fontFamily: fonts.serif, fontSize: 14, lineHeight: 20 },
  pressed: { opacity: .77 },
});
