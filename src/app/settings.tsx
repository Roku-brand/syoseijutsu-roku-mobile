import Constants from 'expo-constants';
import { useRouter, type Href } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Switch, View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useAppState } from '@/state/app-state';
import { formatRemainingAccess } from '@/lib/purchase';
import { APP_ROUTES, signInRoute } from '@/navigation/app-routes';

export default function SettingsScreen() {
  const { user, profile, role } = useAuth();
  const { isPaid, accessInfo, accessStatus } = useAccess();
  const { welcomePageHidden, setWelcomePageHidden, clearPersonalData } = useAppState();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const profileDetail = user
    ? profile?.displayName ?? user.email?.split('@')[0] ?? 'ユーザー'
    : 'ログイン後に、表示名とプロフィールを設定できます';

  return (
    <Screen contentContainerStyle={styles.content}>
      <SettingsSection title="アカウント" />
      <SettingsGroup>
        <SettingLink title="プロフィール" detail={profileDetail} href={user ? APP_ROUTES.profile : signInRoute()} />
        <SettingLink
          title="ログイン情報・パスワード"
          detail={user ? user.email ?? 'ログイン情報を確認・変更します' : 'ログインまたはアカウントを作成します'}
          href={user ? APP_ROUTES.auth : signInRoute()}
        />
        <SettingLink
          title={isPaid ? '完全版の利用情報' : accessStatus === 'expired' ? '完全版の利用期間終了' : '完全版を利用'}
          detail={isPaid ? accessInfo.accessType === 'thirty_day' ? `利用中・${formatRemainingAccess(accessInfo.accessExpiresAt)}` : '旧買い切りをご利用中' : accessStatus === 'expired' ? 'もう一度30日間利用する' : '30日間 ¥280・自動更新なし'}
          href={APP_ROUTES.upgrade}
          last
        />
      </SettingsGroup>

      <SettingsSection title="アプリ設定" />
      <SettingsGroup>
        <SettingToggle
          title="ウェルカムページを非表示にする"
          detail="オンにすると、次回からホームを直接表示します"
          value={welcomePageHidden}
          onValueChange={setWelcomePageHidden}
        />
        <SettingLink title="ホーム画面に追加" detail="アプリのように、すぐ開けるようにする" href={APP_ROUTES.install} last />
      </SettingsGroup>

      {role === 'owner' ? <>
        <SettingsSection title="オーナー機能" />
        <SettingsGroup>
          <SettingLink title="コンテンツ管理" detail="処世術と主要・補助理論を編集・公開します" href={APP_ROUTES.ownerContent} />
          <SettingLink title="オーナープレビュー" detail="無料版・完全版・未ログインの表示を確認" href={APP_ROUTES.ownerPreview} last />
        </SettingsGroup>
      </> : null}

      <SettingsSection title="ヘルプ・サポート" />
      <SettingsGroup>
        <SettingLink title="処世術禄について" detail="アプリの考え方と収録内容" href={APP_ROUTES.about} />
        <SettingLink title="購入・完全版 FAQ" detail="購入、利用期間、復元について" href={APP_ROUTES.faq} />
        <SettingLink title="お問い合わせ" detail="shosezyutsu6@gmail.com" onPress={() => void Linking.openURL('mailto:shosezyutsu6@gmail.com')} last />
      </SettingsGroup>

      <View style={styles.quietSection}>
        <SettingsSection title="規約・データ" subdued />
        <SettingsGroup subdued>
          <SettingLink title="特定商取引法に基づく表記" href={APP_ROUTES.commerce} subdued />
          <SettingLink title="利用規約" href={APP_ROUTES.terms} subdued />
          <SettingLink title="プライバシーポリシー" href={APP_ROUTES.privacy} subdued />
          <SettingLink
            title="端末内データをすべて消去"
            detail="保存した蔵書、履歴、関心カテゴリなどを削除します"
            onPress={() => Alert.alert(
              '端末内データをすべて消去',
              'この端末に保存された蔵書、履歴、関心カテゴリ、学習記録などを削除します。アカウントや購入情報は削除されません。',
              [
                { text: 'キャンセル', style: 'cancel' },
                { text: '消去する', style: 'destructive', onPress: () => void clearPersonalData() },
              ],
            )}
            danger
            last
          />
        </SettingsGroup>
      </View>

      <AppText style={styles.version}>バージョン {version}</AppText>
    </Screen>
  );
}

function SettingsSection({ title, subdued = false }: { title: string; subdued?: boolean }) {
  return <AppText variant="serif" style={[styles.sectionTitle, subdued && styles.sectionTitleSubdued]}>{title}</AppText>;
}

function SettingsGroup({ children, subdued = false }: { children: React.ReactNode; subdued?: boolean }) {
  return <View style={[styles.group, subdued && styles.groupSubdued]}>{children}</View>;
}

function SettingLink({ title, detail, href, onPress, last = false, subdued = false, danger = false }: { title: string; detail?: string; href?: Href; onPress?: () => void; last?: boolean; subdued?: boolean; danger?: boolean }) {
  const router = useRouter();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress ?? (href ? () => router.push(href) : undefined)}
      style={({ pressed }) => [styles.row, last && styles.rowLast, subdued && styles.rowSubdued, danger && styles.rowDanger, pressed && styles.pressed]}
    >
      <View style={styles.copy}>
        <AppText style={[styles.title, subdued && styles.titleSubdued, danger && styles.titleDanger]}>{title}</AppText>
        {detail ? <AppText style={[styles.detail, danger && styles.detailDanger]}>{detail}</AppText> : null}
      </View>
      <AppText style={[styles.chevron, subdued && styles.chevronSubdued, danger && styles.chevronDanger]}>›</AppText>
    </Pressable>
  );
}

function SettingToggle({ title, detail, value, onValueChange }: { title: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) {
  return (
    <View style={[styles.row, styles.toggleRow, styles.rowLast]}>
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        <AppText style={styles.detail}>{detail}</AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel="ウェルカムページを非表示にする"
        trackColor={{ false: '#D9D0C2', true: '#A87B29' }}
        thumbColor="#FFFDF8"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 660, alignSelf: 'center', paddingTop: 8, paddingBottom: 36 },
  sectionTitle: { marginTop: 32, marginBottom: 10, color: colors.ink, fontSize: 19, lineHeight: 28, fontWeight: '700' },
  sectionTitleSubdued: { color: '#5E5A53' },
  group: { overflow: 'hidden', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#D8C9B2', backgroundColor: 'rgba(255,253,248,0.56)' },
  groupSubdued: { borderColor: '#E1D8CC', backgroundColor: 'rgba(248,244,236,0.48)' },
  quietSection: { marginTop: 12, paddingTop: 10 },
  row: { minHeight: 68, paddingVertical: 11, paddingLeft: 16, paddingRight: 13, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E3D9CA' },
  rowLast: { borderBottomWidth: 0 },
  rowSubdued: { borderBottomColor: '#E9E2D8' },
  rowDanger: { backgroundColor: '#F4EDE4', borderTopWidth: 1, borderTopColor: '#D8C1A8' },
  toggleRow: { minHeight: 76 },
  copy: { flex: 1, minWidth: 0, paddingRight: 12 },
  title: { color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: '600' },
  titleSubdued: { color: '#4D4A44' },
  titleDanger: { color: '#674840' },
  detail: { marginTop: 2, color: '#69645C', fontSize: 12, lineHeight: 18 },
  detailDanger: { color: '#80665C' },
  chevron: { width: 20, color: colors.gold, fontFamily: fonts.sans, fontSize: 27, lineHeight: 30, fontWeight: '300', textAlign: 'right' },
  chevronSubdued: { color: '#A59479' },
  chevronDanger: { color: '#98725B' },
  version: { marginTop: 32, color: '#938D84', fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { backgroundColor: '#F1EADC' },
});
