import Constants from 'expo-constants';
import { Link } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText, DetailHeader, Screen, SectionHeader } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
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
        <SettingLink
          icon="person"
          title="アカウント"
          detail={user?.email ?? '未登録・ログイン'}
          href={user ? '/auth' : '/auth?mode=signin'}
        />
        <SettingLink
          icon="crown"
          title={isPaid ? '完全版を購入' : '完全版を購入'}
          detail={isPaid ? '完全版をご利用中' : '¥280・買い切り'}
          href="/upgrade"
          last
        />
      </View>

      <SectionHeader title="サポート・その他" />
      <View style={styles.group}>
        <SettingLink icon="support" title="サポート・お問い合わせ" onPress={() => void Linking.openURL('mailto:shosezyutsu6@gmail.com')} />
        <SettingLink icon="document" title="利用規約" href="/legal/terms" />
        <SettingLink icon="shield" title="プライバシーポリシー" href="/legal/privacy" />
        <SettingLink icon="brand" title="処世術禄について" href="/legal/about" last />
      </View>

      <AppText style={styles.version}>バージョン {version}</AppText>
    </Screen>
  );
}

type SettingIcon = 'person' | 'crown' | 'support' | 'document' | 'shield' | 'brand';

function SettingLink({ icon, title, detail, href, onPress, last = false }: { icon: SettingIcon; title: string; detail?: string; href?: string; onPress?: () => void; last?: boolean }) {
  const row = (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, last && styles.rowLast, pressed && styles.pressed]}>
      <SettingIconMark type={icon} />
      <View style={styles.copy}>
        <AppText style={styles.title}>{title}</AppText>
        {detail ? <AppText style={styles.detail}>{detail}</AppText> : null}
      </View>
      <AppText style={styles.chevron}>›</AppText>
    </Pressable>
  );
  return href ? <Link href={href as never} asChild>{row}</Link> : row;
}

function SettingIconMark({ type }: { type: SettingIcon }) {
  if (type === 'brand') {
    return <View style={styles.brandMark}><AppText style={styles.brandMarkText}>禄</AppText></View>;
  }
  const names = {
    person: { ios: 'person', android: 'person', web: 'person' },
    crown: { ios: 'crown', android: 'crown', web: 'crown' },
    support: { ios: 'headphones', android: 'headphones', web: 'headphones' },
    document: { ios: 'document', android: 'description', web: 'description' },
    shield: { ios: 'checkmark.shield', android: 'verified_user', web: 'verified_user' },
  } as const;
  const fallbacks = { person: '♙', crown: '♛', support: '◉', document: '▤', shield: '♢' } as const;
  return (
    <View style={styles.iconMark} accessibilityElementsHidden>
      <SymbolView name={names[type]} fallback={<AppText style={styles.iconFallback}>{fallbacks[type]}</AppText>} size={28} tintColor={colors.gold} weight="regular" />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 680, alignSelf: 'center', paddingTop: 28 },
  group: { overflow: 'hidden', borderWidth: 1, borderColor: '#E7DED1', borderRadius: 20, backgroundColor: 'rgba(255,253,248,0.78)', ...shadow.card },
  row: { minHeight: 92, paddingHorizontal: 22, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E7DED1', gap: 16 },
  rowLast: { borderBottomWidth: 0 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, lineHeight: 26, fontWeight: '600' },
  detail: { marginTop: 3, color: colors.muted, fontSize: 14, lineHeight: 21 },
  chevron: { color: colors.gold, fontFamily: fonts.sans, fontSize: 34, lineHeight: 36, fontWeight: '300', marginTop: -2 },
  iconMark: { width: 48, alignItems: 'center', justifyContent: 'center' },
  iconFallback: { color: colors.gold, fontFamily: fonts.serif, fontSize: 26, lineHeight: 30 },
  brandMark: { width: 42, height: 42, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.ink },
  brandMarkText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 24, lineHeight: 30, fontWeight: '700' },
  version: { marginTop: 48, color: '#AAA49A', fontSize: 13, lineHeight: 20, textAlign: 'center' },
  pressed: { backgroundColor: colors.paperDeep },
});
