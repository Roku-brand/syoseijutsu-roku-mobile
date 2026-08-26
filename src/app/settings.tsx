import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText, DetailHeader, Screen } from '@/components/ui';
import { colors, fonts, radius, shadow } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { formatRemainingAccess } from '@/lib/purchase';

export default function SettingsScreen() {
  const router = useRouter();
  const { user, profile, role } = useAuth();
  const { isPaid, accessInfo, accessStatus } = useAccess();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen contentContainerStyle={styles.content}>
      <DetailHeader title="設定" />

      <SettingsSection title="アカウント・購入" />
      <View style={styles.group}>
        {user ? <>
          <SettingLink
            icon="person"
            title="プロフィール"
            detail={profile?.displayName ?? user.email?.split('@')[0] ?? 'ユーザー'}
            href="/settings/profile"
            onNavigate={(href) => router.push(href as never)}
          />
          <SettingLink icon="person" title="ログイン情報・パスワード" href="/auth" onNavigate={(href) => router.push(href as never)} />
        </> : (
          <SettingLink
            icon="person"
            title="ログイン / アカウントを作成"
            detail="蔵書を引き継ぎ、プロフィールを設定できます"
            href="/auth?mode=signin"
            onNavigate={(href) => router.push(href as never)}
          />
        )}
        <SettingLink
          icon="complete"
          title={isPaid ? '完全版の利用情報' : accessStatus === 'expired' ? '完全版の利用期間終了' : '完全版を利用'}
          detail={isPaid ? accessInfo.accessType === 'thirty_day' ? `利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '旧買い切りをご利用中' : accessStatus === 'expired' ? 'もう一度30日間利用する' : '30日間 ¥280・自動更新なし'}
          href="/upgrade"
          onNavigate={(href) => router.push(href as never)}
          last={role !== 'owner'}
        />
        {role === 'owner' ? (
          <SettingLink
            icon="document"
            title="コンテンツ管理"
            detail="処世術の編集・プレビュー・公開・更新履歴"
            href="/owner/content"
            onNavigate={(href) => router.push(href as never)}
            last
          />
        ) : null}
      </View>

      <SettingsSection title="サポート・その他" />
      <View style={styles.group}>
        <SettingLink
          icon="install"
          title="ホーム画面に追加"
          detail="アプリのように、すぐ開けるようにする"
          href="/settings/install"
          onNavigate={(href) => router.push(href as never)}
        />
        <SettingLink icon="document" title="購入・完全版 FAQ" href="/legal/faq" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="document" title="特定商取引法に基づく表記" href="/legal/commerce" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="document" title="利用規約" href="/legal/terms" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="shield" title="プライバシーポリシー" href="/legal/privacy" onNavigate={(href) => router.push(href as never)} />
        <SettingLink icon="contact" title="お問い合わせ" detail="shosezyutsu6@gmail.com" onPress={() => void Linking.openURL('mailto:shosezyutsu6@gmail.com')} />
        <SettingLink icon="brand" title="処世術禄について" href="/legal/about" onNavigate={(href) => router.push(href as never)} last />
      </View>

      <AppText style={styles.version}>バージョン {version}</AppText>
    </Screen>
  );
}

function SettingsSection({ title }: { title: string }) {
  return <AppText variant="serif" style={styles.sectionTitle}>{title}</AppText>;
}

type SettingIcon = 'person' | 'complete' | 'install' | 'document' | 'shield' | 'contact' | 'brand';

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
  if (type === 'brand') return <View style={styles.brandMark}><AppText style={styles.brandMarkText}>禄</AppText></View>;
  const names = {
    person: { ios: 'person', android: 'person', web: 'person' },
    complete: { ios: 'books.vertical', android: 'menu_book', web: 'menu_book' },
    install: { ios: 'square.and.arrow.down', android: 'install_mobile', web: 'install_mobile' },
    document: { ios: 'document', android: 'description', web: 'description' },
    shield: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
    contact: { ios: 'envelope', android: 'mail', web: 'mail' },
  } as const;
  const fallbacks = { person: '人', complete: '全', install: '追加', document: '文', shield: '保', contact: '問' } as const;
  return (
    <View style={styles.iconMark} accessibilityElementsHidden>
      <SymbolView name={names[type]} fallback={<AppText style={styles.iconFallback}>{fallbacks[type]}</AppText>} size={25} tintColor={colors.gold} weight="regular" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: 8, paddingBottom: 28 },
  sectionTitle: { marginTop: 18, marginBottom: 10, color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: '700' },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: '#E1D5C3', borderRadius: 16, backgroundColor: 'rgba(255,253,248,0.86)', ...shadow.card },
  row: { minHeight: 66, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E7DED1' },
  rowLast: { borderBottomWidth: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  detail: { marginTop: 1, color: colors.muted, fontSize: 12, lineHeight: 18 },
  chevron: { width: 18, color: colors.gold, fontFamily: fonts.sans, fontSize: 27, lineHeight: 30, fontWeight: '300', textAlign: 'right' },
  iconMark: { width: 36, height: 36, marginRight: 12, alignItems: 'center', justifyContent: 'center' },
  iconFallback: { color: colors.gold, fontFamily: fonts.serif, fontSize: 22, lineHeight: 26 },
  brandMark: { width: 36, height: 36, marginRight: 12, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brandMarkText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 21, lineHeight: 27, fontWeight: '700' },
  version: { marginTop: 24, color: '#AAA49A', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { backgroundColor: colors.paperDeep },
});
