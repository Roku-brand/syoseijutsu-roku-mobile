import { Link, useRouter } from 'expo-router';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type PressableProps,
  type ScrollViewProps,
  type TextProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius, spacing } from '@/constants/theme';

export function AppText({
  style,
  variant = 'body',
  ...props
}: TextProps & {
  variant?: 'body' | 'caption' | 'label' | 'title' | 'display' | 'serif';
}) {
  return (
    <Text
      {...props}
      style={[
        styles.text,
        variant === 'caption' && styles.caption,
        variant === 'label' && styles.label,
        variant === 'title' && styles.title,
        variant === 'display' && styles.display,
        variant === 'serif' && styles.serif,
        style,
      ]}
    />
  );
}

export function Screen({
  children,
  scroll = true,
  contentContainerStyle,
  ...props
}: ViewProps &
  ScrollViewProps & {
    scroll?: boolean;
  }) {
  const content = scroll ? (
    <ScrollView
      {...props}
      style={[styles.flex, props.style]}
      contentContainerStyle={[styles.screenContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  ) : (
    <View {...props} style={[styles.flex, props.style]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      {content}
    </SafeAreaView>
  );
}

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.brand, compact && styles.brandCompact]}>
      <View style={[styles.brandSeal, compact && styles.brandSealCompact]}>
        <AppText style={[styles.brandSealText, compact && styles.brandSealTextCompact]}>
          禄
        </AppText>
      </View>
      {!compact && (
        <View>
          <AppText style={styles.brandName}>処世術禄</AppText>
          <AppText variant="caption" style={styles.brandCaption}>
            SHŌSEIJUTSU ROKU
          </AppText>
        </View>
      )}
    </View>
  );
}

export function Header({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerCopy}>
        {eyebrow && (
          <AppText variant="label" style={styles.eyebrow}>
            {eyebrow}
          </AppText>
        )}
        <AppText variant="title">{title}</AppText>
        {description && (
          <AppText style={styles.headerDescription}>{description}</AppText>
        )}
      </View>
      {right}
    </View>
  );
}

export function DetailHeader({
  title,
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <View style={styles.detailHeader}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="前の画面へ戻る"
        onPress={() => router.back()}
        style={styles.detailBack}
        hitSlop={10}
      >
        <AppText style={styles.detailBackIcon}>‹</AppText>
        <AppText variant="label" style={styles.detailBackText}>
          戻る
        </AppText>
      </Pressable>
      <AppText variant="label" style={styles.detailHeaderTitle} numberOfLines={1}>
        {title}
      </AppText>
      <View style={styles.detailHeaderRight}>{right}</View>
    </View>
  );
}

export function IconButton({
  label,
  icon,
  active = false,
  ...props
}: PressableProps & { label: string; icon: string; active?: boolean }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={(state) => [
        styles.iconButton,
        active && styles.iconButtonActive,
        state.pressed && styles.pressed,
        typeof props.style === 'function' ? props.style(state) : props.style,
      ]}
      hitSlop={8}
    >
      <AppText style={[styles.iconButtonText, active && styles.iconButtonTextActive]}>
        {icon}
      </AppText>
    </Pressable>
  );
}

export function Pill({
  children,
  active = false,
  onPress,
}: {
  children: React.ReactNode;
  active?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.pill, active && styles.pillActive]}>
      <AppText
        variant="caption"
        style={[styles.pillText, active && styles.pillTextActive]}
      >
        {children}
      </AppText>
    </View>
  );
  if (!onPress) return content;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

export function SectionHeader({
  title,
  count,
  actionLabel,
  actionHref,
}: {
  title: string;
  count?: number;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      <AppText variant="serif" style={styles.sectionTitle}>
        {title}
        {typeof count === 'number' && (
          <AppText variant="caption" style={styles.sectionCount}>
            {' '}
            {count}
          </AppText>
        )}
      </AppText>
      {actionLabel && actionHref && (
        <Link href={actionHref as never} asChild>
          <Pressable>
            <AppText variant="label" style={styles.sectionAction}>
              {actionLabel} ›
            </AppText>
          </Pressable>
        </Link>
      )}
    </View>
  );
}

export function ChoiceCard({
  title,
  description,
  mark,
  selected = false,
  onPress,
}: {
  title: string;
  description?: string;
  mark?: string;
  selected?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      {mark && (
        <View style={[styles.choiceMark, selected && styles.choiceMarkSelected]}>
          <AppText style={[styles.choiceMarkText, selected && styles.choiceMarkTextSelected]}>
            {mark}
          </AppText>
        </View>
      )}
      <View style={styles.choiceCopy}>
        <AppText variant="serif" style={styles.choiceTitle}>
          {title}
        </AppText>
        {description && (
          <AppText variant="caption" style={styles.choiceDescription}>
            {description}
          </AppText>
        )}
      </View>
      <AppText style={styles.chevron}>›</AppText>
    </Pressable>
  );
}

export function PrimaryButton({
  children,
  disabled,
  ...props
}: PressableProps & { children: React.ReactNode }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryButton,
        disabled && styles.primaryDisabled,
        pressed && !disabled && styles.primaryPressed,
      ]}
    >
      <AppText variant="label" style={styles.primaryButtonText}>
        {children}
      </AppText>
    </Pressable>
  );
}

export function EmptyState({
  mark = '余',
  title,
  description,
}: {
  mark?: string;
  title: string;
  description: string;
}) {
  return (
    <View style={styles.empty}>
      <View style={styles.emptyMark}>
        <AppText style={styles.emptyMarkText}>{mark}</AppText>
      </View>
      <AppText variant="serif" style={styles.emptyTitle}>
        {title}
      </AppText>
      <AppText style={styles.emptyDescription}>{description}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: colors.paper },
  screenContent: {
    width: '100%',
    maxWidth: 1040,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: 120,
  },
  text: {
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 24,
  },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 18 },
  label: { fontSize: 12, lineHeight: 18, fontWeight: '700', letterSpacing: 1 },
  title: {
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 40,
    fontWeight: '700',
  },
  display: {
    fontFamily: fonts.serif,
    fontSize: 38,
    lineHeight: 56,
    fontWeight: '700',
  },
  serif: { fontFamily: fonts.serif, fontWeight: '600' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  brandCompact: { gap: 0 },
  brandSeal: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
  },
  brandSealCompact: { width: 38, height: 38, borderRadius: 12 },
  brandSealText: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 25,
    lineHeight: 34,
    fontWeight: '700',
  },
  brandSealTextCompact: { fontSize: 19, lineHeight: 26 },
  brandName: {
    fontFamily: fonts.serif,
    fontWeight: '700',
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 2,
  },
  brandCaption: { fontSize: 8, letterSpacing: 2.5, lineHeight: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.xl,
    gap: spacing.md,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.gold, marginBottom: spacing.xs },
  headerDescription: { color: colors.muted, marginTop: spacing.sm },
  detailHeader: {
    minHeight: 48,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  detailBack: {
    position: 'absolute',
    left: 0,
    minWidth: 82,
    height: 46,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  detailBackIcon: { color: colors.gold, fontSize: 31, lineHeight: 34, marginTop: -2 },
  detailBackText: { color: colors.inkSoft, fontSize: 11, lineHeight: 16, letterSpacing: 0.4 },
  detailHeaderTitle: { alignSelf: 'stretch', textAlign: 'center', color: colors.muted, paddingHorizontal: 94 },
  detailHeaderRight: { position: 'absolute', right: 0, minWidth: 44, alignItems: 'flex-end' },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: colors.line,
  },
  iconButtonActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  iconButtonText: { fontSize: 20, lineHeight: 24, color: colors.inkSoft },
  iconButtonTextActive: { color: colors.goldLight },
  pressed: { opacity: 0.65 },
  pill: {
    minHeight: 28,
    justifyContent: 'center',
    paddingHorizontal: 11,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
  },
  pillActive: { backgroundColor: colors.ink, borderColor: colors.ink },
  pillText: { color: colors.inkSoft },
  pillTextActive: { color: colors.paper },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: 20, lineHeight: 28 },
  sectionCount: { color: colors.gold },
  sectionAction: { color: colors.gold },
  choice: {
    minHeight: 84,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: 12,
  },
  choiceSelected: { borderColor: colors.gold, backgroundColor: '#F3E9D3' },
  choiceMark: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paperDeep,
  },
  choiceMarkSelected: { backgroundColor: colors.ink },
  choiceMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  choiceMarkTextSelected: { color: colors.goldLight },
  choiceCopy: { flex: 1 },
  choiceTitle: { fontSize: 17, lineHeight: 24 },
  choiceDescription: { marginTop: 4 },
  chevron: { color: colors.gold, fontSize: 26, lineHeight: 30 },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryDisabled: { backgroundColor: colors.muted, opacity: 0.45 },
  primaryPressed: { backgroundColor: colors.inkSoft, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: colors.paper, fontSize: 14 },
  empty: { alignItems: 'center', paddingVertical: 64, paddingHorizontal: spacing.xl },
  emptyMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyMarkText: {
    fontFamily: fonts.serif,
    color: colors.gold,
    fontSize: 22,
    lineHeight: 28,
  },
  emptyTitle: { fontSize: 20, lineHeight: 30, marginBottom: spacing.sm },
  emptyDescription: { textAlign: 'center', color: colors.muted },
});
