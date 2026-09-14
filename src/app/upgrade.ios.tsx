import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { COMPLETE_LEARNING_CASE_COUNT, COMPLETE_TECHNIQUE_COUNT, COMPLETE_THEORY_COUNT, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { AppText } from '@/components/ui';
import { buyAppleProduct, formatApplePurchaseError, listenToApplePurchases, loadAppleProduct, restoreApplePurchases } from '@/lib/apple-purchase.ios';
import { COMPLETE_EDITION_PRICE_JPY, fetchVerifiedAccess, formatAccessDateTime } from '@/lib/purchase';

const completeMark = require('../../assets/upgrade/complete-mark.png');
const valuePoints = [
  ['①', '網羅性を追求', 'テーマごとに必要な処世術を揃える、完結を目指した網羅。'],
  ['②', '紐づく理論', '心理学・行動科学・戦略論を根拠とする、理論的な裏づけ。'],
  ['③', '独自の処世術集', '保存・メモ・履歴で積み上げる、知恵のパーソナライズ。'],
] as const;

function FeatureIcon({ index }: { index: number }) {
  return <View style={styles.featureIcon} accessibilityElementsHidden>
    {index === 0 ? <View style={styles.gridIcon}>{[0, 1, 2, 3].map((cell) => <View key={cell} style={styles.gridIconCell} />)}</View> : null}
    {index === 1 ? <View style={styles.bookIcon}><View style={[styles.bookIconPage, styles.bookIconPageLeft]} /><View style={[styles.bookIconPage, styles.bookIconPageRight]} /></View> : null}
    {index === 2 ? <View style={styles.memoIcon}><View style={styles.memoIconLine} /><View style={styles.memoIconLine} /><View style={[styles.memoIconLine, styles.memoIconLineShort]} /></View> : null}
  </View>;
}

export default function AppleUpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPaid, accessInfo, refreshAccess } = useAccess();
  const [storePrice, setStorePrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const fallbackPrice = useMemo(() => `¥${COMPLETE_EDITION_PRICE_JPY}`, []);
  const price = storePrice || fallbackPrice;

  const load = () => {
    setMessage('');
    void loadAppleProduct().then((product) => setStorePrice(product.displayPrice)).catch((error) => setMessage(error instanceof Error ? error.message : '商品情報を取得できませんでした。'));
  };

  useEffect(load, []);
  useEffect(() => {
    if (!busy) return;
    const timer = setTimeout(() => { setBusy(false); setMessage('購入結果を確認できていません。購入済みの場合は再購入せず、「購入を復元」をお試しください。'); }, 60000);
    return () => clearTimeout(timer);
  }, [busy]);
  useEffect(() => listenToApplePurchases(() => {
    void refreshAccess().then((state) => setMessage(state === 'paid' ? '完全版を利用できます。' : '購入履歴を確認しました。利用期間が終了している場合は再購入できます。'));
    setBusy(false);
  }, (error) => { setMessage(error); setBusy(false); }), [refreshAccess]);

  async function purchase() {
    if (!user) { router.push({ pathname: '/auth', params: { intent: 'checkout', mode: 'signup' } }); return; }
    setBusy(true); setMessage('App Storeで購入を確認してください。');
    try {
      const current = await fetchVerifiedAccess();
      if (current.status === 'active') { await refreshAccess(); setBusy(false); return; }
      if (current.status === 'processing') throw new Error('既存の購入を確認中です。通信を確認して購入を復元してください。');
      await buyAppleProduct(user.id);
    } catch (error) { setMessage(formatApplePurchaseError(error)); setBusy(false); }
  }

  async function restore() {
    if (!user) { router.push('/auth'); return; }
    setBusy(true); setMessage('購入を確認しています…');
    try { await restoreApplePurchases(); const state = await refreshAccess(); setMessage(state === 'paid' ? '有効な購入を復元しました。' : '有効な購入がありません。購入時と同じアカウントでログインしてください。'); }
    catch (error) { setMessage(error instanceof Error ? error.message : '購入を復元できませんでした。'); }
    finally { setBusy(false); }
  }

  const primaryLabel = isPaid ? '完全版を開く' : busy ? '購入を確認中…' : `完全版を購入する　${price}`;

  return <View style={styles.safe}><ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled"><View style={styles.page}><View style={styles.content}>
    <View style={styles.productIntro}><Image source={completeMark} accessibilityLabel="処世術禄のマーク" resizeMode="contain" style={styles.cover} /><View style={styles.productCopy}><AppText variant="serif" style={styles.productTitle}>処世術禄　完全版</AppText><AppText style={styles.productLead}>抜粋版から、知恵の完全体系へ。</AppText><View style={styles.productPriceRow}><View style={styles.originalPriceGroup}><AppText variant="serif" style={styles.originalPrice}>¥680</AppText><AppText style={styles.originalPriceNote}>通常価格</AppText></View><AppText variant="serif" style={styles.productPrice}>{price}</AppText><View style={styles.durationBadge}><AppText style={styles.durationBadgeText}>30日間</AppText></View></View><View style={styles.productConditionRow}><AppText style={styles.productCondition}>一回払い・自動更新なし</AppText><AppText style={styles.scopeText}>処世術{COMPLETE_TECHNIQUE_COUNT}件・理論{COMPLETE_THEORY_COUNT}件・全{COMPLETE_LEARNING_CASE_COUNT}ケース</AppText></View></View></View>
    <View style={styles.editionComparison}><View style={[styles.editionOption, styles.freeEdition]}><AppText style={styles.editionBadge}>無料版・体系の抜粋</AppText><AppText variant="serif" style={styles.editionCount}>処世術{FREE_REEL_TECHNIQUE_IDS.length}件{`\n`}理論{FREE_THEORY_IDS.length}件</AppText></View><AppText style={styles.editionArrow}>›</AppText><View style={[styles.editionOption, styles.completeEdition]}><AppText style={[styles.editionBadge, styles.completeEditionBadge]}>完全版・全体系</AppText><AppText variant="serif" style={[styles.editionCount, styles.completeEditionCount]}>処世術{COMPLETE_TECHNIQUE_COUNT}件・{`\n`}理論{COMPLETE_THEORY_COUNT}件</AppText></View></View>
    <View style={styles.valueHeading}><View style={styles.valueHeadingLine} /><View><AppText variant="serif" style={styles.valueHeadingTitle}>迷ったとき、すぐ一手が見つかる</AppText><AppText style={styles.valueHeadingSub}>完全版で手に入る3つの強み。</AppText></View><View style={styles.valueHeadingLine} /></View>
    <View style={styles.featurePanel}>{valuePoints.map(([number, title, body], index) => <View key={title} style={[styles.featureRow, index !== valuePoints.length - 1 && styles.featureRowDivider]}><FeatureIcon index={index} /><View style={styles.featureCopy}><View style={styles.featureTitleRow}><AppText style={styles.featureNumber}>{number}</AppText><AppText variant="serif" style={styles.featureTitle}>{title}</AppText></View><AppText style={styles.featureBody}>{body}</AppText></View></View>)}</View>
    <View style={styles.purchaseCard}><AppText variant="serif" style={styles.purchaseLabel}>完全版・30日間</AppText><View style={styles.priceRow}><AppText variant="serif" style={styles.purchasePrice}>{price}</AppText><AppText style={styles.tax}>（税込）</AppText></View><AppText style={styles.paymentType}>一回払い・自動更新なし</AppText>{isPaid ? <AppText style={styles.active}>完全版を利用中{accessInfo.accessExpiresAt ? `：${formatAccessDateTime(accessInfo.accessExpiresAt)}まで` : ''}</AppText> : null}{message ? <AppText accessibilityRole="alert" style={styles.message}>{message}</AppText> : null}<Pressable accessibilityRole="button" disabled={busy || (!isPaid && !storePrice)} onPress={() => isPaid ? router.replace('/(tabs)') : void purchase()} style={({ pressed }) => [styles.primary, (busy || (!isPaid && !storePrice)) && styles.disabled, pressed && styles.pressed]}><View pointerEvents="none" style={styles.primarySheen} /><AppText variant="serif" style={styles.primaryText}>{primaryLabel}</AppText>{!isPaid ? <AppText style={styles.primaryArrow}>›</AppText> : null}</Pressable>{!storePrice && !message ? <Pressable accessibilityRole="button" disabled={busy} onPress={load} style={styles.reload}><AppText style={styles.reloadText}>商品情報を再読み込み</AppText></Pressable> : null}{!isPaid ? <AppText style={styles.preConfirmation}>{user ? '決済は次の画面で確定します' : 'アカウント作成またはログイン後に、決済へ進みます'}</AppText> : null}<View style={styles.utilityRow}>{!isPaid ? <Pressable accessibilityRole="button" disabled={busy} onPress={() => void restore()} style={styles.utilityButton}><AppText style={styles.utilityLink}>{busy ? '購入履歴を確認中…' : '購入済みの方は復元する'}</AppText></Pressable> : null}<Pressable accessibilityRole="button" onPress={() => router.push('/legal/terms')} style={styles.utilityButton}><AppText style={styles.utilityLink}>利用規約</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/legal/commerce')} style={styles.utilityButton}><AppText style={styles.utilityLink}>特商法表記</AppText></Pressable><Pressable accessibilityRole="button" onPress={() => router.push('/legal/faq')} style={styles.utilityButton}><AppText style={styles.utilityLink}>FAQ</AppText></Pressable></View></View>
  </View></View></ScrollView></View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, minHeight: 0, backgroundColor: '#F5F0E8' }, scroll: { flex: 1, minHeight: 0 }, scrollContent: { flexGrow: 1 }, page: { flexGrow: 1, width: '100%', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#F5F0E8' }, content: { flex: 1, width: '100%', maxWidth: 700, alignSelf: 'center' },
  productIntro: { width: '100%', minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 17, paddingHorizontal: 10 }, cover: { width: 96, height: 96, backgroundColor: '#151512', shadowColor: '#4E3B19', shadowOpacity: 0.3, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 4 }, productCopy: { flex: 1, minWidth: 0, alignSelf: 'stretch', justifyContent: 'center' }, productTitle: { color: '#27231E', fontSize: 25, lineHeight: 33, fontWeight: '700' }, productLead: { marginTop: 2, color: '#635A4D', fontSize: 12, lineHeight: 17 }, productPriceRow: { marginTop: 3, flexDirection: 'row', alignItems: 'center', gap: 8 }, originalPriceGroup: { alignItems: 'center' }, originalPrice: { color: '#8C8273', fontSize: 18, lineHeight: 25, textDecorationLine: 'line-through' }, originalPriceNote: { marginTop: -1, color: '#9A6B22', fontSize: 8, lineHeight: 11, fontWeight: '700' }, productPrice: { color: '#BB7B0B', fontSize: 43, lineHeight: 50, fontWeight: '700' }, durationBadge: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#C9932C', borderRadius: 8 }, durationBadgeText: { color: '#9D6510', fontSize: 11, lineHeight: 15, fontWeight: '700' }, productConditionRow: { marginTop: 2, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, productCondition: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: '#F5EEDF', color: '#806235', fontSize: 10, lineHeight: 14 }, scopeText: { flexShrink: 1, color: '#372F25', fontSize: 10.5, lineHeight: 15, fontWeight: '700' },
  editionComparison: { minHeight: 91, marginTop: 9, flexDirection: 'row', alignItems: 'center', gap: 10 }, editionOption: { flex: 1, minWidth: 0, minHeight: 91, alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingHorizontal: 8 }, freeEdition: { borderWidth: 1, borderColor: '#DACDB8', backgroundColor: 'rgba(255,253,248,0.82)' }, completeEdition: { borderWidth: 1, borderColor: '#2B2922', backgroundColor: '#1A1916' }, editionBadge: { marginBottom: 4, paddingHorizontal: 8, paddingVertical: 1, borderWidth: 1, borderColor: '#D2C2A6', borderRadius: 4, color: '#857360', fontSize: 9, lineHeight: 13 }, completeEditionBadge: { borderColor: '#C8982F', color: '#E1BA5D' }, editionCount: { color: '#302B24', fontSize: 19, lineHeight: 26, fontWeight: '700', textAlign: 'center' }, completeEditionCount: { color: '#E0B84F', fontSize: 17, lineHeight: 24 }, editionArrow: { color: '#BD8318', fontSize: 33, lineHeight: 37, fontWeight: '300' },
  valueHeading: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }, valueHeadingLine: { flex: 1, height: 1, backgroundColor: '#D6C39F' }, valueHeadingTitle: { color: '#A66D16', fontSize: 16, lineHeight: 22, textAlign: 'center' }, valueHeadingSub: { marginTop: 0, color: '#857363', fontSize: 10, lineHeight: 15, textAlign: 'center' }, featurePanel: { marginTop: 6, overflow: 'hidden', borderWidth: 1, borderColor: '#DDD0BC', borderRadius: 13, backgroundColor: 'rgba(255,253,248,0.62)' }, featureRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, paddingVertical: 7 }, featureRowDivider: { borderBottomWidth: 1, borderBottomColor: '#E2D7C8' }, featureIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A1916' }, gridIcon: { width: 15, height: 15, flexDirection: 'row', flexWrap: 'wrap', gap: 2 }, gridIconCell: { width: 6.5, height: 6.5, borderWidth: 1, borderColor: '#E1B54C', borderRadius: 1 }, bookIcon: { width: 16, height: 15, flexDirection: 'row', gap: 2 }, bookIconPage: { width: 7, height: 14, borderWidth: 1, borderColor: '#E1B54C', borderRadius: 1 }, bookIconPageLeft: { borderTopRightRadius: 4 }, bookIconPageRight: { borderTopLeftRadius: 4 }, memoIcon: { width: 15, gap: 3 }, memoIconLine: { height: 1, borderRadius: 1, backgroundColor: '#E1B54C' }, memoIconLineShort: { width: '62%' }, featureCopy: { flex: 1, minWidth: 0 }, featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 }, featureNumber: { color: '#B67B16', fontSize: 13, lineHeight: 18, fontWeight: '700' }, featureTitle: { color: '#A36A13', fontSize: 14, lineHeight: 19, fontWeight: '700' }, featureBody: { marginTop: 1, color: '#574F44', fontSize: 10.5, lineHeight: 15 },
  purchaseCard: { marginTop: 10, paddingHorizontal: 16, paddingVertical: 11, borderWidth: 1, borderColor: '#C9932C', borderRadius: 16, backgroundColor: 'rgba(255,253,248,0.92)', shadowColor: '#594523', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 3, alignItems: 'center' }, purchaseLabel: { color: '#29241E', fontSize: 17, lineHeight: 23, fontWeight: '700', textAlign: 'center' }, priceRow: { marginTop: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 5 }, purchasePrice: { color: '#1E1B17', fontSize: 38, lineHeight: 45, fontWeight: '700' }, tax: { marginBottom: 6, color: '#5E584F', fontSize: 12, lineHeight: 17 }, paymentType: { color: '#5A5145', fontSize: 12, lineHeight: 18, textAlign: 'center' }, active: { marginTop: 6, color: '#81622A', fontSize: 11, lineHeight: 16, textAlign: 'center' }, message: { marginTop: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 7, backgroundColor: '#F3EADF', color: '#704E2A', fontSize: 10, lineHeight: 14, textAlign: 'center' }, primary: { position: 'relative', alignSelf: 'stretch', minHeight: 56, marginTop: 10, paddingHorizontal: 36, borderWidth: 1, borderColor: '#FFEDB7', borderRadius: 12, overflow: 'hidden', backgroundColor: '#D99B1B', alignItems: 'center', justifyContent: 'center', shadowColor: '#6C4300', shadowOpacity: 0.52, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 8 }, primaryText: { color: '#FFF9EC', fontSize: 18, lineHeight: 25, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(61,37,0,0.38)', textShadowRadius: 3 }, primarySheen: { position: 'absolute', top: 1, right: 1, left: 1, height: '44%', borderTopLeftRadius: 11, borderTopRightRadius: 11, backgroundColor: 'rgba(255,244,196,0.22)' }, primaryArrow: { position: 'absolute', right: 14, top: 6, color: '#FFF9EC', fontSize: 30, lineHeight: 34, fontWeight: '300' }, preConfirmation: { marginTop: 4, color: '#6E665A', fontSize: 10, lineHeight: 14, textAlign: 'center' }, reload: { minHeight: 38, marginTop: 3, paddingHorizontal: 12, justifyContent: 'center' }, reloadText: { color: '#81622A', fontSize: 11, fontWeight: '700' }, utilityRow: { minHeight: 18, marginTop: 9, paddingTop: 5, borderTopWidth: 1, borderTopColor: 'rgba(210,194,167,0.62)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, flexWrap: 'wrap' }, utilityButton: { minHeight: 38, justifyContent: 'center', paddingHorizontal: 4 }, utilityLink: { color: '#5D513D', fontSize: 9.5, lineHeight: 14, textDecorationLine: 'underline' }, disabled: { opacity: 0.55 }, pressed: { opacity: 0.82, transform: [{ scale: 0.988 }] },
});
