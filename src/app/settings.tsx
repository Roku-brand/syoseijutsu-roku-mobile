import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { AppText, DetailHeader, Screen, SectionHeader } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';

export default function SettingsScreen() {
  const router = useRouter();
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
          onNavigate={(href) => router.push(href as never)}
        />
        <SettingLink
          icon="crown"
          title={isPaid ? '完全版・購入情報' : '完全版を購入'}
          detail={isPaid ? '完全版をご利用中' : '¥280・買い切り'}
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
    </Screen>
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
