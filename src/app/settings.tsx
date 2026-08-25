import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Image, Linking, Platform, Pressable, Share, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText, DetailHeader, Screen, SectionHeader, SegmentedControl } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { formatRemainingAccess } from '@/lib/purchase';
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeToInstallPrompt,
  type DeferredInstallPrompt,
} from '@/lib/pwa-install';

const APP_URL = 'https://roku-brand.github.io/syoseijutsu-roku-mobile/';
type SettingsTab = 'settings' | 'install';
type InstallPlatform = 'ios' | 'android' | 'desktop';

export default function SettingsScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<SettingsTab>('settings');
  const { user, profile } = useAuth();
  const { isPaid, accessInfo, accessStatus } = useAccess();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen contentContainerStyle={styles.content}>
      <DetailHeader title="設定" />
      <SegmentedControl
        value={activeTab}
        options={[
          { value: 'settings', label: '設定' },
          { value: 'install', label: 'アプリを追加' },
        ]}
        onChange={setActiveTab}
      />
      {activeTab === 'settings' ? <>
      <SectionHeader title="アカウント・購入" />
      <View style={styles.group}>
        {user ? <>
          <SettingLink
            icon="person"
            title="プロフィール"
            detail={profile?.displayName ?? user.email?.split('@')[0] ?? 'ユーザー'}
            href="/settings/profile"
            onNavigate={(href) => router.push(href as never)}
          />
          <SettingLink
            icon="person"
            title="ログイン情報・パスワード"
            href="/auth"
            onNavigate={(href) => router.push(href as never)}
          />
        </> : <SettingLink
          icon="person"
          title="ログイン / アカウントを作成"
          detail="蔵書を引き継ぎ、プロフィールを設定できます"
          href="/auth?mode=signin"
          onNavigate={(href) => router.push(href as never)}
        />}
        <SettingLink
          icon="crown"
          title={isPaid ? '完全版・利用情報' : accessStatus === 'expired' ? '完全版・利用期間終了' : '完全版を利用'}
          detail={isPaid ? accessInfo.accessType === 'thirty_day' ? `利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '旧買い切り版をご利用中' : accessStatus === 'expired' ? 'もう一度30日間利用する' : '30日間 ¥280・自動更新なし'}
          href="/upgrade"
          onNavigate={(href) => router.push(href as never)}
          last
        />
      </View>

      <SectionHeader title="サポート・その他" />
      <View style={styles.group}>
        <SettingLink icon="document" title="購入・完全版 FAQ" href="/legal/faq" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="document" title="特定商取引法に基づく表記" href="/legal/commerce" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="document" title="利用規約" href="/legal/terms" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="shield" title="プライバシーポリシー" href="/legal/privacy" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="contact" title="お問い合わせ" detail="shosezyutsu6@gmail.com" onPress={() => void Linking.openURL('mailto:shosezyutsu6@gmail.com')} />
        <SettingLink icon="brand" title="処世術禄について" href="/legal/about" onNavigate={(href) => router.push(href as never)} last />
      </View>

      <AppText style={styles.version}>バージョン {version}</AppText>
      </> : <InstallAppPanel />}
    </Screen>
  );
}

function InstallAppPanel() {
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
    <View style={styles.installPanel}>
      <View style={styles.promoCard}>
        <Image
          source={require('../../assets/brand/pwa-install-guide.png')}
          style={styles.promoImage}
          resizeMode="contain"
          accessibilityLabel="ホーム画面に処世術禄を追加する案内"
        />
        <View style={styles.promoCopy}>
          <AppText style={styles.promoEyebrow}>PWA対応</AppText>
          <AppText style={styles.promoTitle}>ホーム画面に、処世術禄を。</AppText>
          <AppText style={styles.promoLead}>ブラウザを探す手間なく、必要な処世術を一タップで開けます。追加は無料で、通常のアプリのように使えます。</AppText>
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

      <SectionHeader title={platform === 'ios' ? 'iPhone・iPadでの追加方法' : platform === 'android' ? 'Androidでの追加方法' : 'パソコンでの追加方法'} />
      <View style={styles.stepsCard}>
        {steps.map((step, index) => <InstallStep key={step} number={index + 1} text={step} last={index === steps.length - 1} />)}
      </View>

      <View style={styles.guideHint}>
        <AppText style={styles.guideHintTitle}>メニューに「ホーム画面に追加」が見つからない場合</AppText>
        <AppText style={styles.guideHintText}>{platform === 'ios' ? 'LINEやXなどのアプリ内ブラウザではなく、Safariで開き直してください。' : 'ブラウザを最新版に更新し、ChromeまたはEdgeで開き直してください。'}</AppText>
      </View>

      <SectionHeader title="処世術禄を紹介する" />
      <View style={styles.shareCard}>
        <View style={styles.copy}>
          <AppText style={styles.shareTitle}>大切な人にも、一冊の判断軸を。</AppText>
          <AppText style={styles.detail}>このアプリのURLをメッセージやSNSで共有できます。</AppText>
        </View>
        <Pressable accessibilityRole="button" onPress={() => void shareApp()} style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}>
          <AppText style={styles.shareButtonText}>紹介する</AppText>
        </Pressable>
      </View>
      {message ? <AppText accessibilityLiveRegion="polite" style={styles.feedback}>{message}</AppText> : null}
    </View>
  );
}

function Benefit({ label }: { label: string }) {
  return <View style={styles.benefit}><AppText style={styles.benefitText}>◇ {label}</AppText></View>;
}

function InstallStep({ number, text, last }: { number: number; text: string; last: boolean }) {
  return (
    <View style={[styles.step, last && styles.stepLast]}>
      <View style={styles.stepNumber}><AppText style={styles.stepNumberText}>{number}</AppText></View>
      <AppText style={styles.stepText}>{text}</AppText>
    </View>
  );
}

type SettingIcon = 'person' | 'crown' | 'document' | 'shield' | 'contact' | 'brand';

function SettingLink({ icon, title, detail, href, onPress, onNavigate, last = false }: { icon: SettingIcon; title: string; detail?: string; href?: string; onPress?: () => void; onNavigate?: (href: string) => void; last?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (href ? () => onNavigate?.(href) : undefined)}
      style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}
    >
      <SettingIconMark type={icon} />
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      </View>
      <AppText style={styles.chevron}>›</AppText>
    </Pressable>
  );
}

function SettingIconMark({ type }: { type: SettingIcon }) {
  if (type === 'brand') {
    return <View style={styles.brandMark}><AppText style={styles.brandMarkText}>禄</AppText></View>;
  }
  const names = {
    person: { ios: 'person', android: 'person', web: 'person' },
    crown: { ios: 'crown', android: 'crown', web: 'crown' },
    document: { ios: 'document', android: 'description', web: 'description' },
    shield: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
    contact: { ios: 'envelope', android: 'mail', web: 'mail' },
  } as const;
  const fallbacks = { person: '♙', crown: '♛', document: '▤', shield: '♢', contact: '✉' } as const;
  return (
    <View style={styles.iconMark} accessibilityElementsHidden>
      <SymbolView name={names[type]} fallback={<AppText style={styles.iconFallback}>{fallbacks[type]}</AppText>} size={28} tintColor={colors.gold} weight="regular" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: 20 },
  installPanel: { paddingTop: spacing.xl },
  promoCard: { overflow: 'hidden', borderWidth: 1, borderColor: '#9E7935', borderRadius: 22, backgroundColor: '#151514', ...shadow.card },
  promoImage: { width: '100%', aspectRatio: 1120 / 1400, backgroundColor: '#11110F' },
  promoCopy: { padding: 22, borderTopWidth: 1, borderTopColor: 'rgba(196,148,50,0.45)' },
  promoEyebrow: { color: colors.goldLight, fontSize: 11, lineHeight: 17, fontWeight: '700', letterSpacing: 2 },
  promoTitle: { marginTop: 8, color: '#F6E8CC', fontFamily: fonts.serif, fontSize: 26, lineHeight: 38, fontWeight: '700' },
  promoLead: { marginTop: 10, color: '#D8CDBA', fontSize: 14, lineHeight: 24 },
  benefitRow: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  benefit: { minHeight: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(196,148,50,0.5)', borderRadius: radius.pill },
  benefitText: { color: '#E7D2AA', fontSize: 11, lineHeight: 16, fontWeight: '600' },
  installButton: { minHeight: 58, marginTop: spacing.lg, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: radius.md, backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.gold },
  installButtonText: { color: colors.goldLight, fontSize: 15, lineHeight: 22, fontWeight: '700', letterSpacing: 0.5 },
  installButtonArrow: { position: 'absolute', right: 20, color: colors.goldLight, fontSize: 28, lineHeight: 30 },
  installedNotice: { minHeight: 70, marginTop: spacing.lg, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: '#A8B89B', borderRadius: radius.md, backgroundColor: '#EEF4E9' },
  installedMark: { width: 32, height: 32, borderRadius: 16, color: '#FFFFFF', backgroundColor: colors.success, fontSize: 18, lineHeight: 31, fontWeight: '700', textAlign: 'center' },
  installedTitle: { fontSize: 15, lineHeight: 22, fontWeight: '700' },
  stepsCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  step: { minHeight: 72, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: colors.line },
  stepLast: { borderBottomWidth: 0 },
  stepNumber: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, backgroundColor: colors.paperDeep },
  stepNumberText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 22 },
  guideHint: { marginTop: spacing.md, padding: 16, borderLeftWidth: 3, borderLeftColor: colors.gold, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  guideHintTitle: { fontSize: 13, lineHeight: 20, fontWeight: '700' },
  guideHintText: { marginTop: 4, color: colors.muted, fontSize: 12, lineHeight: 19 },
  shareCard: { minHeight: 94, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  shareTitle: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, fontWeight: '700' },
  shareButton: { minHeight: 42, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: colors.ink },
  shareButtonText: { color: colors.goldLight, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  feedback: { marginTop: spacing.md, color: colors.success, fontSize: 12, lineHeight: 19, textAlign: 'center' },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: '#E7DED1', borderRadius: 20, backgroundColor: 'rgba(255,253,248,0.78)', ...shadow.card },
  row: { minHeight: 78, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E7DED1' },
  rowLast: { borderBottomWidth: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 17, lineHeight: 24, fontWeight: '600' },
  detail: { marginTop: 2, color: colors.muted, fontSize: 13, lineHeight: 19 },
  chevron: { width: 20, color: colors.gold, fontFamily: fonts.sans, fontSize: 32, lineHeight: 34, fontWeight: '300', textAlign: 'right' },
  iconMark: { width: 42, height: 42, marginRight: 14, alignItems: 'center', justifyContent: 'center' },
  iconFallback: { color: colors.gold, fontFamily: fonts.serif, fontSize: 26, lineHeight: 30 },
  brandMark: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brandMarkText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  version: { marginTop: 48, color: '#AAA49A', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  pressed: { backgroundColor: colors.paperDeep },
});
