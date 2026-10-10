import { Image } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { formatAccessDateTime, type VerifiedAccess } from '@/lib/purchase';

export type GuideKind = 'welcome' | 'complete';
type Artwork = 'welcome' | 'personas' | 'practice' | 'editions' | 'complete' | 'knowledge' | 'learning';
type Slide = { label: string; title: string; body: string; art: Artwork };
const welcome: Slide[] = [
  { label: 'ようこそ、処世術禄へ', title: '日々の判断に、\nあなたの知恵を。', body: '人間関係、仕事、人生。\n毎日に役立つ処世術と、その背景にある理論を、あなたの手元に。', art: 'welcome' },
  { label: '人物像から、見つける', title: 'なりたい自分から、\n知恵を探そう。', body: '「仕事ができる人」「自分らしく生きられる人」。人物像や気になる言葉から、今の自分に合う処世術を探せます。', art: 'personas' },
  { label: '学びを、自分のものに', title: '学んで、試して、\n自分の言葉で残す。', body: 'ケースに挑戦し、気に入った知恵は「蔵書」へ。日常での気づきは「マイ処世術」に残せます。', art: 'practice' },
  { label: 'さあ、はじめましょう', title: 'あなたに合った\n始め方で。', body: 'まずは無料で体験。\nもっと広く、深く学びたくなったら、完全版ですべての知恵を辿れます。', art: 'editions' },
];
const complete: Slide[] = [
  { label: '完全版へようこそ', title: '知恵の、その先へ。', body: 'ご購入ありがとうございます。\nすべての人物像・処世術・理論・学習コンテンツをご利用いただけます。', art: 'complete' },
  { label: 'すべての人物像を開放', title: 'なりたい自分に、\nもっと近づく。', body: 'これまで閲覧できなかった人物像も、すべて開放。人間関係・仕事・人生から、あなたが目指す人物像を選んでみましょう。', art: 'personas' },
  { label: 'すべての処世術と理論へ', title: 'ひとつの知恵から、\n理解を深める。', body: '人物像に紐づく処世術も、その背景にある理論も、すべて読めます。関連する知識を辿り、学びを広げましょう。', art: 'knowledge' },
  { label: 'すべての学習ケースへ', title: '学んだ知恵を、\n使える力に。', body: '人間関係・仕事・人生、すべてのケースに挑戦できます。まずは気になる人物像から、今日のひとつを見つけましょう。', art: 'learning' },
];

type Props = {
  kind: GuideKind;
  signedIn: boolean;
  isPaid: boolean;
  accessInfo: VerifiedAccess;
  onLater: () => void;
  onStart: () => void;
  onPersonas: () => void;
  onLogin: () => void;
  onUpgrade: () => void;
};

export function GuideDialog(props: Props) {
  const { width, height } = useHydratedWindowDimensions();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const [page, setPage] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const slides = props.kind === 'welcome' ? welcome : complete;
  const slide = slides[page];
  const last = page === slides.length - 1;
  const desktop = width >= 760;
  const compact = !desktop && height < 730;
  const stackedActions = last && props.kind === 'welcome' && !props.isPaid && !desktop;
  const pageRef = useRef(page);
  pageRef.current = page;
  const move = (delta: number) => setPage((current) => Math.max(0, Math.min(slides.length - 1, current + delta)));
  const swipe = useRef(PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dx) > 20 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.5,
    onPanResponderRelease: (_, gesture) => {
      if (Math.abs(gesture.dx) > 48) setPage(Math.max(0, Math.min(3, pageRef.current + (gesture.dx < 0 ? 1 : -1))));
    },
  })).current;

  useEffect(() => { scroll.current?.scrollTo({ y: 0, animated: false }); }, [page]);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        setPage((current) => Math.max(0, Math.min(3, current + (event.key === 'ArrowRight' ? 1 : -1))));
      }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);

  const availableHeight = Math.max(240, height - insets.top - insets.bottom - (compact ? 16 : 40));
  return <Modal transparent visible accessibilityLabel={props.kind === 'welcome' ? '処世術禄のはじめてのご案内' : '完全版のご案内'} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={props.onLater} statusBarTranslucent>
    <View style={[styles.backdrop, { paddingTop: insets.top + (compact ? 8 : 20), paddingBottom: insets.bottom + (compact ? 8 : 20) }]}>
      <View testID="guide-dialog" accessibilityViewIsModal accessibilityLabel={props.kind === 'welcome' ? '処世術禄のはじめてのご案内' : '完全版のご案内'} style={[styles.card, { height: Math.min(desktop ? 600 : 740, availableHeight) }, desktop && styles.cardDesktop]}>
        <View style={[styles.header, compact && styles.headerCompact]}>
          <View style={styles.brand}><AppText style={styles.brandSeal}>禄</AppText><AppText style={styles.brandName}>処世術禄</AppText></View>
          <AppText testID="guide-counter" accessibilityLabel={`全4ページ中${page + 1}ページ目`} style={styles.counter}>{page + 1} / 4</AppText>
          <Pressable testID="guide-later" accessibilityRole="button" onPress={props.onLater} style={({ pressed }) => [styles.quietButton, pressed && styles.pressed]}><AppText style={styles.quietText}>あとで</AppText></Pressable>
        </View>
        <ScrollView ref={scroll} style={styles.body} contentContainerStyle={[styles.bodyContent, desktop && styles.bodyDesktop]} showsVerticalScrollIndicator={false}>
          <View {...swipe.panHandlers} testID="guide-artwork" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.artwork, { height: stackedActions ? compact ? 132 : 174 : compact ? 162 : 226 }, desktop && styles.artworkDesktop]}>
            <GuideArtwork type={slide.art} complete={props.kind === 'complete'} compact={compact} />
          </View>
          <View style={[styles.copy, compact && styles.copyCompact, desktop && styles.copyDesktop]}>
            <AppText style={styles.eyebrow}>{slide.label}</AppText>
            <AppText testID="guide-title" accessibilityRole="header" aria-level={2} accessibilityLiveRegion="polite" style={[styles.title, compact && styles.titleCompact, desktop && styles.titleDesktop]}>{slide.title}</AppText>
            <AppText style={[styles.description, compact && styles.descriptionCompact]}>{slide.body}</AppText>
            {props.kind === 'complete' && page === 0 && props.accessInfo.accessType === 'thirty_day' && props.accessInfo.accessExpiresAt ? <View testID="guide-entitlement" style={styles.entitlement}>
              <AppText style={styles.expiryLabel}>利用期限</AppText><AppText style={styles.expiryDate}>{formatAccessDateTime(props.accessInfo.accessExpiresAt)}</AppText>
              <AppText style={styles.expiryNote}>自動更新はありません</AppText>
            </View> : null}
            {props.kind === 'complete' && page === 1 ? <Pressable testID="guide-personas-now" accessibilityRole="button" onPress={props.onPersonas} style={({ pressed }) => [styles.inlineAction, pressed && styles.pressed]}><AppText style={styles.inlineActionText}>今すぐ人物像一覧を見る　→</AppText></Pressable> : null}
            {last ? <AppText style={styles.lastNote}>最後のページです。準備はできました。</AppText> : null}
          </View>
        </ScrollView>
        <View style={[styles.footer, compact && styles.footerCompact, desktop && styles.footerDesktop]}>
          <View style={styles.pagination} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            {slides.map((_, index) => <View key={index} style={[styles.dot, index === page && styles.dotActive]} />)}
          </View>
          <View style={[styles.actions, stackedActions && styles.actionsStack]}>
            {page > 0 && !last ? <Pressable testID="guide-back" accessibilityRole="button" onPress={() => move(-1)} style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}><AppText style={styles.backText}>戻る</AppText></Pressable> : null}
            <Pressable testID="guide-primary" accessibilityRole="button" onPress={last ? props.onStart : () => move(1)} style={({ pressed }) => [styles.primary, stackedActions && styles.actionStackItem, pressed && styles.primaryPressed]}>
              <AppText style={styles.primaryText}>{!last ? '次へ' : props.kind === 'complete' ? '人物像一覧を見る' : props.isPaid ? 'アプリをはじめる' : '無料ではじめる'}</AppText>
              <AppText style={styles.buttonArrow} accessibilityElementsHidden>→</AppText>
            </Pressable>
            {last && props.kind === 'welcome' && !props.isPaid ? <Pressable testID="guide-upgrade" accessibilityRole="button" onPress={props.onUpgrade} style={({ pressed }) => [styles.secondary, stackedActions && styles.actionStackItem, pressed && styles.pressed]}><AppText style={styles.secondaryText}>完全版を見る</AppText></Pressable> : null}
          </View>
          {props.kind === 'welcome' && !props.signedIn ? <Pressable testID="guide-login" accessibilityRole="button" onPress={props.onLogin} style={({ pressed }) => [styles.login, pressed && styles.pressed]}><AppText style={styles.loginText}>アカウントをお持ちの方は <AppText style={styles.loginEmphasis}>ログイン</AppText></AppText></Pressable> : last ? <Pressable accessibilityRole="button" onPress={() => move(-1)} style={styles.login}><AppText style={styles.loginText}>前のページに戻る</AppText></Pressable> : null}
        </View>
      </View>
    </View>
  </Modal>;
}

function GuideArtwork({ type, complete: isComplete, compact }: { type: Artwork; complete: boolean; compact: boolean }) {
  if (type === 'welcome' || type === 'complete') return <View style={styles.cover} accessible={false}>
    <Image source={type === 'welcome' ? require('../../assets/home/machiya-night-hero.webp') : require('../../assets/upgrade/dark-library.webp')} contentFit="cover" style={StyleSheet.absoluteFill} />
    <View style={[StyleSheet.absoluteFill, styles.coverWash]} />
    <View style={styles.coverBrand}>
      <View style={styles.coverSeal}><AppText style={styles.coverSealText}>禄</AppText></View>
      <AppText style={styles.coverTitle}>処世術禄</AppText><AppText style={styles.coverCaption}>{type === 'complete' ? '完全版' : '人生をうまく生きる方法を。'}</AppText>
    </View>
    {type === 'welcome' ? <Image source={require('../../assets/learn/rokumaru-roadmap.webp')} contentFit="contain" style={styles.mascot} /> : <View style={styles.completeRule} />}
  </View>;
  if (type === 'personas') return <View style={[styles.personaArt, compact && styles.artCompact]} accessible={false}>
    <AppText style={[styles.artKicker, compact && styles.artKickerCompact]}>{isComplete ? 'すべての人物像へ' : 'あなたは、どんな人になりたい？'}</AppText>
    <View style={[styles.personaRow, compact && styles.personaRowCompact]}>
      {[
        { name: '印象が\nいい人', category: '人間関係', image: require('../../assets/personas/persona-01.webp') },
        { name: '仕事が\nできる人', category: '仕事', image: require('../../assets/personas/persona-14.webp') },
        { name: '自分らしく\n生きられる人', category: '人生', image: require('../../assets/personas/persona-21.webp') },
      ].map((item) => <View key={item.category} style={styles.personaTile}>
        <Image source={item.image} contentFit="cover" style={StyleSheet.absoluteFill} />
        <View style={styles.personaLabel}><AppText style={styles.personaCategory}>{item.category}</AppText><AppText style={styles.personaName}>{item.name}</AppText></View>
      </View>)}
    </View>
  </View>;
  if (type === 'editions') return <View style={styles.editionsArt} accessible={false}>
    {!compact ? <AppText style={styles.artKicker}>あなたのペースで、学びを。</AppText> : null}
    <View style={styles.editionRow}>
      <View style={styles.edition}><AppText style={styles.editionLabel}>無料版</AppText><AppText style={styles.editionTitle}>{'気軽に、\n無料で体験'}</AppText><AppText style={styles.editionNote}>基本の体験</AppText></View>
      <View style={[styles.edition, styles.editionComplete]}><AppText style={[styles.editionLabel, styles.goldText]}>完全版</AppText><AppText style={styles.editionTitle}>{'すべてを、\n深く学ぶ。'}</AppText><AppText style={styles.editionNote}>全コンテンツ</AppText></View>
    </View>
  </View>;
  if (type === 'learning') return <View style={[styles.learningArt, compact && styles.artCompact]} accessible={false}>
    <AppText style={[styles.artKicker, compact && styles.artKickerCompact]}>学びを、日々の判断へ。</AppText>
    {['人間関係', '仕事', '人生'].map((label, index) => <View key={label} style={[styles.stageRow, compact && styles.stageRowCompact]}><AppText style={[styles.stageNumber, compact && styles.stageNumberCompact]}>0{index + 1}</AppText><View style={styles.stageCopy}><AppText style={styles.stageTitle}>{label}</AppText>{!compact ? <AppText style={styles.stageNote}>ケースから、判断を学ぶ</AppText> : null}</View><AppText style={styles.stageArrow}>→</AppText></View>)}
  </View>;
  if (type === 'knowledge') return <View style={[styles.knowledgeArt, compact && styles.artCompact]} accessible={false}>
    <Image source={require('../../assets/home/theory-lineage-washi.webp')} style={StyleSheet.absoluteFill} contentFit="cover" />
    <View style={[StyleSheet.absoluteFill, styles.knowledgeWash]} />
    <View style={[styles.knowledgeNode, compact && styles.knowledgeNodeCompact]}><AppText style={styles.nodeLabel}>処世術</AppText><AppText style={[styles.nodeTitle, compact && styles.nodeTitleCompact]}>日常で使える知恵</AppText></View>
    <View style={[styles.connector, compact && styles.connectorCompact]} />
    <View style={[styles.knowledgeNode, styles.knowledgeNodeGold, compact && styles.knowledgeNodeCompact]}><AppText style={styles.nodeLabel}>背景の理論</AppText><AppText style={[styles.nodeTitle, compact && styles.nodeTitleCompact]}>なぜ役立つのかを知る</AppText></View>
    <View style={[styles.connector, compact && styles.connectorCompact]} />
    <AppText style={styles.knowledgeEnd}>関連する知識へ、学びがつながる</AppText>
  </View>;
  if (compact) return <View style={styles.practiceCompact} accessible={false}>
    <AppText style={[styles.artKicker, styles.artKickerCompact]}>知恵を、あなたのものに。</AppText>
    <View style={styles.practiceConceptRow}>{[
      ['学ぶ', 'ケースに挑戦'], ['保存', '蔵書で読み返す'], ['記す', 'マイ処世術へ'],
    ].map(([label, note], index) => <View key={label} style={styles.practiceConcept}><AppText style={styles.conceptNumber}>0{index + 1}</AppText><AppText style={styles.conceptLabel}>{label}</AppText><AppText style={styles.conceptNote}>{note}</AppText></View>)}</View>
  </View>;
  return <View style={styles.practiceArt} accessible={false}>
    <View style={styles.libraryPreview}><View style={styles.previewHeading}><AppText style={styles.previewTitle}>蔵書</AppText><AppText style={styles.previewTag}>気に入った知恵を、手元に</AppText></View>
      {['人との距離を、少しずつ縮める', '大切なことから、一つずつ'].map((label, index) => <View key={label} style={styles.bookRow}><AppText style={styles.bookNumber}>0{index + 1}</AppText><AppText style={styles.bookTitle}>{label}</AppText><View style={styles.bookMark} /></View>)}
    </View>
    <View style={styles.memoPreview}><AppText style={styles.memoLabel}>マイ処世術</AppText><AppText style={styles.memoTitle}>{'一呼吸おいて、\n最後まで話を聞く。'}</AppText><AppText style={styles.memoCaption}>気づきを、自分の言葉で。</AppText></View>
  </View>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, backgroundColor: 'rgba(20,20,17,0.58)' },
  card: { width: '100%', maxWidth: 520, overflow: 'hidden', borderRadius: 24, backgroundColor: colors.surface, shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 36, shadowOffset: { width: 0, height: 16 }, elevation: 18 },
  cardDesktop: { maxWidth: 940, borderRadius: 28 },
  header: { height: 64, flexShrink: 0, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  headerCompact: { height: 54, paddingHorizontal: 18 },
  brand: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  brandSeal: { width: 24, height: 24, lineHeight: 23, textAlign: 'center', color: colors.goldDeep, borderWidth: 1, borderColor: colors.goldSoft, borderRadius: 5, fontFamily: fonts.serif, fontSize: 17 },
  brandName: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, letterSpacing: 1.5 },
  counter: { color: '#625D53', fontSize: 12, fontWeight: '600', letterSpacing: 1 },
  quietButton: { minWidth: 54, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  quietText: { color: '#625D53', fontSize: 13 },
  body: { flex: 1, minHeight: 0 },
  bodyContent: { flexGrow: 1 },
  bodyDesktop: { flexDirection: 'row', alignItems: 'stretch' },
  artwork: { margin: 16, marginBottom: 0, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.paperDeep, flexShrink: 0 },
  artworkDesktop: { width: '43%', height: 'auto', minHeight: 340, margin: 20, marginRight: 0, marginBottom: 20 },
  copy: { paddingHorizontal: 28, paddingTop: 24, paddingBottom: 18 },
  copyCompact: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 14 },
  copyDesktop: { flex: 1, paddingHorizontal: 36, paddingVertical: 36, justifyContent: 'center' },
  eyebrow: { fontSize: 11, lineHeight: 18, fontWeight: '600', letterSpacing: 1, color: colors.goldDeep },
  title: { marginTop: 10, fontFamily: fonts.serif, fontSize: 29, lineHeight: 43, color: colors.ink, letterSpacing: 0.2 },
  titleCompact: { fontSize: 25, lineHeight: 36, marginTop: 8 },
  titleDesktop: { fontSize: 32, lineHeight: 48 },
  description: { marginTop: 16, color: '#5A554B', fontSize: 14, lineHeight: 25 },
  descriptionCompact: { marginTop: 10, fontSize: 13, lineHeight: 22 },
  entitlement: { marginTop: 22, paddingTop: 16, borderTopWidth: 1, borderTopColor: colors.line },
  expiryLabel: { color: colors.muted, fontSize: 11, lineHeight: 18 },
  expiryDate: { marginTop: 3, color: colors.ink, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  expiryNote: { marginTop: 5, color: '#625D53', fontSize: 12, lineHeight: 19 },
  inlineAction: { alignSelf: 'flex-start', minHeight: 44, marginTop: 14, justifyContent: 'center', borderRadius: 6 },
  inlineActionText: { fontSize: 13, color: colors.goldDeep, fontWeight: '600' },
  lastNote: { marginTop: 14, color: '#625D53', fontSize: 11, lineHeight: 18 },
  footer: { flexShrink: 0, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  footerCompact: { paddingHorizontal: 18, paddingTop: 10, paddingBottom: 6 },
  footerDesktop: { paddingHorizontal: 36, paddingTop: 16, paddingBottom: 16 },
  pagination: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, height: 12, marginBottom: 12 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#D8D0C2' },
  dotActive: { width: 20, backgroundColor: colors.goldDeep },
  actions: { flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  actionsStack: { flexDirection: 'column', gap: 8 },
  actionStackItem: { flex: 0, minHeight: 48 },
  primary: { flex: 1, minHeight: 50, paddingHorizontal: 20, borderRadius: 12, backgroundColor: colors.ink, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16 },
  primaryText: { color: colors.surface, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  buttonArrow: { color: '#D2B985', fontSize: 20, lineHeight: 25 },
  backButton: { minWidth: 64, minHeight: 50, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  backText: { color: '#625D53', fontSize: 13 },
  secondary: { flex: 1, minHeight: 50, paddingHorizontal: 10, borderRadius: 12, borderWidth: 1, borderColor: '#CDB58C', backgroundColor: '#F6EFE3', alignItems: 'center', justifyContent: 'center' },
  secondaryText: { color: colors.goldDeep, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  login: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 3, borderRadius: 8 },
  loginText: { color: '#625D53', fontSize: 11, lineHeight: 20 },
  loginEmphasis: { fontSize: 12, color: colors.ink, fontWeight: '600', textDecorationLine: 'underline' },
  pressed: { opacity: 0.65 },
  primaryPressed: { backgroundColor: '#37342E' },
  cover: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  coverWash: { backgroundColor: 'rgba(20,17,12,0.42)' },
  coverBrand: { alignItems: 'center', marginBottom: 14 },
  coverSeal: { width: 54, height: 54, borderRadius: 13, borderWidth: 1, borderColor: '#D5B779', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(20,17,12,0.25)' },
  coverSealText: { fontFamily: fonts.serif, color: '#E9D5AD', fontSize: 34, lineHeight: 43 },
  coverTitle: { marginTop: 15, fontFamily: fonts.serif, fontSize: 24, lineHeight: 34, letterSpacing: 6, color: '#FFF7E9' },
  coverCaption: { marginTop: 8, color: '#E4D2AF', fontSize: 10, lineHeight: 18, letterSpacing: 2 },
  mascot: { position: 'absolute', width: 145, height: 99, bottom: -5, right: -7 },
  completeRule: { width: 44, height: 1, backgroundColor: '#BD9B60', marginTop: 6 },
  personaArt: { flex: 1, padding: 16, justifyContent: 'center' },
  artKicker: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, textAlign: 'center', marginBottom: 14 },
  artKickerCompact: { fontSize: 10, lineHeight: 16, marginBottom: 8 },
  artCompact: { paddingVertical: 10 },
  personaRow: { flexDirection: 'row', gap: 8, height: '72%', maxHeight: 220, minHeight: 115 },
  personaRowCompact: { height: '70%', minHeight: 96, maxHeight: 110 },
  personaTile: { flex: 1, overflow: 'hidden', borderRadius: 9, backgroundColor: '#E5DCC9' },
  personaLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 8, backgroundColor: 'rgba(255,253,248,0.94)' },
  personaCategory: { color: colors.goldDeep, fontSize: 9, lineHeight: 14 },
  personaName: { marginTop: 2, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18 },
  editionsArt: { flex: 1, padding: 14, justifyContent: 'center' },
  editionRow: { flexDirection: 'row', gap: 10 },
  edition: { flex: 1, paddingHorizontal: 11, paddingVertical: 10, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 12 },
  editionComplete: { borderColor: '#CDB58C', backgroundColor: '#FBF5E8' },
  editionLabel: { color: '#625D53', fontSize: 10, lineHeight: 16, fontWeight: '600' },
  goldText: { color: colors.goldDeep },
  editionTitle: { marginTop: 8, fontFamily: fonts.serif, color: colors.ink, fontSize: 13, lineHeight: 20 },
  editionNote: { marginTop: 8, color: '#625D53', fontSize: 9, lineHeight: 16 },
  learningArt: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 14 },
  stageRow: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#D7CBB6' },
  stageRowCompact: { paddingVertical: 5 },
  stageNumber: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 22, lineHeight: 30 },
  stageNumberCompact: { fontSize: 19, lineHeight: 24 },
  stageCopy: { flex: 1 },
  stageTitle: { fontFamily: fonts.serif, color: colors.ink, fontSize: 15, lineHeight: 22 },
  stageNote: { color: '#625D53', fontSize: 9, lineHeight: 16 },
  stageArrow: { color: colors.goldDeep, fontSize: 18 },
  knowledgeArt: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  knowledgeWash: { backgroundColor: 'rgba(246,240,229,0.84)' },
  knowledgeNode: { width: '90%', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#D9CDB8', backgroundColor: colors.surface },
  knowledgeNodeCompact: { paddingVertical: 6 },
  knowledgeNodeGold: { borderColor: '#B69460', backgroundColor: '#FBF3E1' },
  nodeLabel: { color: colors.goldDeep, fontSize: 10, lineHeight: 15 },
  nodeTitle: { marginTop: 3, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 22 },
  nodeTitleCompact: { fontSize: 12, lineHeight: 18 },
  connector: { width: 1, height: 15, backgroundColor: '#B69460' },
  connectorCompact: { height: 8 },
  knowledgeEnd: { color: colors.goldDeep, fontSize: 10, lineHeight: 18 },
  practiceArt: { flex: 1, justifyContent: 'center', padding: 14, gap: 8 },
  practiceCompact: { flex: 1, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  practiceConceptRow: { flexDirection: 'row', gap: 8 },
  practiceConcept: { flex: 1, paddingHorizontal: 6, paddingVertical: 12, borderWidth: 1, borderColor: '#D7CBB6', borderRadius: 10, backgroundColor: colors.surface, alignItems: 'center' },
  conceptNumber: { color: colors.goldDeep, fontSize: 10, lineHeight: 15 },
  conceptLabel: { marginTop: 6, fontFamily: fonts.serif, color: colors.ink, fontSize: 17, lineHeight: 25 },
  conceptNote: { marginTop: 6, fontSize: 8, lineHeight: 14, color: '#625D53' },
  libraryPreview: { borderWidth: 1, borderColor: '#DFD5C6', borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 14, paddingVertical: 9 },
  previewHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  previewTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 22 },
  previewTag: { color: '#625D53', fontSize: 8, lineHeight: 14 },
  bookRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  bookNumber: { color: colors.goldDeep, fontSize: 10 },
  bookTitle: { flex: 1, color: '#5A554B', fontSize: 10, lineHeight: 18 },
  bookMark: { width: 6, height: 10, backgroundColor: '#B19361', borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  memoPreview: { paddingHorizontal: 18, paddingVertical: 8, borderLeftWidth: 2, borderLeftColor: '#AE8F55', backgroundColor: '#ECE2CF' },
  memoLabel: { color: colors.goldDeep, fontSize: 9, lineHeight: 15 },
  memoTitle: { marginTop: 3, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21 },
  memoCaption: { marginTop: 5, color: '#625D53', fontSize: 9, lineHeight: 15 },
});
