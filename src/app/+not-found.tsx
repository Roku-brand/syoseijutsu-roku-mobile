import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <Screen contentContainerStyle={styles.content}>
      <View style={styles.mark} accessibilityElementsHidden><AppText style={styles.markText}>余</AppText></View>
      <AppText accessibilityRole="header" aria-level={1} variant="serif" style={styles.title}>ページが見つかりません</AppText>
      <AppText style={styles.description}>URLが変わったか、ページが削除された可能性があります。</AppText>
      <Link href="/" asChild>
        <Pressable accessibilityRole="link" accessibilityLabel="処世術禄のホームへ戻る" style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
          <AppText style={styles.buttonText}>処世術禄のホームへ戻る</AppText>
        </Pressable>
      </Link>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { minHeight: 520, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  mark: { width: 64, height: 64, borderRadius: 32, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  markText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 26, lineHeight: 34 },
  title: { marginTop: spacing.lg, color: colors.ink, fontSize: 24, lineHeight: 36, textAlign: 'center' },
  description: { marginTop: spacing.sm, color: colors.muted, fontSize: 14, lineHeight: 24, textAlign: 'center' },
  button: { minHeight: 48, marginTop: spacing.xl, paddingHorizontal: spacing.xl, borderRadius: radius.pill, backgroundColor: colors.charcoal, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: colors.goldLight, fontSize: 13, fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
