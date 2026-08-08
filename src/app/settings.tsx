import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { AppText, DetailHeader, Screen, SectionHeader } from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';

export default function SettingsScreen() {
  const { user } = useAuth();
  const { isPaid } = useAccess();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen contentContainerStyle={styles.content}>
      <DetailHeader title="設定" />
      <SectionHeader title="アカウント・購入" />
      <View style={styles.group}>
        <SettingLink title="アカウント" detail={user?.email ?? '未登録・ログイン'} href={user ? '/auth' : '/auth?mode=signin'} />
        <SettingLink title={isPaid ? '完全版をご利用中' : '完全版を購入'} detail={isPaid ? '購入状態を確認できます' : '¥280・買い切り'} href="/upgrade" last />
      </View>

      <SectionHeader title="サポート・その他" />
      <View style={styles.group}>
        <SettingLink title="サポート・お問い合わせ" onPress={() => void Linking.openURL('mailto:shosezyutsu6@gmail.com')} />
        <SettingLink title="利用規約" href="/legal/terms" />
        <SettingLink title="プライバシーポリシー" href="/legal/privacy" />
        <SettingLink title="処世術禄について" href="/legal/about" last />
      </View>

      <AppText style={styles.version}>バージョン {version}</AppText>
    </Screen>
  );
}

function SettingLink({ title, detail, href, onPress, last = false }: { title: string; detail?: string; href?: string; onPress?: () => void; last?: boolean }) {
  const row = (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}>
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      </View>
      <AppText style={styles.chevron}>›</AppText>
    </Pressable>
  );
  return href ? <Link href={href as never} asChild>{row}</Link> : row;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  row: { minHeight: 62, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  rowLast: { borderBottomWidth: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  detail: { marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 18 },
  chevron: { color: colors.gold, fontSize: 25, lineHeight: 28 },
  version: { marginTop: spacing.xxl, color: colors.muted, fontSize: 12, lineHeight: 18, textAlign: 'center' },
  pressed: { backgroundColor: colors.paperDeep },
});
