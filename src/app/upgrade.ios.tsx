import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { AppText } from '@/components/ui';
import { colors, fonts, radius } from '@/constants/theme';
import { buyAppleProduct, formatApplePurchaseError, listenToApplePurchases, loadAppleProduct, restoreApplePurchases } from '@/lib/apple-purchase.ios';
import { COMPLETE_EDITION_PRICE_JPY, fetchVerifiedAccess, formatAccessDateTime } from '@/lib/purchase';

const completeMark = require('../../assets/upgrade/complete-mark.png');
const valuePoints = [
  ['①', '網羅性を追求', '人物像、処世術、理論をひとつの体系として読めます。'],
  ['②', '紐づく理論', '心理学・行動科学・戦略論を手がかりに、背景まで理解できます。'],
  ['③', '自分の知恵にする', '保存・メモ・履歴を使い、自分に必要な内容を積み上げられます。'],
] as const;

export default function AppleUpgradeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { isPaid, accessInfo, refreshAccess } = useAccess();
  const [storePrice, setStorePrice] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const displayPrice = useMemo(() => `¥${COMPLETE_EDITION_PRICE_JPY}`, []);
  const load = () => { setMessage(''); void loadAppleProduct().then((product) => setStorePrice(product.displayPrice)).catch((error) => setMessage(error instanceof Error ? error.message : '商品情報を取得できませんでした。')); };
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

  return <ScrollView style={styles.safe} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
    <View style={styles.hero}>
      <Image source={completeMark} resizeMode="contain" accessibilityLabel="処世術禄 完全版" style={styles.cover} />
      <View style={styles.heroCopy}>
        <AppText variant="serif" style={styles.kicker}>COMPLETE EDITION</AppText>
        <AppText variant="serif" style={styles.title}>処世術禄　完全版</AppText>
        <AppText style={styles.lead}>抜粋版から、知恵の完全体系へ。</AppText>
        <View style={styles.heroPrice}><AppText variant="serif" style={styles.original}>¥680</AppText><AppText style={styles.originalNote}>通常価格</AppText><AppText variant="serif" style={styles.price}>{displayPrice}</AppText><View style={styles.duration}><AppText style={styles.durationText}>30日間</AppText></View></View>
        <AppText style={styles.heroNote}>一回払い・自動更新なし</AppText>
      </View>
    </View>
    <View style={styles.comparison}><View style={styles.freeEdition}><AppText style={styles.editionLabel}>無料版・体系の抜粋</AppText><AppText variant="serif" style={styles.editionCount}>無料公開コンテンツ</AppText></View><AppText style={styles.comparisonArrow}>›</AppText><View style={styles.completeEdition}><AppText style={[styles.editionLabel, styles.completeLabel]}>完全版・全体系</AppText><AppText variant="serif" style={[styles.editionCount, styles.completeCount]}>すべての人物像・処世術・理論</AppText></View></View>
    <View style={styles.valueHeading}><View style={styles.line} /><View><AppText variant="serif" style={styles.valueTitle}>迷ったとき、すぐ一手が見つかる</AppText><AppText style={styles.valueSub}>完全版で手に入る3つの強み。</AppText></View><View style={styles.line} /></View>
    <View style={styles.features}>{valuePoints.map(([number, title, body], index) => <View key={title} style={[styles.feature, index < valuePoints.length - 1 && styles.featureDivider]}><AppText style={styles.featureNumber}>{number}</AppText><View style={styles.featureCopy}><AppText variant="serif" style={styles.featureTitle}>{title}</AppText><AppText style={styles.featureBody}>{body}</AppText></View></View>)}</View>
    <View style={styles.purchaseCard}>
      <AppText variant="serif" style={styles.purchaseLabel}>完全版・30日間</AppText><View style={styles.purchasePriceRow}><AppText variant="serif" style={styles.purchasePrice}>{displayPrice}</AppText><AppText style={styles.tax}>（税込）</AppText></View><AppText style={styles.paymentType}>一回払い・自動更新なし</AppText>
      <AppText style={styles.accessNote}>Appleでの購入完了から30日間利用できます。期間終了後は無料版に戻り、必要なときだけ再購入できます。</AppText>
      {isPaid ? <><AppText style={styles.active}>完全版を利用中{accessInfo.accessExpiresAt ? `：${formatAccessDateTime(accessInfo.accessExpiresAt)}まで` : ''}</AppText><Pressable accessibilityRole="button" onPress={() => router.replace('/(tabs)')} style={({ pressed }) => [styles.primary, pressed && styles.pressed]}><AppText variant="serif" style={styles.primaryText}>完全版を開く</AppText></Pressable></> : <Pressable accessibilityRole="button" disabled={busy || !storePrice} onPress={() => void purchase()} style={({ pressed }) => [styles.primary, (busy || !storePrice) && styles.disabled, pressed && styles.pressed]}><AppText variant="serif" style={styles.primaryText}>{busy ? '購入を確認中…' : `App Storeで購入　${displayPrice}`}</AppText><AppText style={styles.primaryArrow}>›</AppText></Pressable>}
      {!storePrice ? <Pressable accessibilityRole="button" disabled={busy} onPress={load} style={styles.reload}><AppText style={styles.reloadText}>商品情報を再読み込み</AppText></Pressable> : null}
      <Pressable accessibilityRole="button" disabled={busy} onPress={() => void restore()} style={styles.restore}><AppText style={styles.restoreText}>購入を復元する</AppText></Pressable>
      {message ? <AppText accessibilityRole="alert" style={styles.message}>{message}</AppText> : null}
      <View style={styles.legalRow}><Pressable onPress={() => router.push('/legal/terms')}><AppText style={styles.legal}>利用規約</AppText></Pressable><Pressable onPress={() => router.push('/legal/privacy')}><AppText style={styles.legal}>プライバシーポリシー</AppText></Pressable></View>
    </View>
  </ScrollView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0E7' }, scroll: { paddingBottom: 48 }, hero: { minHeight: 245, paddingHorizontal: 24, paddingVertical: 30, flexDirection: 'row', alignItems: 'center', gap: 18, backgroundColor: '#131513', borderBottomWidth: 1, borderBottomColor: '#B8872D' }, cover: { width: 92, height: 122 }, heroCopy: { flex: 1, minWidth: 0 }, kicker: { color: '#D7AF58', fontSize: 10, lineHeight: 15, letterSpacing: 1.8 }, title: { marginTop: 5, color: '#F5EBD4', fontSize: 25, lineHeight: 36, letterSpacing: 1 }, lead: { marginTop: 6, color: '#D7CCBA', fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 }, heroPrice: { marginTop: 13, flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', gap: 6 }, original: { color: '#A9A298', fontSize: 15, lineHeight: 22, textDecorationLine: 'line-through' }, originalNote: { color: '#A9A298', fontSize: 9, lineHeight: 14 }, price: { marginLeft: 4, color: '#F1D185', fontSize: 29, lineHeight: 37 }, duration: { paddingHorizontal: 7, paddingVertical: 2, borderWidth: 1, borderColor: '#B8872D', borderRadius: radius.pill }, durationText: { color: '#E5C474', fontSize: 10, lineHeight: 15, fontWeight: '700' }, heroNote: { marginTop: 3, color: '#C5B99F', fontSize: 10, lineHeight: 16 },
  comparison: { margin: 20, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#D8C8AD', borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.75)' }, freeEdition: { flex: 1, minHeight: 72, padding: 10, justifyContent: 'center' }, completeEdition: { flex: 1.25, minHeight: 72, padding: 10, justifyContent: 'center', borderRadius: radius.sm, backgroundColor: '#1A1D1A' }, editionLabel: { color: '#88755A', fontSize: 9, lineHeight: 14, fontWeight: '700' }, completeLabel: { color: '#D9B567' }, editionCount: { marginTop: 4, color: colors.ink, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18 }, completeCount: { color: '#FFF8E9' }, comparisonArrow: { color: '#AD7B25', fontFamily: fonts.serif, fontSize: 25, lineHeight: 30 },
  valueHeading: { marginTop: 10, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 10 }, line: { flex: 1, height: 1, backgroundColor: '#D8C8AD' }, valueTitle: { color: colors.ink, fontSize: 17, lineHeight: 25, textAlign: 'center' }, valueSub: { marginTop: 2, color: colors.muted, fontSize: 10, lineHeight: 15, textAlign: 'center' }, features: { margin: 20, borderWidth: 1, borderColor: '#D8C8AD', borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.72)', overflow: 'hidden' }, feature: { minHeight: 104, padding: 17, flexDirection: 'row', gap: 13 }, featureDivider: { borderBottomWidth: 1, borderBottomColor: '#E3D8C5' }, featureNumber: { color: '#AA741C', fontFamily: fonts.serif, fontSize: 16, lineHeight: 24 }, featureCopy: { flex: 1, minWidth: 0 }, featureTitle: { color: colors.ink, fontSize: 17, lineHeight: 25 }, featureBody: { marginTop: 4, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  purchaseCard: { marginHorizontal: 20, padding: 22, borderWidth: 1, borderColor: '#C99A3C', borderRadius: radius.lg, backgroundColor: '#FFFCF5', alignItems: 'center' }, purchaseLabel: { color: '#5D4722', fontSize: 17, lineHeight: 25 }, purchasePriceRow: { marginTop: 4, flexDirection: 'row', alignItems: 'baseline', gap: 5 }, purchasePrice: { color: '#A66F17', fontSize: 36, lineHeight: 46 }, tax: { color: colors.muted, fontSize: 11, lineHeight: 17 }, paymentType: { marginTop: 1, color: '#756140', fontSize: 11, lineHeight: 17 }, accessNote: { marginTop: 14, color: colors.inkSoft, fontSize: 12, lineHeight: 20, textAlign: 'center' }, active: { marginTop: 14, color: '#81622A', fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, textAlign: 'center' }, primary: { width: '100%', minHeight: 58, marginTop: 18, paddingHorizontal: 18, borderRadius: radius.md, backgroundColor: '#BB8623', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }, primaryText: { color: '#FFFFFF', fontSize: 15, lineHeight: 22 }, primaryArrow: { color: '#FFFFFF', fontSize: 23, lineHeight: 25 }, disabled: { opacity: 0.45 }, pressed: { opacity: 0.74 }, reload: { minHeight: 42, marginTop: 8, paddingHorizontal: 12, justifyContent: 'center' }, reloadText: { color: '#81622A', fontSize: 12, fontWeight: '700' }, restore: { minHeight: 44, marginTop: 8, paddingHorizontal: 12, justifyContent: 'center' }, restoreText: { color: '#81622A', fontSize: 12, fontWeight: '700', textDecorationLine: 'underline' }, message: { width: '100%', marginTop: 8, color: '#8A462A', fontSize: 12, lineHeight: 19, textAlign: 'center' }, legalRow: { marginTop: 10, flexDirection: 'row', gap: 18 }, legal: { color: '#81622A', fontSize: 10, lineHeight: 16, textDecorationLine: 'underline' },
});
