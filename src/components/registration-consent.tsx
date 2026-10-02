import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { colors } from '@/constants/theme';

export function RegistrationConsent({ checked, onChange }: { checked: boolean; onChange: (value: boolean) => void }) {
  const router = useRouter();
  return <View style={styles.root}>
    <View style={styles.links}>
      <Pressable accessibilityRole="button" onPress={() => router.push('/legal/terms')} style={styles.link}><AppText style={styles.linkText}>利用規約</AppText></Pressable>
      <Pressable accessibilityRole="button" onPress={() => router.push('/legal/privacy')} style={styles.link}><AppText style={styles.linkText}>プライバシーポリシー</AppText></Pressable>
    </View>
    <Pressable accessibilityRole="checkbox" accessibilityLabel="利用規約とプライバシーポリシーを確認して同意する" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.check}>
      <AppText style={styles.box}>{checked ? '☑' : '□'}</AppText><AppText style={styles.text}>内容を確認し、登録に同意します。</AppText>
    </Pressable>
    <AppText style={styles.note}>18歳未満の方は親権者等の同意を得てください。利用状況の送信は別の任意設定で、登録への同意には含みません。</AppText>
  </View>;
}
const styles = StyleSheet.create({
  root: { marginTop: 12, marginBottom: 8 }, links: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  link: { paddingVertical: 9 }, linkText: { color: colors.goldDeep, fontSize: 12, textDecorationLine: 'underline' },
  check: { minHeight: 44, flexDirection: 'row', gap: 10, alignItems: 'center' }, box: { fontSize: 22, color: colors.goldDeep },
  text: { flex: 1, fontSize: 13, lineHeight: 21 }, note: { color: colors.muted, fontSize: 11, lineHeight: 18 },
});
