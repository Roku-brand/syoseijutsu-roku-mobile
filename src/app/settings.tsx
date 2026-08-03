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
      <DetailHeader title="設定" />
      <View style={styles.brandCard}>
        <BrandMark />
        <AppText style={styles.concept}>人生の判断と立ち回りにOSを。</AppText>
        <AppText variant="caption">バージョン {version}</AppText>
      </View>

      <SectionHeader title="アカウント・購入" />
      <SettingLink
        title="アカウント"
        detail={user?.email ?? 'ログイン・会員登録'}
        href={user ? '/auth' : '/auth?mode=signin'}
      />
      <SettingLink
        title="完全版を購入"
        detail={isPaid ? '完全版をご利用中' : '¥280・買い切り'}
        href="/upgrade"
      />

      <SectionHeader title="サービス・規約" />
      <SettingLink title="処世術禄について" href="/legal/about" />
      <SettingLink title="利用規約" href="/legal/terms" />
      <SettingLink title="プライバシーポリシー" href="/legal/privacy" />
      <SettingLink title="特定商取引法に基づく表記" href="/legal/commerce" />

      <SectionHeader title="データ" />
      <View style={styles.dataCard}>
        <AppText variant="serif" style={styles.dataTitle}>
          端末内で完結
        </AppText>
        <AppText style={styles.dataBody}>
          保存、メモ、コレクション、閲覧履歴はこの端末に保存されます。アカウント・購入をご利用の場合は、ログイン情報と購入状態を安全に管理するため外部サービスを利用します。
        </AppText>
      </View>
      <Pressable
        onPress={confirmClear}
        style={({ pressed }) => [
          styles.dangerButton,
          pressed && styles.pressed,
        ]}
      >
        <AppText variant="label" style={styles.dangerText}>
          個人データをすべて消去
        </AppText>
      </Pressable>

      <AppText variant="caption" style={styles.copyright}>
        © 禄ブランド
      </AppText>
    </Screen>
  );
}

function SettingLink({
  title,
  detail,
  href,
}: {
  title: string;
  detail?: string;
  href: string;
}) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
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
  brandCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    gap: spacing.md,
  },
  concept: { color: colors.inkSoft },
  linkRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  linkCopy: { flex: 1, minWidth: 0 },
  linkTitle: { fontSize: 15, fontWeight: '700' },
  linkDetail: { marginTop: 3, color: colors.muted, fontSize: 11, lineHeight: 16 },
  chevron: { color: colors.gold, fontSize: 23, lineHeight: 28 },
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
  copyright: { textAlign: 'center', marginTop: spacing.xxl },
});
