import { Redirect, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText } from '@/components/ui';
import { colors, fonts, shadow } from '@/constants/theme';
import { categories, techniqueCards, theories, getTechniqueDisplayId } from '@/data/catalog';
import { FREE_PERSONA_NAMES, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { useAccess } from '@/access/access-state';
import { useAppState } from '@/state/app-state';

const previewCard = techniqueCards[0];
const personaCount = categories.reduce((count, category) => count + category.subcategories.length, 0);
const freePersonaCount = FREE_PERSONA_NAMES.length;
const freeTechniqueCount = FREE_REEL_TECHNIQUE_IDS.length;

/** 初回の導線だけに表示する、処世術禄の販売ファースト画面。 */
export default function Welcome() {
  const router = useRouter();
  const { accessState } = useAccess();
  const { interests, onboardingCompleted, completeOnboarding } = useAppState();

  // 購入済みの人が古いリンクなどからここへ来ても、商品説明を再表示しない。
  if (accessState === 'paid' || onboardingCompleted) return <Redirect href="/(tabs)" />;

  const startFree = () => {
    completeOnboarding(interests);
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topBar}>
          <View style={styles.brand}>
            <View style={styles.seal}><AppText variant="serif" style={styles.sealText}>禄</AppText></View>
            <View><AppText variant="serif" style={styles.brandName}>処 世 術 禄</AppText><AppText style={styles.brandReading}>しょせいじゅつろく</AppText></View>
          </View>
        </View>

        <View style={styles.hero}>
          <AppText variant="serif" style={styles.heroTitle}>人生をうまく生きる方法を、{`\n`}すべての人へ。</AppText>
          <AppText variant="serif" style={styles.heroCopy}>流れて消える人生の知識を、{`\n`}何度でも使える知恵に。</AppText>
          <View style={styles.rule}><View style={styles.ruleLine} /><View style={styles.diamond} /><View style={styles.ruleLine} /></View>
          <View style={styles.stats}>
            <View style={styles.stat}><View style={styles.statLine}><AppText variant="serif" style={styles.statNumber}>{techniqueCards.length}</AppText><AppText variant="serif" style={styles.statLabel}>の処世術</AppText></View><AppText style={styles.statSub}>対人・仕事・人生の知恵</AppText></View>
            <View style={styles.statDivider} />
            <View style={styles.stat}><View style={styles.statLine}><AppText variant="serif" style={styles.statNumber}>{theories.length}</AppText><AppText variant="serif" style={styles.statLabel}>の理論</AppText></View><AppText style={styles.statSub}>心理学・行動科学・戦略など</AppText></View>
          </View>
        </View>

        <View style={styles.offer}>
          <AppText variant="serif" style={styles.offerTitle}>30日間、すべての知恵を。</AppText>
          <View style={styles.offerBody}>
            <View style={styles.priceBadge}><AppText variant="serif" style={styles.priceType}>30日間</AppText><AppText variant="serif" style={styles.price}>¥280</AppText><AppText style={styles.tax}>税込</AppText></View>
            <View style={styles.benefits}>
              {[`${personaCount}の人物像・${techniqueCards.length}の処世術`, `${theories.length}の理論をすべて収録`, '購入日から30日間利用', '自動更新・継続課金なし'].map((item) => (
                <View key={item} style={styles.benefitRow}>
                  <AppText style={styles.benefitCheck}>✓</AppText>
                  <AppText style={styles.benefitText}>{item}</AppText>
                </View>
              ))}
            </View>
          </View>
          <Pressable accessibilityRole="button" onPress={() => router.push('/upgrade')} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}>
            <View style={styles.ctaDiamond} /><AppText variant="serif" style={styles.primaryText}>280円で30日間利用する</AppText><AppText style={styles.ctaArrow}>›</AppText>
          </Pressable>
          <AppText style={styles.assurance}>⌑　自動更新・継続課金なし　　期間終了後は無料版へ戻ります</AppText>
        </View>

        <View style={styles.previewSection}>
          <AppText variant="serif" style={styles.previewHeading}>収録されている処世術の一例</AppText>
          {previewCard ? <View style={styles.previewCard}>
            <AppText style={styles.previewNumber}>{getTechniqueDisplayId(previewCard)}</AppText>
            <AppText variant="serif" numberOfLines={3} adjustsFontSizeToFit minimumFontScale={0.68} style={styles.previewTitle}>{previewCard.title}</AppText>
            <View style={styles.previewRule}><View style={styles.previewRuleLine} /><View style={styles.previewSmallDiamond} /><View style={styles.previewRuleLine} /></View>
            <AppText style={styles.previewTag}>〔 {previewCard.categoryName} 〕</AppText>
            <View style={styles.previewDiamond} />
          </View> : null}
          <View style={styles.dots}><View style={styles.dotActive} /><View style={styles.dot} /><View style={styles.dot} /></View>
        </View>

        <Pressable accessibilityRole="button" onPress={startFree} style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
          <View style={styles.freeIcon}><AppText style={styles.freeIconText}>▯</AppText></View>
          <View style={styles.secondaryCopy}><AppText variant="serif" style={styles.secondaryTitle}>{freePersonaCount}つの人物像を無料で体験</AppText><AppText style={styles.secondarySub}>処世術{freeTechniqueCount}件・厳選理論{FREE_THEORY_IDS.length}件を読めます</AppText></View>
          <AppText style={styles.secondaryArrow}>›</AppText>
        </Pressable>

        <View style={styles.featureRow}>
          {['保存・メモ機能', '探しやすい検索', '体系的に学べる', 'オフライン対応'].map((title, index) => <View key={title} style={styles.feature}><View style={styles.featureIcon}><View style={styles.featureDiamond} /></View><AppText style={styles.featureTitle}>{title}</AppText><AppText style={styles.featureSub}>{['大切な知恵を\nあなたの蔵書に', 'キーワードから\n必要な知恵を発見', '対人・仕事・人生の\n知恵を体系化', 'いつでもどこでも\n快適に読める'][index]}</AppText></View>)}
        </View>
        <View style={styles.footnote}><AppText style={styles.footnoteItem}>◇　自動更新なし</AppText><View style={styles.footnoteLine} /><AppText style={styles.footnoteItem}>↓　30日間利用可能</AppText><View style={styles.footnoteLine} /><AppText style={styles.footnoteItem}>▢　プライバシー重視</AppText></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  benefitRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7 },
  benefitCheck: { width: 14, color: colors.ink, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  benefitText: { flex: 1, minWidth: 0, color: colors.ink, fontSize: 14, lineHeight: 20 },
  safe: { flex: 1, backgroundColor: colors.surfaceDark }, scroll: { backgroundColor: colors.paper }, page: { paddingBottom: 34 }, topBar: { backgroundColor: colors.surfaceDark, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 10, paddingBottom: 16 }, brand: { flexDirection: 'row', gap: 10, alignItems: 'center' }, seal: { width: 52, height: 52, justifyContent: 'center', alignItems: 'center', borderColor: '#D0A03D', borderWidth: 1.3, borderRadius: 11 }, sealText: { color: '#D5A441', fontSize: 35, lineHeight: 42 }, brandName: { color: colors.white, fontSize: 18, letterSpacing: 4 }, brandReading: { marginTop: 1, color: '#D6AF58', fontSize: 9, letterSpacing: 2 },
  hero: { backgroundColor: colors.surfaceDark, paddingHorizontal: 24, paddingBottom: 86, alignItems: 'center' }, heroTitle: { color: colors.white, textAlign: 'center', fontSize: 29, lineHeight: 43, fontWeight: '600', letterSpacing: 1 }, heroCopy: { marginTop: 17, color: '#D9A947', textAlign: 'center', fontSize: 18, lineHeight: 28, fontWeight: '600' }, rule: { flexDirection: 'row', alignItems: 'center', marginTop: 23, gap: 10 }, ruleLine: { width: 116, height: StyleSheet.hairlineWidth, backgroundColor: '#8A6727' }, diamond: { width: 10, height: 10, backgroundColor: '#D5A441', transform: [{ rotate: '45deg' }] }, stats: { marginTop: 25, width: '100%', maxWidth: 385, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' }, stat: { flex: 1, alignItems: 'center' }, statLine: { flexDirection: 'row', alignItems: 'baseline', gap: 4 }, statNumber: { color: '#D9A947', fontSize: 37, lineHeight: 45 }, statLabel: { color: '#F7EEE1', fontSize: 18, lineHeight: 28 }, statSub: { marginTop: 3, color: '#D9D1C2', fontSize: 11, textAlign: 'center' }, statDivider: { height: 66, width: StyleSheet.hairlineWidth, backgroundColor: '#AF8540' },
  offer: { alignSelf: 'center', width: '89%', maxWidth: 520, marginTop: -66, padding: 18, paddingBottom: 15, backgroundColor: colors.surface, borderRadius: 23, borderColor: colors.line, borderWidth: 1, ...shadow.card }, offerTitle: { color: colors.ink, fontSize: 22, textAlign: 'center' }, offerBody: { marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 19 }, priceBadge: { width: 116, height: 116, borderRadius: 58, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D6A844' }, priceType: { color: '#DAB052', fontSize: 14 }, price: { color: '#E0B655', fontSize: 39, lineHeight: 46 }, tax: { color: '#F1E2C4', fontSize: 10 }, benefits: { flex: 1, gap: 7 }, benefit: { color: colors.ink, fontSize: 14, lineHeight: 20 }, primary: { minHeight: 61, marginTop: 16, paddingHorizontal: 20, borderRadius: 13, backgroundColor: '#BC8525', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#7F5D22', shadowOpacity: 0.2, shadowRadius: 5, elevation: 2 }, primaryText: { color: '#FFFDF8', fontSize: 21, letterSpacing: 1 }, ctaDiamond: { position: 'absolute', left: 30, width: 12, height: 12, borderWidth: 1.5, borderColor: '#FFF7DF', transform: [{ rotate: '45deg' }] }, ctaArrow: { position: 'absolute', right: 28, color: '#FFFDF8', fontSize: 34, lineHeight: 37 }, assurance: { marginTop: 12, color: '#59534A', fontSize: 11, textAlign: 'center' },
  previewSection: { alignItems: 'center', marginTop: 28 }, previewHeading: { color: colors.ink, fontSize: 20, marginBottom: 14 }, previewCard: { width: 244, minHeight: 297, borderWidth: 1, borderColor: '#D3A13B', borderRadius: 25, padding: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceDark, shadowColor: '#7D632F', shadowOpacity: 0.22, shadowRadius: 8, elevation: 4 }, previewNumber: { position: 'absolute', top: 24, color: '#D5A441', fontSize: 13, letterSpacing: 1 }, previewTitle: { color: colors.white, fontSize: 25, lineHeight: 37, textAlign: 'center', fontWeight: '600' }, previewRule: { marginTop: 22, flexDirection: 'row', alignItems: 'center', gap: 8, width: '92%' }, previewRuleLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#9D7530' }, previewSmallDiamond: { width: 7, height: 7, borderWidth: 1, borderColor: '#D5A441', transform: [{ rotate: '45deg' }] }, previewTag: { marginTop: 16, color: '#D9A947', fontSize: 12 }, previewDiamond: { position: 'absolute', bottom: 24, width: 17, height: 17, borderWidth: 1.5, borderColor: '#D5A441', transform: [{ rotate: '45deg' }] }, dots: { flexDirection: 'row', gap: 10, marginTop: 20 }, dot: { width: 11, height: 11, borderRadius: 6, backgroundColor: '#D7D2C9' }, dotActive: { width: 11, height: 11, borderRadius: 6, backgroundColor: colors.ink },
  secondary: { width: '89%', maxWidth: 520, alignSelf: 'center', marginTop: 24, padding: 15, borderRadius: 22, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, flexDirection: 'row', alignItems: 'center' }, freeIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.surfaceDark, alignItems: 'center', justifyContent: 'center' }, freeIconText: { color: '#E0B655', fontSize: 25 }, secondaryCopy: { flex: 1, minWidth: 0, marginLeft: 14 }, secondaryTitle: { color: colors.ink, fontSize: 17 }, secondarySub: { color: colors.inkSoft, fontSize: 12, marginTop: 4 }, secondaryArrow: { color: colors.ink, fontSize: 35 }, featureRow: { marginTop: 29, paddingHorizontal: 20, flexDirection: 'row', justifyContent: 'space-between' }, feature: { flex: 1, alignItems: 'center' }, featureIcon: { height: 28, justifyContent: 'center', alignItems: 'center' }, featureDiamond: { width: 16, height: 16, borderWidth: 1.5, borderColor: colors.gold, transform: [{ rotate: '45deg' }] }, featureTitle: { marginTop: 7, color: colors.ink, fontSize: 11, fontWeight: '700', textAlign: 'center' }, featureSub: { marginTop: 5, color: colors.inkSoft, fontSize: 9, lineHeight: 14, textAlign: 'center' }, footnote: { width: '89%', maxWidth: 520, marginTop: 26, paddingVertical: 12, paddingHorizontal: 8, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: '#F6F0E5' }, footnoteItem: { color: '#765E34', fontSize: 9, textAlign: 'center' }, footnoteLine: { width: StyleSheet.hairlineWidth, height: 25, backgroundColor: '#D7C6A6' }, pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
