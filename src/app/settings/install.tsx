import { useEffect, useState } from 'react';
import { Image, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, Screen } from '@/components/ui';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeToInstallPrompt,
  type DeferredInstallPrompt,
} from '@/lib/pwa-install';

const APP_URL = 'https://shoseijutsuroku.com/';
type InstallPlatform = 'ios' | 'android' | 'desktop';

export default function InstallAppScreen() {
  const { width } = useHydratedWindowDimensions();
  const wide = width >= 760;
  const compactPromoWidth = Math.max(0, Math.min(width - 32, 760));
  const compactPromoHeight = Math.round(compactPromoWidth * 1402 / 1122);
  const [installPrompt, setInstallPrompt] = useState<DeferredInstallPrompt | null>(() => getDeferredInstallPrompt());
  const [platform, setPlatform] = useState<InstallPlatform>('desktop');
  const [installed, setInstalled] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => subscribeToInstallPrompt(setInstallPrompt), []);
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof navigator === 'undefined' || typeof window === 'undefined') return;
    const userAgent = navigator.userAgent.toLowerCase();
    const appleTouchDevice = /iphone|ipad|ipod/.test(userAgent) || (/macintosh/.test(userAgent) && navigator.maxTouchPoints > 1);
    setPlatform(appleTouchDevice ? 'ios' : /android/.test(userAgent) ? 'android' : 'desktop');
    const standaloneNavigator = navigator as Navigator & { standalone?: boolean };
    setInstalled(Boolean(standaloneNavigator.standalone) || window.matchMedia('(display-mode: standalone)').matches);
  }, []);

  const steps = platform === 'ios'
    ? ['Safariで処世術禄を開く', '画面下の共有ボタン「□↑」を押す', '「ホーム画面に追加」を選び、右上の「追加」を押す']
    : platform === 'android'
      ? ['Chromeで処世術禄を開く', '右上の「︙」を押す', '「アプリをインストール」または「ホーム画面に追加」を選ぶ']
      : ['ChromeまたはEdgeで処世術禄を開く', 'アドレスバー右側のインストールアイコンを押す', '確認画面で「インストール」を選ぶ'];

  async function installNow() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const result = await installPrompt.userChoice;
    clearDeferredInstallPrompt();
    if (result.outcome === 'accepted') {
      setInstalled(true);
      setMessage('ホーム画面への追加を開始しました。');
    } else {
      setMessage('いつでも、この画面から追加できます。');
    }
  }

  async function shareApp() {
    const shareMessage = `人生に必要な処世術を、一冊に。\n${APP_URL}`;
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share({ title: '処世術禄', text: '人生に必要な処世術を、一冊に。', url: APP_URL });
      } else {
        await Share.share({ title: '処世術禄', message: shareMessage, url: APP_URL });
      }
      setMessage('紹介用の共有画面を開きました。');
    } catch {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(APP_URL);
        setMessage('紹介用URLをコピーしました。');
      }
    }
  }

  return (
    <Screen contentContainerStyle={styles.content}>
      <DetailHeader title="ホーム画面に追加" />

      <View style={[styles.promoCard, wide && styles.promoCardWide]}>
        <Image
          source={require('../../../assets/brand/pwa-install-guide.png')}
          style={[styles.promoImage, !wide && { height: compactPromoHeight }, wide && styles.promoImageWide]}
          resizeMode="contain"
          accessibilityLabel="ホーム画面に処世術禄を追加する案内"
        />
        <View style={[styles.promoCopy, wide && styles.promoCopyWide]}>
          <AppText style={styles.promoEyebrow}>PWA対応</AppText>
          <AppText style={styles.promoTitle}>アプリのように、すぐ開ける。</AppText>
          <AppText style={styles.promoLead}>追加は無料です。ブラウザを探す手間なく、ホーム画面の「禄」から直接開けます。</AppText>
          <View style={styles.benefitRow}>
            <Benefit label="すぐ開ける" />
            <Benefit label="全画面で読める" />
            <Benefit label="追加は無料" />
          </View>
        </View>
      </View>

      {installed ? (
        <View style={styles.installedNotice}>
          <AppText style={styles.installedMark}>✓</AppText>
          <View style={styles.copy}>
            <AppText style={styles.installedTitle}>この端末には追加済みです</AppText>
            <AppText style={styles.detail}>ホーム画面の「禄」アイコンから開けます。</AppText>
          </View>
        </View>
      ) : installPrompt ? (
        <Pressable accessibilityRole="button" onPress={() => void installNow()} style={({ pressed }) => [styles.installButton, pressed && styles.pressed]}>
          <AppText style={styles.installButtonText}>今すぐホーム画面に追加</AppText>
          <AppText style={styles.installButtonArrow}>›</AppText>
        </Pressable>
      ) : null}

      <SectionLabel title={platform === 'ios' ? 'iPhone・iPadでの追加方法' : platform === 'android' ? 'Androidでの追加方法' : 'パソコンでの追加方法'} />
      <View style={styles.stepsCard}>
        {steps.map((step, index) => <InstallStep key={step} number={index + 1} text={step} last={index === steps.length - 1} />)}
      </View>

      <View style={styles.guideHint}>
        <AppText style={styles.guideHintTitle}>「ホーム画面に追加」が見つからない場合</AppText>
        <AppText style={styles.guideHintText}>{platform === 'ios' ? 'LINEなどのアプリ内ブラウザではなく、Safariで開き直してください。' : 'ブラウザを最新版に更新し、ChromeまたはEdgeで開き直してください。'}</AppText>
      </View>

      <SectionLabel title="処世術禄を紹介する" />
      <View style={styles.shareCard}>
        <View style={styles.copy}>
          <AppText style={styles.shareTitle}>大切な人にも、一冊の判断軸を。</AppText>
          <AppText style={styles.detail}>メッセージやSNSでアプリのURLを共有できます。</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void shareApp()} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
          <AppText style={styles.shareButtonText}>紹介する</AppText>
        </Pressable>
      </View>
      {message ? <AppText accessibilityLiveRegion="polite" style={styles.feedback}>{message}</AppText> : null}
    </Screen>
  );
}

function SectionLabel({ title }: { title: string }) {
  return <AppText variant="serif" style={styles.sectionLabel}>{title}</AppText>;
}

function Benefit({ label }: { label: string }) {
  return <View style={styles.benefit}><AppText style={styles.benefitText}>◆ {label}</AppText></View>;
}

function InstallStep({ number, text, last }: { number: number; text: string; last: boolean }) {
  return (
    <View style={[styles.step, last && styles.stepLast]}>
      <View style={styles.stepNumber}><AppText style={styles.stepNumberText}>{number}</AppText></View>
      <AppText style={styles.stepText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingTop: 8, paddingBottom: 28 },
  promoCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#9E7935', borderRadius: 18, backgroundColor: '#151514', ...shadow.card },
  promoCardWide: { height: 440, flexDirection: 'row', alignItems: 'stretch' },
  promoImage: { width: '100%', backgroundColor: '#11110F' },
  promoImageWide: { width: '47%', height: 440, alignSelf: 'center' },
  promoCopy: { padding: 16, borderTopWidth: 1, borderTopColor: 'rgba(196,148,50,0.45)' },
  promoCopyWide: { flex: 1, justifyContent: 'center', padding: 22, borderTopWidth: 0, borderLeftWidth: 1, borderLeftColor: 'rgba(196,148,50,0.45)' },
  promoEyebrow: { color: colors.goldLight, fontSize: 10, lineHeight: 16, fontWeight: '700', letterSpacing: 2 },
  promoTitle: { marginTop: 6, color: '#F6E8CC', fontFamily: fonts.serif, fontSize: 23, lineHeight: 33, fontWeight: '700' },
  promoLead: { marginTop: 8, color: '#D8CDBA', fontSize: 13, lineHeight: 21 },
  benefitRow: { marginTop: 13, flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  benefit: { minHeight: 27, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,148,50,0.5)', borderRadius: radius.pill },
  benefitText: { color: '#E7D2AA', fontSize: 10, lineHeight: 15, fontWeight: '600' },
  installButton: { minHeight: 52, marginTop: 12, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.gold },
  installButtonText: { color: colors.goldLight, fontSize: 14, lineHeight: 21, fontWeight: '700', letterSpacing: 0.4 },
  installButtonArrow: { position: 'absolute', right: 18, color: colors.goldLight, fontSize: 26, lineHeight: 28 },
  installedNotice: { minHeight: 62, marginTop: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: '#A8B89B', borderRadius: radius.md, backgroundColor: '#EEF4E9' },
  installedMark: { width: 29, height: 29, borderRadius: 15, color: '#FFFFFF', backgroundColor: colors.success, fontSize: 16, lineHeight: 28, fontWeight: '700', textAlign: 'center' },
  installedTitle: { fontSize: 14, lineHeight: 21, fontWeight: '700' },
  sectionLabel: { marginTop: 22, marginBottom: 9, color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  stepsCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.surface },
  step: { minHeight: 60, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.line },
  stepLast: { borderBottomWidth: 0 },
  stepNumber: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.paperDeep },
  stepNumberText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 20 },
  guideHint: { marginTop: 10, padding: 13, borderLeftWidth: 3, borderLeftColor: colors.gold, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  guideHintTitle: { fontSize: 12, lineHeight: 19, fontWeight: '700' },
  guideHintText: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 18 },
  shareCard: { minHeight: 80, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 15, backgroundColor: colors.surface },
  shareTitle: { fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  shareButton: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: colors.ink },
  shareButtonText: { color: colors.goldLight, fontSize: 11, lineHeight: 17, fontWeight: '700' },
  copy: { flex: 1, minWidth: 0 },
  detail: { marginTop: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  feedback: { marginTop: 10, color: colors.success, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.74 },
});
