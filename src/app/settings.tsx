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

export default function SettingsScreen() {
  const { clearPersonalData } = useAppState();
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

      <SectionHeader title="情報" />
      <SettingLink title="処世術禄について" href="/legal/about" />
      <SettingLink title="プライバシーポリシー" href="/legal/privacy" />
      <SettingLink title="利用規約" href="/legal/terms" />
      <SettingLink
        title="公式Web版"
        href="https://roku-brand.github.io/syoseizyutsu-roku/"
        external
      />

      <SectionHeader title="データ" />
      <View style={styles.dataCard}>
        <AppText variant="serif" style={styles.dataTitle}>
          端末内で完結
        </AppText>
        <AppText style={styles.dataBody}>
          保存、メモ、コレクション、閲覧履歴はこの端末にのみ保存されます。
          アカウント登録や外部サーバーへの送信は行いません。
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
  href,
  external = false,
}: {
  title: string;
  href: string;
  external?: boolean;
}) {
  return (
    <Link href={href as never} asChild>
      <Pressable style={({ pressed }) => [styles.linkRow, pressed && styles.pressed]}>
        <AppText style={styles.linkTitle}>{title}</AppText>
        <AppText style={styles.chevron}>{external ? '↗' : '›'}</AppText>
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
  linkTitle: { flex: 1 },
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
