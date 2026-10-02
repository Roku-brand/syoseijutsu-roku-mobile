import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '@/constants/theme';
import { FREE_LEARNING_CASE_IDS, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { AppText } from '@/components/ui';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const photos = {
  hero: require('../../assets/upgrade/landscape-hero-portrait.webp'),
  heroDesktop: require('../../assets/upgrade/landscape-hero.webp'),
  comparison: require('../../assets/upgrade/sunlit-library.webp'),
  recommend: require('../../assets/upgrade/morning-study.webp'),
  network: require('../../assets/upgrade/dark-library.webp'),
};
const mark = require('../../assets/upgrade/complete-mark.png');
const gold = colors.gold;
const ink = colors.ink;
const freeItems = ['4つの人物像', `${FREE_REEL_TECHNIQUE_IDS.length}個の処世術`, `${FREE_THEORY_IDS.length}件の理論`, `${FREE_LEARNING_CASE_IDS.length}ケースの学習コンテンツ`];
const completeItems = ['すべての人物像', 'すべての処世術', 'すべての理論', 'すべての学習コンテンツ', '保存・関連知識もすべて'];
const recommendations = [
  'もっと多くの網羅的な処世術を探したい方',
  '処世術と理論を横断し、\n知識同士のつながりまで深めたい方',
  '人間関係・仕事・人生の知識を、\nより幅広く手元に置いておきたい方',
  '気になった処世術を蓄積し、\n自分専用の知識帳として育てたい方',
];
const questions = [
  ['月額課金ですか？', 'いいえ。一回払いで、30日間ご利用いただけます。'],
  ['自動更新されますか？', 'されません。利用期間が終わった後に、自動で課金されることはありません。'],
  ['購入後すぐに使えますか？', '決済の確認後、完全版のコンテンツをご利用いただけます。購入の反映を確認する場合は、購入履歴を復元してください。'],
  ['利用期間はいつから始まりますか？', '購入手続きが完了してから30日間ご利用いただけます。'],
  ['30日間が終わるとどうなりますか？', '利用期間の終了後は、無料版の範囲に戻ります。自動更新や追加課金はありません。'],
  ['保存した内容はどうなりますか？', '保存した内容はアカウントに残ります。無料版で閲覧できる範囲は、無料版の利用条件に従います。'],
  ['返金・キャンセルはできますか？', '購入方法によって条件が異なります。詳しくは「購入条件・返金について」をご確認ください。'],
] as const;

type IconName = 'person' | 'action' | 'theory' | 'book' | 'lock';
const iconPaths: Record<IconName, string> = {
  person: '<circle cx="12" cy="6" r="3.2"/><path d="M5 21v-3c0-4 2-6 7-6s7 2 7 6v3Z"/>',
  action: '<circle cx="15" cy="4" r="2"/><path d="m7 9 5-3 4 5 4 1M12 6l-3 8 5 3-2 5M9 14l-3 7M4 12l3-3"/>',
  theory: '<path d="M3 21V4h6M15 4h6v17H3M9 18h9M8 13l4-3 4 3v4H8Z"/><circle cx="12" cy="6" r="2.5"/>',
  book: '<path d="M12 5C9 3 6 3 2 4v15c4-1 7-1 10 1 3-2 6-2 10-1V4c-4-1-7-1-10 1Zm0 0v15M5 7h4M15 7h4"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4M12 14v3"/>',
};
function svgSource(body: string, color: string, viewBox = '0 0 24 24') {
  return { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="none" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`)}` };
}
function heroOverlay(desktop: boolean) {
  return svgSource(`<defs><linearGradient id="wash" x1="0" y1="0" x2="${desktop ? '1' : '0'}" y2="${desktop ? '0' : '1'}"><stop offset="0" stop-color="#FFFDF8" stop-opacity=".88"/><stop offset="${desktop ? '.52' : '.4'}" stop-color="#FFFDF8" stop-opacity=".66"/><stop offset="${desktop ? '.85' : '.67'}" stop-color="#FFFDF8" stop-opacity="0"/></linearGradient></defs><rect width="100" height="100" fill="url(#wash)" stroke="none"/>`, 'none', '0 0 100 100');
}
function LineIcon({ name, color = ink, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <Image source={svgSource(iconPaths[name], color)} style={{ width: size, height: size }} accessibilityElementsHidden />;
}
function Check({ small = false }: { small?: boolean }) {
  return <View style={[styles.check, small && styles.checkSmall]} accessibilityElementsHidden><AppText style={[styles.checkText, small && styles.checkTextSmall]}>✓</AppText></View>;
}
function EditionCard({ complete, desktop = false }: { complete?: boolean; desktop?: boolean }) {
  return <View testID={complete ? 'upgrade-complete-card' : 'upgrade-free-card'} style={[styles.editionCard, desktop && desktopStyles.editionCard, complete && styles.editionCardComplete]}>
    <View style={[styles.editionSeal, complete && styles.editionSealComplete]}><AppText variant="serif" style={styles.editionSealText}>禄</AppText></View>
    <AppText variant="serif" style={[styles.editionTitle, desktop && desktopStyles.editionTitle, complete && styles.editionTitleComplete]}>{complete ? '完全版' : '無料版'}</AppText>
    <AppText style={[styles.editionSubtitle, desktop && desktopStyles.editionSubtitle, complete && styles.editionSubtitleComplete]}>{complete ? '処世術禄を、まるごと使える' : 'まずは処世術禄を体験'}</AppText>
    <View style={[styles.editionItems, desktop && desktopStyles.editionItems]}>{(complete ? completeItems : freeItems).map((item, index) => <View key={item} style={[styles.editionItem, desktop && desktopStyles.editionItem, index > 0 && styles.editionDivider, complete && styles.editionDividerComplete]}><Check small={!desktop} /><AppText style={[styles.editionItemText, desktop && desktopStyles.editionItemText, complete && styles.editionItemTextComplete]}>{item}</AppText></View>)}</View>
  </View>;
}

// Code-native labels remain crisp and accessible; only the decorative threads are an SVG.
function KnowledgeNetwork({ width }: { width: number }) {
  const scale = width / 350;
  const points = [[43, 48], [36, 124], [49, 200], [306, 48], [314, 124], [303, 200], [175, 29], [175, 124], [175, 220], [92, 20], [110, 75], [90, 110], [111, 158], [92, 230], [258, 20], [239, 75], [259, 110], [238, 158], [258, 230]];
  const edges = [[0, 6], [0, 7], [1, 6], [1, 7], [1, 8], [2, 7], [2, 8], [3, 6], [3, 7], [4, 6], [4, 7], [4, 8], [5, 7], [5, 8], [6, 7], [7, 8], [9, 14], [9, 12], [9, 7], [10, 15], [10, 4], [10, 8], [11, 16], [11, 3], [11, 8], [12, 17], [12, 14], [12, 6], [13, 18], [13, 16], [13, 7], [14, 11], [14, 7], [15, 2], [15, 8], [16, 0], [16, 8], [17, 9], [17, 6], [18, 11], [18, 7]];
  const threads = edges.map(([a, b]) => `<path opacity=".32" stroke-width=".65" d="M${points[a][0]} ${points[a][1]}L${points[b][0]} ${points[b][1]}"/>`).join('') + points.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.6" fill="${gold}" stroke="none"/>`).join('');
  const nodes = [['心理学', 7, 32], ['行動科学', 0, 109], ['組織・経営論', 1, 186], ['戦略論', 275, 32], ['古典・思想', 270, 109], ['実践知', 275, 186]] as const;
  return <View style={{ width, height: 253 * scale }} testID="knowledge-network" accessibilityLabel="処世術、理論、学ぶを中心に心理学・行動科学・組織経営論・戦略論・古典思想・実践知が相互につながる知識ネットワーク">
    <Image source={svgSource(threads, gold, '0 0 350 253')} style={StyleSheet.absoluteFill} contentFit="fill" accessibilityElementsHidden />
    {nodes.map(([label, x, y]) => <View key={label} style={[styles.networkNode, { left: x * scale, top: y * scale, width: 75 * scale, height: 31 * scale }]}><AppText style={[styles.networkNodeText, { fontSize: 10 * scale }]}>{label}</AppText></View>)}
    {([['処世術', '何をするか', 'action'], ['理論', 'なぜそうするのか', 'theory'], ['学ぶ', '自分ならどうするか', 'book']] as const).map(([label, hint, icon], index) => <View key={label} style={[styles.networkCore, { left: 124 * scale, top: index * 91 * scale, width: 102 * scale, height: 68 * scale }]}><LineIcon name={icon} size={20 * scale} /><AppText variant="serif" style={[styles.networkCoreTitle, { fontSize: 15 * scale, lineHeight: 19 * scale }]}>{label}</AppText><AppText style={[styles.networkCoreHint, { fontSize: 8 * scale, lineHeight: 12 * scale }]}>{hint}</AppText></View>)}
  </View>;
}

export type UpgradeLandingProps = {
  price?: string;
  isPaid?: boolean;
  onBack: () => void;
  onPurchase: () => void;
  onTerms: () => void;
  onCommerce: () => void;
  onRestore?: () => void;
  purchaseLabel?: string;
  disabled?: boolean;
  message?: string;
  statusActions?: ReactNode;
};

export function UpgradeLanding({ price = '¥320', isPaid = false, onBack, onPurchase, onTerms, onCommerce, onRestore, purchaseLabel = '完全版を購入する', disabled = false, message, statusActions }: UpgradeLandingProps) {
  const { width: viewportWidth } = useHydratedWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.min(viewportWidth || 390, 480);
  const desktop = Platform.OS === 'web' && viewportWidth >= 960;
  const desktopWidth = Math.min(viewportWidth, 1600);
  const gutter = Math.max(48, (desktopWidth - 1120) / 2);
  const sectionSpace = desktop ? { paddingHorizontal: gutter } : undefined;
  const narrow = width < 360;
  const [expanded, setExpanded] = useState<number | null>(0);
  const [barHeight, setBarHeight] = useState(100);
  return <View style={styles.root} testID="upgrade-landing">
    <View testID={desktop ? 'upgrade-desktop-layout' : 'upgrade-mobile-layout'} style={[styles.frame, desktop && desktopStyles.frame]}>
      <View style={[styles.header, desktop && desktopStyles.header, desktop && sectionSpace]}>
        <Pressable accessibilityRole="button" accessibilityLabel="前の画面へ戻る" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><AppText style={styles.backArrow}>‹</AppText><AppText style={styles.backText}>戻る</AppText></Pressable>
        <AppText style={styles.headerTitle}>完全版を購入</AppText><View style={styles.headerBalance} />
      </View>
      <ScrollView testID="upgrade-lp-scroll" style={styles.scroll} contentContainerStyle={{ paddingBottom: barHeight + 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: desktop ? 680 : Math.max(510, width * 1.48) }]}>
          <Image loading="eager" source={desktop ? photos.heroDesktop : photos.hero} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={desktop ? { left: '50%', top: '45%' } : 'center'} accessibilityLabel="金色の夕日が差す山並みと湖、山頂から景色を眺める若い人物の後ろ姿" />
          <Image source={heroOverlay(desktop)} style={StyleSheet.absoluteFill} contentFit="fill" accessibilityElementsHidden />
          <View style={[styles.heroCopy, desktop && desktopStyles.heroCopy, desktop && sectionSpace]}>
            <View style={styles.brandRow}><Image loading="eager" source={mark} style={styles.brandMark} contentFit="contain" /><AppText variant="serif" style={styles.brandName}>処世術禄　完全版</AppText></View>
            <AppText variant="serif" accessibilityRole="header" style={[styles.heroTitle, narrow && { fontSize: 22, lineHeight: 34 }, desktop && desktopStyles.heroTitle, desktop && desktopWidth < 1200 && { fontSize: 42, lineHeight: 66 }]}>処世術禄を、{'\n'}もっと広く。もっと深く。</AppText>
            <AppText style={[styles.heroLead, desktop && desktopStyles.heroLead]}>無料版では届かなかった処世術、{'\n'}その背景、その先の学びまで。</AppText>
          </View>
          <View style={styles.heroBottomShade} />
        </View>

        <View style={[styles.comparison, desktop && desktopStyles.comparison, sectionSpace]}>
          <Image loading="eager" source={photos.comparison} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" accessibilityElementsHidden />
          <View style={styles.comparisonWash} />
          <View testID="upgrade-comparison-copy" style={desktop && desktopStyles.comparisonCopy}>
            <AppText variant="serif" accessibilityRole="header" style={[styles.heading, narrow && { fontSize: 22 }, desktop && desktopStyles.heading]}>気になった、{desktop ? '\n' : ''}その先まで。</AppText>
            <AppText style={[styles.comparisonLead, desktop && desktopStyles.body]}>無料版では、処世術禄の基本的な体験を試せます。{desktop ? '' : '\n'}完全版では、知識のつながりをより広く辿り、{desktop ? '' : '\n'}気になったテーマのその先まで学ぶことができます。</AppText>
          </View>
          <View style={[styles.editions, desktop && desktopStyles.editions]}><EditionCard desktop={desktop} /><EditionCard desktop={desktop} complete /></View>
        </View>

        <View style={[styles.recommendation, desktop && desktopStyles.recommendation, sectionSpace]}>
          <Image loading="eager" source={photos.recommend} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="bottom center" accessibilityElementsHidden />
          <View style={[styles.recommendationWash, desktop && desktopStyles.recommendationWash]} />
          <AppText variant="serif" accessibilityRole="header" style={[styles.heading, desktop && desktopStyles.heading]}>こんな方におすすめ</AppText>
          <View style={[styles.recommendationList, desktop && desktopStyles.recommendationList]}>{recommendations.map((item) => <View key={item} style={styles.recommendationItem}><Check /><AppText style={[styles.recommendationText, desktop && desktopStyles.recommendationText]}>{item}</AppText></View>)}</View>
        </View>

        <View style={[styles.knowledge, desktop && desktopStyles.knowledge, sectionSpace]}>
          <Image loading="eager" source={photos.network} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityElementsHidden />
          <View style={styles.knowledgeWash} />
          <View testID="upgrade-knowledge-copy" style={desktop && desktopStyles.knowledgeCopy}>
            <AppText variant="serif" accessibilityRole="header" style={[styles.knowledgeTitle, desktop && desktopStyles.knowledgeTitle]}>処世術禄は、{'\n'}知識をつなげて読む。</AppText>
            <AppText variant="serif" style={[styles.knowledgeSubtitle, desktop && desktopStyles.knowledgeSubtitle]}>論理性 × 網羅性 × 体系性</AppText>
            <AppText style={[styles.knowledgeDescription, desktop && desktopStyles.knowledgeDescription]}>処世術禄では、処世術を単独で読むだけではなく、{desktop ? '' : '\n'}その背景にある理論や関連する知識までつなげ、{desktop ? '' : '\n'}一つのテーマを立体的に理解できます。{'\n'}完全版では、このつながりをより広く辿れます。</AppText>
          </View>
          <View style={[styles.networkWrap, desktop && desktopStyles.networkWrap]}><KnowledgeNetwork width={desktop ? Math.min(480, (desktopWidth - gutter * 2) * 0.48) : width - 42} /></View>
        </View>

        <View style={[styles.faq, desktop && desktopStyles.faq, sectionSpace]}>
          <AppText variant="serif" accessibilityRole="header" style={[styles.heading, desktop && desktopStyles.heading, desktop && desktopStyles.faqHeading]}>よくある質問</AppText>
          <View style={[styles.faqList, desktop && desktopStyles.faqList]}>{questions.map(([question, answer], index) => {
            const open = expanded === index;
            return <View key={question} style={styles.faqItem}>
              <Pressable testID={`upgrade-faq-${index}`} accessibilityRole="button" aria-expanded={open} accessibilityState={{ expanded: open }} accessibilityLabel={question} onPress={() => setExpanded(open ? null : index)} style={({ pressed }) => [styles.faqQuestion, desktop && desktopStyles.faqQuestion, pressed && styles.pressed]}><View style={styles.questionMark}><AppText style={styles.questionMarkText}>?</AppText></View><AppText style={[styles.faqQuestionText, desktop && desktopStyles.faqQuestionText]}>{question}</AppText><AppText style={[styles.chevron, open && styles.chevronOpen]}>⌄</AppText></Pressable>
              {open ? <View style={styles.faqAnswer}><AppText style={[styles.faqAnswerText, desktop && desktopStyles.faqAnswerText]}>{answer}</AppText>{index === 2 && onRestore ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onRestore} style={styles.faqUtility}><AppText style={styles.faqUtilityText}>購入履歴を復元する</AppText></Pressable> : null}{index === 6 ? <Pressable accessibilityRole="link" onPress={onTerms} style={styles.faqUtility}><AppText style={styles.faqUtilityText}>購入条件・返金について</AppText></Pressable> : null}</View> : null}
            </View>;
          })}</View>
        </View>
      </ScrollView>

      {/* Sibling of the scroll view: pinned to the viewport, never part of the LP. */}
      <View testID="upgrade-fixed-purchase" onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)} style={[styles.purchaseBar, desktop && desktopStyles.purchaseBar, desktop && { left: gutter, right: gutter }, { paddingBottom: Math.max(insets.bottom, desktop ? 10 : 4) }]}>
        {message ? <AppText accessibilityRole="alert" style={styles.statusMessage}>{message}</AppText> : null}
        {statusActions}
        <View style={[styles.purchaseRow, desktop && desktopStyles.purchaseRow]}>
          <View style={[styles.purchasePrice, desktop && desktopStyles.purchasePrice]}><AppText style={[styles.purchaseLabel, desktop && desktopStyles.purchaseLabel]}>{isPaid ? '完全版を利用中' : '完全版（30日間）'}</AppText>{!isPaid ? <AppText variant="serif" style={[styles.purchaseAmount, desktop && desktopStyles.purchaseAmount]}>{price}</AppText> : null}<AppText style={[styles.purchaseNote, desktop && desktopStyles.purchaseNote]}>{isPaid ? '知識の、その先へ。' : '一回払い・自動更新なし'}</AppText></View>
          <View style={styles.purchaseDivider} />
          {desktop ? <AppText style={desktopStyles.purchasePromise}>知識のつながりを、もっと広く。{'\n'}すべての人物像・処世術・理論・学習コンテンツへ。</AppText> : null}
          <Pressable testID="upgrade-purchase-cta" accessibilityRole="button" disabled={disabled} onPress={onPurchase} style={({ pressed }) => [styles.purchaseButton, desktop && desktopStyles.purchaseButton, disabled && styles.disabled, pressed && styles.pressed]}><View pointerEvents="none" style={styles.purchaseButtonHighlight} /><AppText variant="serif" style={[styles.purchaseButtonText, narrow && { fontSize: 12 }, desktop && desktopStyles.purchaseButtonText]}>{isPaid ? '完全版を開く' : purchaseLabel}</AppText><AppText style={styles.purchaseArrow}>→</AppText></Pressable>
        </View>
        <View style={styles.legalLinks}><Pressable accessibilityRole="link" onPress={onTerms} style={styles.legalLink}><AppText style={[styles.legalText, desktop && desktopStyles.legalText]}>購入条件・返金について</AppText></Pressable><View style={styles.legalDot} /><Pressable accessibilityRole="link" onPress={onCommerce} style={styles.legalLink}><AppText style={[styles.legalText, desktop && desktopStyles.legalText]}>特定商取引法に基づく表記</AppText></Pressable>{onRestore && !isPaid ? <Pressable testID="upgrade-restore" accessibilityRole="button" disabled={disabled} onPress={onRestore} style={styles.legalLink}><AppText style={[styles.legalText, { textAlign: 'center' }]}>購入を復元する</AppText></Pressable> : null}</View>

      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  root: { flex: 1, minHeight: 0, backgroundColor: '#EAE7E0' },
  frame: { flex: 1, minHeight: 0, width: '100%', maxWidth: 480, alignSelf: 'center', backgroundColor: '#FBF9F4' },
  header: { height: 46, flexShrink: 0, backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E9E6E1', zIndex: 2 },
  back: { minHeight: 44, width: 76, flexDirection: 'row', alignItems: 'center', gap: 4, paddingLeft: 15 },
  backArrow: { fontSize: 26, lineHeight: 30, color: ink }, backText: { fontSize: 12, lineHeight: 18, color: ink },
  headerTitle: { fontSize: 13, lineHeight: 20, fontWeight: '600', color: ink }, headerBalance: { width: 76 },
  scroll: { flex: 1, minHeight: 0 },
  hero: { overflow: 'hidden', backgroundColor: '#DDC7A7' },
  heroWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '48%', backgroundColor: 'rgba(255,253,248,0.62)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(180deg,rgba(255,253,248,.85),rgba(255,253,248,.64) 70%,rgba(255,253,248,.15))' } }) },
  heroCopy: { paddingHorizontal: 24, paddingTop: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 33, height: 33, borderRadius: 17 }, brandName: { fontSize: 15, lineHeight: 22, color: '#111914', letterSpacing: 0.6 },
  heroTitle: { marginTop: 14, fontSize: 27, lineHeight: 40, letterSpacing: 0.1, color: '#101510', fontWeight: '800' },
  heroLead: { fontFamily: fonts.serif, marginTop: 10, fontSize: 12, lineHeight: 21, letterSpacing: 0.5, color: '#263028' },
  heroBottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '28%', backgroundColor: 'rgba(7,20,18,.25)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(0deg,rgba(7,20,18,.5),transparent)', backgroundColor: 'transparent' } }) },
  heading: { fontFamily: fonts.serif, fontSize: 26, lineHeight: 38, color: '#141C19', letterSpacing: 0.25, fontWeight: '800' },
  comparison: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 26, backgroundColor: '#F7F3EB', overflow: 'hidden' }, comparisonWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(251,248,241,.68)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(90deg,rgba(251,248,241,.97) 0%,rgba(251,248,241,.86) 57%,rgba(251,248,241,.12) 100%)', backgroundColor: 'transparent' } }) },
  comparisonLead: { fontFamily: fonts.serif, marginTop: 10, fontSize: 12, lineHeight: 21, color: '#323A35' }, editions: { flexDirection: 'row', gap: 9, marginTop: 22 },
  editionCard: { flex: 1, minWidth: 0, paddingHorizontal: 11, paddingTop: 15, paddingBottom: 16, borderRadius: 5, borderWidth: 1, borderColor: '#E6E0D5', backgroundColor: 'rgba(255,253,249,.97)',  },
  editionCardComplete: { backgroundColor: '#112422', borderColor: '#B49C68' },
  editionSeal: { width: 20, height: 20, borderWidth: 0.7, borderColor: '#D9BF91', borderRadius: 11, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, editionSealComplete: { borderColor: '#C9AE77' }, editionSealText: { color: '#C3A369', fontSize: 13, lineHeight: 18 },
  editionTitle: { textAlign: 'center', marginTop: 5, fontSize: 22, lineHeight: 31, color: '#192321' }, editionTitleComplete: { color: '#D9BC7E' }, editionSubtitle: { textAlign: 'center', marginTop: 2, fontSize: 9, lineHeight: 15, color: '#28312B' }, editionSubtitleComplete: { color: '#E0C38E' },
  editionItems: { marginTop: 13 }, editionItem: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 37, paddingVertical: 8 }, editionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBE6DD' }, editionDividerComplete: { borderTopColor: 'rgba(196,163,107,.16)' },
  editionItemText: { flex: 1, color: '#28312B', fontSize: 11, lineHeight: 18 }, editionItemTextComplete: { color: '#F4F0E7' },
  check: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#DDC18F', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }, checkSmall: { width: 13, height: 13, borderRadius: 7, marginTop: 0 }, checkText: { color: '#17312A', fontSize: 13, lineHeight: 18, fontWeight: '800' }, checkTextSmall: { fontSize: 10, lineHeight: 13 },
  recommendation: { paddingHorizontal: 25, paddingTop: 32, paddingBottom: 102, overflow: 'hidden', backgroundColor: '#F7F5E9' }, recommendationWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,254,243,.72)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(180deg,rgba(255,254,243,.83),rgba(255,254,243,.81) 67%,rgba(255,254,243,.05))', backgroundColor: 'transparent' } }) },
  recommendationList: { marginTop: 19, gap: 20 }, recommendationItem: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' }, recommendationText: { fontFamily: fonts.serif, flex: 1, fontSize: 13, lineHeight: 23, color: '#26322C' },
  knowledge: { paddingHorizontal: 23, paddingTop: 34, paddingBottom: 28, backgroundColor: '#0D1A1C', overflow: 'hidden' }, knowledgeWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,22,25,.76)' },
  knowledgeTitle: { textAlign: 'center', fontSize: 28, lineHeight: 42, fontWeight: '700', letterSpacing: 0.6, color: '#FFF9ED' }, knowledgeSubtitle: { textAlign: 'center', fontSize: 19, lineHeight: 29, marginTop: 10, color: '#D9B97C', letterSpacing: 0.5 },
  knowledgeDescription: { fontFamily: fonts.serif, marginTop: 23, fontSize: 12, lineHeight: 23, color: '#E0E4DD' }, networkWrap: { marginTop: 26, alignItems: 'center' },
  networkNode: { position: 'absolute', backgroundColor: '#0A252D', borderColor: '#3F6D7A', borderWidth: 0.7, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, networkNodeText: { color: '#F3EEDF', lineHeight: 16 },
  networkCore: { position: 'absolute', borderRadius: 40, backgroundColor: '#F4E4BE', borderWidth: 0.7, borderColor: '#D9BA7F', alignItems: 'center', justifyContent: 'center', shadowColor: '#D5B475', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }, networkCoreTitle: { color: '#192923' }, networkCoreHint: { color: '#53604E' },
  faq: { paddingHorizontal: 22, paddingTop: 29, paddingBottom: 22, backgroundColor: '#FBF9F5' }, faqList: { marginTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDDAD1' }, faqItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDDAD1' },
  faqQuestion: { minHeight: 53, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, questionMark: { width: 14, height: 14, borderWidth: 1, borderColor: '#35423E', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, questionMarkText: { fontSize: 10, lineHeight: 12, fontWeight: '600', color: '#35423E' }, faqQuestionText: { fontFamily: fonts.serif, flex: 1, fontSize: 12, lineHeight: 20, color: '#25332E', fontWeight: '600' }, chevron: { fontSize: 19, lineHeight: 22, color: '#35423E', paddingHorizontal: 3 }, chevronOpen: { transform: [{ rotate: '180deg' }] },
  faqAnswer: { paddingLeft: 24, paddingRight: 10, paddingBottom: 17 }, faqAnswerText: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 22, color: '#67716A' }, faqUtility: { minHeight: 36, justifyContent: 'center', marginTop: 7 }, faqUtilityText: { fontSize: 11, lineHeight: 18, color: '#81642F', textDecorationLine: 'underline' },
  purchaseBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 16, paddingTop: 12, backgroundColor: colors.surfaceDark, borderTopLeftRadius: radius.md, borderTopRightRadius: radius.md, borderTopWidth: 1, borderTopColor: colors.gold },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', gap: 12 }, purchasePrice: { width: '38%' }, purchaseDivider: { width: 1, height: 44, backgroundColor: colors.goldDeep }, purchaseLabel: { fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, color: colors.goldSoft }, purchaseAmount: { fontFamily: fonts.serif, fontSize: 34, lineHeight: 42, color: colors.white }, purchaseNote: { fontSize: 10, lineHeight: 16, color: '#D7D3C8' },
  purchaseButton: { flex: 1, minHeight: 48, borderRadius: radius.pill, backgroundColor: colors.gold, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 10 }, purchaseButtonHighlight: { display: 'none' }, purchaseButtonText: { fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, color: colors.white, fontWeight: '600' }, purchaseArrow: { color: colors.white, fontSize: 18, lineHeight: 22 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 3 }, legalLink: { minHeight: 32, justifyContent: 'center' }, legalText: { color: '#D3CBBB', fontSize: 10, lineHeight: 16 }, legalDot: { width: 1, height: 9, backgroundColor: '#627067' },
  statusMessage: { fontSize: 11, lineHeight: 19, color: '#F2E8D1', paddingBottom: 9 }, pressed: { opacity: 0.76 }, disabled: { opacity: 0.5 },
});

// Desktop composition has its own content proportions and horizontal sections.
// Native screens and narrow browsers retain the reference's single-column LP.
const desktopStyles = StyleSheet.create({
  frame: { maxWidth: 1600 },
  header: { height: 64 },
  heroWash: { bottom: 0, ...Platform.select({ web: { backgroundImage: 'linear-gradient(90deg, rgba(255,244,220,.78) 0%, rgba(255,244,220,.52) 33%, transparent 65%)' } }), backgroundColor: 'transparent' },
  heroCopy: { paddingTop: 62 },
  heroTitle: { marginTop: 27, fontSize: 52, lineHeight: 78, letterSpacing: 1 },
  heroLead: { marginTop: 21, fontSize: 16, lineHeight: 30, letterSpacing: 1 },
  heading: { fontSize: 36, lineHeight: 56, letterSpacing: 0.8 },
  body: { fontSize: 15, lineHeight: 29, marginTop: 22 },
  comparison: { flexDirection: 'row', alignItems: 'center', gap: 48, paddingTop: 80, paddingBottom: 80 },
  comparisonCopy: { flex: 0.9, minWidth: 0 },
  editions: { flex: 1.65, marginTop: 0, gap: 20 },
  editionCard: { paddingHorizontal: 24, paddingTop: 24, paddingBottom: 23, borderRadius: 8, minHeight: 374 },
  editionTitle: { fontSize: 30, lineHeight: 43, marginTop: 10 },
  editionSubtitle: { fontSize: 12, lineHeight: 21 },
  editionItems: { marginTop: 22 },
  editionItem: { minHeight: 46, gap: 12 },
  editionItemText: { fontSize: 14, lineHeight: 23 },
  recommendation: { paddingTop: 75, paddingBottom: 90, minHeight: 480 },
  recommendationWash: { backgroundColor: 'transparent', ...Platform.select({ web: { backgroundImage: 'linear-gradient(90deg, rgba(255,254,243,.98), rgba(255,254,243,.92) 38%, rgba(255,254,243,.22) 76%, rgba(255,254,243,.06))' } }) },
  recommendationList: { width: '58%', marginTop: 28, gap: 25 },
  recommendationText: { fontSize: 15, lineHeight: 28 },
  knowledge: { flexDirection: 'row', alignItems: 'center', gap: 60, paddingTop: 85, paddingBottom: 85, minHeight: 510 },
  knowledgeCopy: { flex: 1, minWidth: 0 },
  knowledgeTitle: { textAlign: 'left', fontSize: 38, lineHeight: 60, letterSpacing: 1 },
  knowledgeSubtitle: { textAlign: 'left', fontSize: 23, lineHeight: 36, marginTop: 20 },
  knowledgeDescription: { fontSize: 15, lineHeight: 29, marginTop: 26 },
  networkWrap: { marginTop: 0, flexShrink: 0 },
  faq: { flexDirection: 'row', alignItems: 'flex-start', gap: 70, paddingTop: 80, paddingBottom: 80 },
  faqHeading: { flex: 0.75 },
  faqList: { flex: 1.5, marginTop: 0 },
  faqQuestion: { minHeight: 62, gap: 14 },
  faqQuestionText: { fontSize: 15, lineHeight: 25 },
  faqAnswerText: { fontSize: 14, lineHeight: 26 },
  purchaseBar: { bottom: 18, paddingHorizontal: 30, paddingTop: 14, borderRadius: 14, borderWidth: 1, borderColor: '#A78B50' },
  purchaseRow: { gap: 28 },
  purchasePrice: { width: 178, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'baseline', columnGap: 14 },
  purchaseLabel: { width: '100%', fontSize: 11, lineHeight: 18 },
  purchaseAmount: { fontSize: 38, lineHeight: 44 },
  purchaseNote: { fontSize: 9, lineHeight: 14, width: '100%' },
  purchasePromise: { flex: 1, color: '#E5DBC2', fontSize: 13, lineHeight: 24 },
  purchaseButton: { flexGrow: 0, flexShrink: 0, flexBasis: 290, width: 290, minHeight: 56, borderRadius: 30 },
  purchaseButtonText: { fontSize: 18, lineHeight: 27, letterSpacing: 0.5 },
  legalText: { fontSize: 10, lineHeight: 16 },
});
