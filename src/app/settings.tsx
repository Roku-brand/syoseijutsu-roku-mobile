import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import {
  AppText,
  BrandMark,
  DetailHeader,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAppState } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';

export default function SettingsScreen() {
  const { clearPersonalData } = useAppState();
  const { user } = useAuth();
  const { isPaid } = useAccess();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  const confirmClear = () => {
    Alert.alert(
      '個人データを消去',
      '保存、メモ、コレクション、閲覧履歴をこの端末から消去します。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '消去する',
          style: 'destructive',
          onPress: () => void clearPersonalData(),
        },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.settingsHeader}>
        <Link href="/my-os" asChild><Pressable style={styles.backButton}><AppText style={styles.backIcon}>‹</AppText><AppText style={styles.backText}>戻る</AppText></Pressable></Link>
        <AppText variant="serif" style={styles.settingsTitle}>設定</AppText>
        <View style={styles.settingsHeaderMark}><AppText style={styles.headerMarkText}>◎</AppText><AppText style={styles.headerMarkText}>○</AppText></View>
      </View>
      <AppText variant="serif" style={styles.groupTitle}>アカウント・購入</AppText>
      <View style={styles.groupCard}>
        <SettingLink icon="♙" title="アカウント" detail={user?.email ?? 'ログイン・会員登録'} href={user ? '/auth' : '/auth?mode=signin'} />
        <SettingLink icon="♛" title="完全版を購入" detail={isPaid ? '完全版をご利用中' : '¥280・買い切り'} href="/upgrade" />
      </View>
      <AppText variant="serif" style={styles.groupTitle}>サポート・その他</AppText>
      <View style={styles.groupCard}>
        <SettingLink icon="♧" title="サポート・お問い合わせ" href="/legal/about" />
        <SettingLink icon="▤" title="利用規約" href="/legal/terms" />
        <SettingLink icon="♢" title="プライバシーポリシー" href="/legal/privacy" />
        <SettingLink icon="禄" title="処世術禄について" href="/legal/about" last />
      </View>
      <AppText style={styles.version}>バージョン {version}</AppText>
      <Pressable onPress={confirmClear} style={styles.clearButton}><AppText style={styles.clearText}>端末内の個人データを消去</AppText></Pressable>
    </Screen>
  );
}

function SettingLink({
  title,
  detail,
  href,
  icon,
  last,
}: {
  title: string;
  detail?: string;
  href: string;
  icon?: string;
  last?: boolean;
}) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={({ pressed }) => [styles.linkRow, last && styles.lastRow, pressed && styles.pressed]}>
        <AppText style={styles.linkIcon}>{icon}</AppText>
        <View style={styles.linkCopy}>
          <AppText style={styles.linkTitle}>{title}</AppText>
          {detail ? <AppText style={styles.linkDetail} numberOfLines={1}>{detail}</AppText> : null}
        </View>
        <AppText style={styles.chevron}>›</AppText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  settingsHeader: { minHeight: 94, marginHorizontal: -spacing.md, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: colors.line },
  backButton: { minWidth: 105, minHeight: 44, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.gold, borderRadius: 12 },
  backIcon: { color: colors.gold, fontSize: 34, lineHeight: 34 },
  backText: { color: colors.gold, fontSize: 17, fontWeight: '600' },
  settingsTitle: { position: 'absolute', left: 0, right: 0, textAlign: 'center', color: colors.ink, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  settingsHeaderMark: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  headerMarkText: { color: colors.gold, fontSize: 28 },
  groupTitle: { marginTop: 31, marginBottom: 13, color: colors.ink, fontSize: 22, lineHeight: 30, fontWeight: '700' },
  groupCard: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: 22, backgroundColor: colors.surface },
  linkRow: {
    minHeight: 76,
    paddingHorizontal: 18,
    gap: 14,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  lastRow: { borderBottomWidth: 0 },
  linkIcon: { width: 40, color: colors.gold, fontSize: 30, lineHeight: 36, textAlign: 'center' },
  linkCopy: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 18, lineHeight: 25, fontWeight: '700' },
  linkDetail: { marginTop: 2, color: colors.muted, fontSize: 14, lineHeight: 20 },
  chevron: { color: colors.gold, fontSize: 32, lineHeight: 34 },
  pressed: { opacity: 0.65 },
  dataCard: {
    borderRadius: radius.md,
    padding: spacing.lg,
    backgroundColor: '#E2E8DF',
  },
  dataTitle: { fontSize: 18, lineHeight: 26, color: colors.success },
  dataBody: { marginTop: spacing.sm },
  dangerButton: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  dangerText: { color: colors.danger },
  version: { marginTop: 45, color: colors.muted, fontSize: 17, textAlign: 'center' },
  clearButton: { marginTop: 20, alignItems: 'center' },
  clearText: { color: colors.danger, fontSize: 12, textDecorationLine: 'underline' },
});
