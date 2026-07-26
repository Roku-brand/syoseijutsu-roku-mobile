import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { AppText } from './ui';

export function BookScreen({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.safe}>
      <StatusBar style="light" />
      <BookHeader />
      <ScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[styles.content, contentContainerStyle]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BookHeader() {
  return (
    <View style={styles.header}>
      <View style={styles.seal}>
        <AppText style={styles.sealText}>禄</AppText>
      </View>
      <View style={styles.brandCopy}>
        <AppText style={styles.brandName}>処世術禄</AppText>
        <AppText style={styles.brandSubtitle}>賢者の手帳</AppText>
      </View>
    </View>
  );
}

export function BookTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.titleBlock}>
      <AppText style={styles.pageTitle}>{title}</AppText>
      {subtitle ? <AppText style={styles.pageSubtitle}>{subtitle}</AppText> : null}
    </View>
  );
}

export function OrnamentHeading({
  children,
  centered = false,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  return (
    <View style={[styles.sectionHeading, centered && styles.sectionHeadingCentered]}>
      <View style={styles.diamond} />
      <AppText style={styles.sectionHeadingText}>{children}</AppText>
    </View>
  );
}

export function IndexCard({
  mark,
  title,
  subtitle,
  count,
  tint = colors.surface,
  onPress,
}: {
  mark: string;
  title: string;
  subtitle?: string;
  count?: number;
  tint?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [
        styles.indexCard,
        { backgroundColor: tint },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.indexMark}>
        <AppText style={styles.indexMarkText}>{mark}</AppText>
      </View>
      <View style={styles.indexCopy}>
        <AppText style={styles.indexTitle}>{title}</AppText>
        {subtitle ? <AppText style={styles.indexSubtitle}>{subtitle}</AppText> : null}
      </View>
      {typeof count === 'number' ? (
        <AppText style={styles.indexCount}>{count}</AppText>
      ) : null}
      <AppText style={styles.indexChevron}>›</AppText>
    </Pressable>
  );
}

export const bookCardShadow = shadow.card;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.charcoal },
  scroll: { flex: 1, backgroundColor: colors.paper },
  content: {
    width: '100%',
    maxWidth: 860,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: 48,
  },
  header: {
    minHeight: 92,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: colors.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: colors.gold,
  },
  seal: {
    width: 54,
    height: 54,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealText: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontWeight: '700',
    fontSize: 27,
    lineHeight: 36,
  },
  brandCopy: { gap: 1 },
  brandName: {
    color: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: 3,
  },
  brandSubtitle: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 3,
  },
  titleBlock: { alignItems: 'center', marginBottom: spacing.xl },
  pageTitle: {
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 54,
    fontWeight: '600',
    letterSpacing: 4,
    color: colors.ink,
  },
  pageSubtitle: {
    marginTop: spacing.sm,
    fontFamily: fonts.serif,
    fontSize: 15,
    lineHeight: 24,
    letterSpacing: 1.6,
    textAlign: 'center',
    color: colors.inkSoft,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeadingCentered: { justifyContent: 'center' },
  diamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  sectionHeadingText: {
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 30,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  indexCard: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  indexMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indexMarkText: {
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 28,
    color: colors.gold,
    fontWeight: '700',
  },
  indexCopy: { flex: 1 },
  indexTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 29,
    fontWeight: '600',
    letterSpacing: 1,
  },
  indexSubtitle: {
    marginTop: 3,
    fontFamily: fonts.serif,
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 20,
  },
  indexCount: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 24,
    lineHeight: 30,
  },
  indexChevron: { color: colors.gold, fontSize: 32, lineHeight: 36 },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
