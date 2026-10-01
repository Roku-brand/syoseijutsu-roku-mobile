import { Image } from 'expo-image';
import { useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

const photos = {
  hero: require('../../assets/upgrade/landscape-hero-portrait.webp'),
  comparison: require('../../assets/upgrade/sunlit-library.webp'),
  recommend: require('../../assets/upgrade/morning-study.webp'),
  network: require('../../assets/upgrade/dark-library.webp'),
};
const mark = require('../../assets/upgrade/complete-mark.png');
const gold = '#C4A36B';
const ink = '#14201F';
const freeItems = ['4つの人物像', '95個の処世術', '151件の理論', '1ケースの学習コンテンツ'];
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
  return { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${body}</svg>`)}` };
}
function LineIcon({ name, color = ink, size = 22 }: { name: IconName; color?: string; size?: number }) {
  return <Image source={svgSource(iconPaths[name], color)} style={{ width: size, height: size }} accessibilityElementsHidden />;
}
function Check({ small = false }: { small?: boolean }) {
  return <View style={[styles.check, small && styles.checkSmall]} accessibilityElementsHidden><AppText style={[styles.checkText, small && styles.checkTextSmall]}>✓</AppText></View>;
}
function Phone({ complete, width }: { complete?: boolean; width: number }) {
  const rows = [['person', '人物像'], ['action', '処世術'], ['theory', '理論'], ['book', '学習ケース']] as const;
  return <View style={[styles.phone, { width, height: width * 2.12, transform: [{ rotate: complete ? '3deg' : '-5deg' }] }, complete && styles.phoneComplete]} accessibilityLabel={complete ? 'すべての知識が開放された完全版のスマートフォン' : 'ロックのある無料版のスマートフォン'}>
    <View style={styles.phoneNotch} />
    <View style={[styles.phoneScreen, complete && styles.phoneScreenComplete]}>
      <AppText style={[styles.phoneStatus, complete && styles.phoneStatusComplete]}>9:41</AppText>
      {complete ? <Image loading="eager" source={mark} style={styles.phoneMark} contentFit="contain" /> : <View style={styles.phoneMarkSpace} />}
      <AppText variant="serif" style={[styles.phoneTitle, complete && styles.phoneTitleComplete]}> {complete ? '完全版' : '無料版'} </AppText>
      <View style={[styles.phoneRows, complete && styles.phoneRowsComplete]}>{rows.map(([icon, title]) => <View key={title} style={styles.phoneRow}>
        <LineIcon name={icon} size={width * 0.16} />
        <View style={styles.phoneRowCopy}><AppText style={[styles.phoneRowTitle, { fontSize: width * 0.079 }]}>{title}</AppText>{complete ? <AppText style={[styles.phoneRowHint, { fontSize: width * 0.053 }]}>すべて利用可能</AppText> : null}</View>
        {!complete ? <LineIcon name="lock" color="#B48B45" size={width * 0.1} /> : null}
      </View>)}</View>
      <View style={styles.phoneHome} />
    </View>
  </View>;
}
function EditionCard({ complete }: { complete?: boolean }) {
  return <View style={[styles.editionCard, complete && styles.editionCardComplete]}>
    <View style={[styles.editionSeal, complete && styles.editionSealComplete]}><AppText variant="serif" style={styles.editionSealText}>禄</AppText></View>
    <AppText variant="serif" style={[styles.editionTitle, complete && styles.editionTitleComplete]}>{complete ? '完全版' : '無料版'}</AppText>
    <AppText style={[styles.editionSubtitle, complete && styles.editionSubtitleComplete]}>{complete ? '処世術禄を、まるごと使える' : 'まずは処世術禄を体験'}</AppText>
    <View style={styles.editionItems}>{(complete ? completeItems : freeItems).map((item, index) => <View key={item} style={[styles.editionItem, index > 0 && styles.editionDivider, complete && styles.editionDividerComplete]}><Check small /><AppText style={[styles.editionItemText, complete && styles.editionItemTextComplete]}>{item}</AppText></View>)}</View>
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

export function UpgradeLanding({ price = '¥320', onBack, onPurchase, onTerms, onCommerce, onRestore, purchaseLabel = '完全版を購入する', disabled = false, message, statusActions }: UpgradeLandingProps) {
  const { width: viewportWidth } = useHydratedWindowDimensions();
  const insets = useSafeAreaInsets();
  const width = Math.min(viewportWidth || 390, 480);
  const narrow = width < 360;
  const [expanded, setExpanded] = useState<number | null>(0);
  const [barHeight, setBarHeight] = useState(100);
  return <View style={styles.root} testID="upgrade-landing">
    <View style={styles.frame}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="前の画面に戻る" onPress={onBack} style={({ pressed }) => [styles.back, pressed && styles.pressed]}><AppText style={styles.backArrow}>‹</AppText><AppText style={styles.backText}>戻る</AppText></Pressable>
        <AppText style={styles.headerTitle}>完全版を購入</AppText><View style={styles.headerBalance} />
      </View>
      <ScrollView testID="upgrade-lp-scroll" style={styles.scroll} contentContainerStyle={{ paddingBottom: barHeight + 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { height: width * 1.27 }]}>
          <Image loading="eager" source={photos.hero} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="center" accessibilityLabel="金色の夕日が差す山並みと湖、山頂から景色を眺める若い人物の後ろ姿" />
          <View style={styles.heroWash} />
          <View style={styles.heroCopy}>
            <View style={styles.brandRow}><Image loading="eager" source={mark} style={styles.brandMark} contentFit="contain" /><AppText variant="serif" style={styles.brandName}>処世術禄　完全版</AppText></View>
            <AppText variant="serif" accessibilityRole="header" style={[styles.heroTitle, narrow && { fontSize: 22, lineHeight: 34 }]}>処世術禄を、{'\n'}もっと広く。もっと深く。</AppText>
            <AppText style={styles.heroLead}>無料版では届かなかった処世術、{'\n'}その背景、その先の学びまで。</AppText>
          </View>
          <View style={styles.heroBottomShade} />
          <View style={styles.phones}><Phone width={width * 0.265} /><AppText style={styles.upgradeArrow}>➜</AppText><Phone complete width={width * 0.287} /></View>
          <View style={styles.heroPrice}><AppText variant="serif" style={styles.heroPriceLabel}>完全版（30日間）</AppText><AppText variant="serif" style={[styles.heroPriceAmount, narrow && { fontSize: 32 }]}>{price}</AppText><AppText style={styles.heroPriceNote}>一回払い・自動更新なし</AppText></View>
        </View>

        <View style={styles.comparison}>
          <Image loading="eager" source={photos.comparison} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="right center" accessibilityElementsHidden />
          <View style={styles.comparisonWash} />
          <AppText variant="serif" accessibilityRole="header" style={[styles.heading, narrow && { fontSize: 22 }]}>気になった、その先まで。</AppText>
          <AppText style={styles.comparisonLead}>無料版では、処世術禄の基本的な体験を試せます。{'\n'}完全版では、知識のつながりをより広く辿り、{'\n'}気になったテーマのその先まで学ぶことができます。</AppText>
          <View style={styles.editions}><EditionCard /><EditionCard complete /></View>
        </View>

        <View style={styles.recommendation}>
          <Image loading="eager" source={photos.recommend} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition="bottom center" accessibilityElementsHidden />
          <View style={styles.recommendationWash} />
          <AppText variant="serif" accessibilityRole="header" style={styles.heading}>こんな方におすすめ</AppText>
          <View style={styles.recommendationList}>{recommendations.map((item) => <View key={item} style={styles.recommendationItem}><Check /><AppText style={styles.recommendationText}>{item}</AppText></View>)}</View>
        </View>

        <View style={styles.knowledge}>
          <Image loading="eager" source={photos.network} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityElementsHidden />
          <View style={styles.knowledgeWash} />
          <AppText variant="serif" accessibilityRole="header" style={styles.knowledgeTitle}>処世術禄は、{'\n'}知識をつなげて読む。</AppText>
          <AppText variant="serif" style={styles.knowledgeSubtitle}>論理性 × 網羅性 × 体系性</AppText>
          <AppText style={styles.knowledgeDescription}>処世術禄では、処世術を単独で読むだけではなく、{'\n'}その背景にある理論や関連する知識までつなげ、{'\n'}一つのテーマを立体的に理解できます。{'\n'}完全版では、このつながりをより広く辿れます。</AppText>
          <View style={styles.networkWrap}><KnowledgeNetwork width={width - 42} /></View>
        </View>

        <View style={styles.faq}>
          <AppText variant="serif" accessibilityRole="header" style={styles.heading}>よくある質問</AppText>
          <View style={styles.faqList}>{questions.map(([question, answer], index) => {
            const open = expanded === index;
            return <View key={question} style={styles.faqItem}>
              <Pressable testID={`upgrade-faq-${index}`} accessibilityRole="button" aria-expanded={open} accessibilityState={{ expanded: open }} accessibilityLabel={question} onPress={() => setExpanded(open ? null : index)} style={({ pressed }) => [styles.faqQuestion, pressed && styles.pressed]}><View style={styles.questionMark}><AppText style={styles.questionMarkText}>?</AppText></View><AppText style={styles.faqQuestionText}>{question}</AppText><AppText style={[styles.chevron, open && styles.chevronOpen]}>⌄</AppText></Pressable>
              {open ? <View style={styles.faqAnswer}><AppText style={styles.faqAnswerText}>{answer}</AppText>{index === 2 && onRestore ? <Pressable accessibilityRole="button" disabled={disabled} onPress={onRestore} style={styles.faqUtility}><AppText style={styles.faqUtilityText}>購入履歴を復元する</AppText></Pressable> : null}{index === 6 ? <Pressable accessibilityRole="link" onPress={onTerms} style={styles.faqUtility}><AppText style={styles.faqUtilityText}>購入条件・返金について</AppText></Pressable> : null}</View> : null}
            </View>;
          })}</View>
        </View>
      </ScrollView>

      {/* Sibling of the scroll view: pinned to the viewport, never part of the LP. */}
      <View testID="upgrade-fixed-purchase" onLayout={(event) => setBarHeight(event.nativeEvent.layout.height)} style={[styles.purchaseBar, { paddingBottom: Math.max(insets.bottom, 4) }]}>
        {message ? <AppText accessibilityRole="alert" style={styles.statusMessage}>{message}</AppText> : null}
        {statusActions}
        <View style={styles.purchaseRow}>
          <View style={styles.purchasePrice}><AppText style={styles.purchaseLabel}>完全版（30日間）</AppText><AppText variant="serif" style={styles.purchaseAmount}>{price}</AppText><AppText style={styles.purchaseNote}>一回払い・自動更新なし</AppText></View>
          <Pressable testID="upgrade-purchase-cta" accessibilityRole="button" disabled={disabled} onPress={onPurchase} style={({ pressed }) => [styles.purchaseButton, disabled && styles.disabled, pressed && styles.pressed]}><View pointerEvents="none" style={styles.purchaseButtonHighlight} /><AppText variant="serif" style={[styles.purchaseButtonText, narrow && { fontSize: 12 }]}>{purchaseLabel}</AppText><AppText style={styles.purchaseArrow}>→</AppText></Pressable>
        </View>
        <View style={styles.legalLinks}><Pressable accessibilityRole="link" onPress={onTerms} style={styles.legalLink}><AppText style={styles.legalText}>購入条件・返金について</AppText></Pressable><View style={styles.legalDot} /><Pressable accessibilityRole="link" onPress={onCommerce} style={styles.legalLink}><AppText style={styles.legalText}>特定商取引法に基づく表記</AppText></Pressable></View>
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
  heroWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: '48%', backgroundColor: 'rgba(255,246,227,0.12)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(100deg,rgba(255,244,223,.28),rgba(255,244,223,.10) 68%,transparent)' } }) },
  heroCopy: { paddingHorizontal: 25, paddingTop: 16 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 9 }, brandMark: { width: 33, height: 33, borderRadius: 17 }, brandName: { fontSize: 15, lineHeight: 22, color: '#111914', letterSpacing: 0.6 },
  heroTitle: { marginTop: 14, fontSize: 27, lineHeight: 40, letterSpacing: 0.1, color: '#101510', fontWeight: '800' },
  heroLead: { marginTop: 10, fontSize: 12, lineHeight: 21, letterSpacing: 0.5, color: '#263028' },
  heroBottomShade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: '28%', backgroundColor: 'rgba(7,20,18,.25)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(0deg,rgba(7,20,18,.5),transparent)', backgroundColor: 'transparent' } }) },
  phones: { position: 'absolute', left: 18, bottom: -12, flexDirection: 'row', gap: 15, alignItems: 'flex-end' },
  upgradeArrow: { position: 'absolute', left: '44%', top: '43%', fontSize: 27, lineHeight: 36, color: '#E8C58A', zIndex: 2, transform: [{ rotate: '22deg' }] },
  phone: { padding: 3, borderRadius: 20, borderWidth: 1.5, borderColor: '#AAA79F', backgroundColor: '#161B1B', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 9, shadowOffset: { width: 2, height: 5 }, elevation: 7, overflow: 'hidden' },
  phoneComplete: { borderColor: '#9B9482' }, phoneScreen: { flex: 1, paddingHorizontal: 5, backgroundColor: '#E1E0D9', borderRadius: 15, overflow: 'hidden' }, phoneScreenComplete: { backgroundColor: '#142221' },
  phoneNotch: { position: 'absolute', zIndex: 2, top: 3, left: '25%', width: '50%', height: 11, backgroundColor: '#131817', borderBottomLeftRadius: 10, borderBottomRightRadius: 10 },
  phoneStatus: { marginTop: 3, marginLeft: 4, fontSize: 4.5, lineHeight: 9, color: '#25302D' }, phoneStatusComplete: { color: '#D5D7CE' },
  phoneMark: { width: 15, height: 15, alignSelf: 'center', marginTop: 5, borderRadius: 8 }, phoneMarkSpace: { height: 20 },
  phoneTitle: { fontSize: 13, lineHeight: 18, color: '#1A2523', textAlign: 'center', marginBottom: 9 }, phoneTitleComplete: { color: '#D5BA7D' },
  phoneRows: { backgroundColor: '#F4F3ED', borderRadius: 4, paddingHorizontal: 5, paddingVertical: 3 }, phoneRowsComplete: { backgroundColor: '#F5EFDF' },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 5, height: 30, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DFDED6' }, phoneRowCopy: { flex: 1 }, phoneRowTitle: { color: '#25302D', lineHeight: 13 }, phoneRowHint: { color: '#786E5E', lineHeight: 8 },
  phoneHome: { position: 'absolute', bottom: 5, left: '32%', width: '36%', height: 2, borderRadius: 2, backgroundColor: '#91998E' },
  heroPrice: { position: 'absolute', right: 13, bottom: 31, width: '28%' }, heroPriceLabel: { fontSize: 11, lineHeight: 18, color: '#E2C388' }, heroPriceAmount: { color: '#FFF9EC', fontSize: 38, lineHeight: 50, letterSpacing: -1 }, heroPriceNote: { marginTop: 2, fontSize: 7.5, lineHeight: 12, color: '#FFF9EC' },
  heading: { fontSize: 26, lineHeight: 38, color: '#141C19', letterSpacing: 0.25, fontWeight: '800' },
  comparison: { paddingHorizontal: 22, paddingTop: 28, paddingBottom: 26, backgroundColor: '#F7F3EB', overflow: 'hidden' }, comparisonWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(251,248,241,.68)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(90deg,rgba(251,248,241,.97) 0%,rgba(251,248,241,.86) 57%,rgba(251,248,241,.12) 100%)', backgroundColor: 'transparent' } }) },
  comparisonLead: { marginTop: 10, fontSize: 12, lineHeight: 21, color: '#323A35' }, editions: { flexDirection: 'row', gap: 9, marginTop: 22 },
  editionCard: { flex: 1, minWidth: 0, paddingHorizontal: 11, paddingTop: 15, paddingBottom: 16, borderRadius: 5, borderWidth: 1, borderColor: '#E6E0D5', backgroundColor: 'rgba(255,253,249,.97)', shadowColor: '#503E24', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  editionCardComplete: { backgroundColor: '#112422', borderColor: '#B49C68' },
  editionSeal: { width: 20, height: 20, borderWidth: 0.7, borderColor: '#D9BF91', borderRadius: 11, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' }, editionSealComplete: { borderColor: '#C9AE77' }, editionSealText: { color: '#C3A369', fontSize: 13, lineHeight: 18 },
  editionTitle: { textAlign: 'center', marginTop: 5, fontSize: 22, lineHeight: 31, color: '#192321' }, editionTitleComplete: { color: '#D9BC7E' }, editionSubtitle: { textAlign: 'center', marginTop: 2, fontSize: 9, lineHeight: 15, color: '#28312B' }, editionSubtitleComplete: { color: '#E0C38E' },
  editionItems: { marginTop: 13 }, editionItem: { flexDirection: 'row', gap: 8, alignItems: 'center', minHeight: 37, paddingVertical: 8 }, editionDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EBE6DD' }, editionDividerComplete: { borderTopColor: 'rgba(196,163,107,.16)' },
  editionItemText: { flex: 1, color: '#28312B', fontSize: 11, lineHeight: 18 }, editionItemTextComplete: { color: '#F4F0E7' },
  check: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#DDC18F', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 3 }, checkSmall: { width: 13, height: 13, borderRadius: 7, marginTop: 0 }, checkText: { color: '#17312A', fontSize: 13, lineHeight: 18, fontWeight: '800' }, checkTextSmall: { fontSize: 10, lineHeight: 13 },
  recommendation: { paddingHorizontal: 25, paddingTop: 32, paddingBottom: 102, overflow: 'hidden', backgroundColor: '#F7F5E9' }, recommendationWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(255,254,243,.72)', ...Platform.select({ web: { backgroundImage: 'linear-gradient(180deg,rgba(255,254,243,.83),rgba(255,254,243,.81) 67%,rgba(255,254,243,.05))', backgroundColor: 'transparent' } }) },
  recommendationList: { marginTop: 19, gap: 20 }, recommendationItem: { flexDirection: 'row', gap: 11, alignItems: 'flex-start' }, recommendationText: { flex: 1, fontSize: 13, lineHeight: 23, color: '#26322C' },
  knowledge: { paddingHorizontal: 23, paddingTop: 34, paddingBottom: 28, backgroundColor: '#0D1A1C', overflow: 'hidden' }, knowledgeWash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(6,22,25,.76)' },
  knowledgeTitle: { textAlign: 'center', fontSize: 28, lineHeight: 42, fontWeight: '700', letterSpacing: 0.6, color: '#FFF9ED' }, knowledgeSubtitle: { textAlign: 'center', fontSize: 19, lineHeight: 29, marginTop: 10, color: '#D9B97C', letterSpacing: 0.5 },
  knowledgeDescription: { marginTop: 23, fontSize: 12, lineHeight: 23, color: '#E0E4DD' }, networkWrap: { marginTop: 26, alignItems: 'center' },
  networkNode: { position: 'absolute', backgroundColor: '#0A252D', borderColor: '#3F6D7A', borderWidth: 0.7, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, networkNodeText: { color: '#F3EEDF', lineHeight: 16 },
  networkCore: { position: 'absolute', borderRadius: 40, backgroundColor: '#F4E4BE', borderWidth: 0.7, borderColor: '#D9BA7F', alignItems: 'center', justifyContent: 'center', shadowColor: '#D5B475', shadowOpacity: 0.15, shadowRadius: 12, shadowOffset: { width: 0, height: 0 } }, networkCoreTitle: { color: '#192923' }, networkCoreHint: { color: '#53604E' },
  faq: { paddingHorizontal: 22, paddingTop: 29, paddingBottom: 22, backgroundColor: '#FBF9F5' }, faqList: { marginTop: 15, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#DDDAD1' }, faqItem: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#DDDAD1' },
  faqQuestion: { minHeight: 53, paddingVertical: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }, questionMark: { width: 14, height: 14, borderWidth: 1, borderColor: '#35423E', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }, questionMarkText: { fontSize: 10, lineHeight: 12, fontWeight: '600', color: '#35423E' }, faqQuestionText: { flex: 1, fontSize: 12, lineHeight: 20, color: '#25332E', fontWeight: '600' }, chevron: { fontSize: 19, lineHeight: 22, color: '#35423E', paddingHorizontal: 3 }, chevronOpen: { transform: [{ rotate: '180deg' }] },
  faqAnswer: { paddingLeft: 24, paddingRight: 10, paddingBottom: 17 }, faqAnswerText: { fontSize: 12, lineHeight: 22, color: '#67716A' }, faqUtility: { minHeight: 36, justifyContent: 'center', marginTop: 7 }, faqUtilityText: { fontSize: 11, lineHeight: 18, color: '#81642F', textDecorationLine: 'underline' },
  purchaseBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 17, paddingTop: 10, backgroundColor: '#102629', ...Platform.select({ web: { backgroundImage: 'linear-gradient(115deg, #183336 0%, #102629 48%, #09191B 100%)' } }), borderTopLeftRadius: 12, borderTopRightRadius: 12, borderTopWidth: 1, borderTopColor: '#D8B46C', shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: -3 }, elevation: 12 },
  purchaseRow: { flexDirection: 'row', alignItems: 'center', gap: 13 }, purchasePrice: { width: '35%' }, purchaseLabel: { fontSize: 10, lineHeight: 14, color: '#E8CE92' }, purchaseAmount: { fontSize: 31, lineHeight: 34, letterSpacing: -0.7, color: '#FFE2A0', textShadowColor: 'rgba(222,175,75,.2)', textShadowRadius: 7 }, purchaseNote: { fontSize: 7.5, lineHeight: 11, color: '#E3E5DF' },
  purchaseButton: { flex: 1, minHeight: 45, borderRadius: 24, overflow: 'hidden', backgroundColor: '#D5A54A', borderWidth: 1, borderColor: '#F0D395', ...Platform.select({ web: { backgroundImage: 'linear-gradient(180deg, #F1D28C 0%, #DEB05B 44%, #C99436 100%)', boxShadow: '0 3px 12px rgba(223,177,76,.25), inset 0 1px 0 rgba(255,246,208,.7)' } }), shadowColor: '#D9AA4F', shadowOpacity: 0.24, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 4, flexDirection: 'row', gap: 7, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 9 }, purchaseButtonHighlight: { position: 'absolute', top: 2, left: 17, right: 17, height: 1, backgroundColor: 'rgba(255,247,215,.6)' }, purchaseButtonText: { fontSize: 14, lineHeight: 21, color: '#37270D', fontWeight: '700' }, purchaseArrow: { color: '#37270D', fontSize: 18, lineHeight: 22 },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10, marginTop: 3 }, legalLink: { minHeight: 20, justifyContent: 'center' }, legalText: { color: '#CBD0C5', fontSize: 8, lineHeight: 13 }, legalDot: { width: 1, height: 9, backgroundColor: '#627067' },
  statusMessage: { fontSize: 11, lineHeight: 19, color: '#F2E8D1', paddingBottom: 9 }, pressed: { opacity: 0.76 }, disabled: { opacity: 0.5 },
});
