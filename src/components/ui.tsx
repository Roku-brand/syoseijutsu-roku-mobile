import { Link } from 'expo-router';
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
  type ScrollView as ScrollViewType,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, layout, radius, spacing } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

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
  scrollRef,
  ...props
}: ViewProps &
  ScrollViewProps & {
    scroll?: boolean;
    scrollRef?: React.RefObject<ScrollViewType | null>;
}) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
      {...props}
      style={[styles.flex, props.style]}
      contentContainerStyle={[styles.screenContent, compact && styles.screenContentCompact, contentContainerStyle]}
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
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
      {content}
    </SafeAreaView>
  );
}

export function DetailHeader({
  title: _title,
  right,
}: {
  title?: string;
  right?: React.ReactNode;
}) {
  if (!right) return null;
  return <View style={styles.detailHeaderInlineActions}>{right}</View>;
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

export function SecondaryButton({ children, ...props }: PressableProps & { children: React.ReactNode }) {
  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}
    >
      <AppText style={styles.secondaryButtonText}>{children}</AppText>
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
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.section,
  },
  screenContentCompact: { paddingBottom: layout.bottomContentInset },
  text: {
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    lineHeight: 28,
  },
  caption: { color: '#686A65', fontSize: 12, lineHeight: 19 },
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
  detailHeaderInlineActions: {
    minHeight: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
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
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 20, lineHeight: 28 },
  sectionCount: { color: colors.gold },
  sectionAction: { color: colors.gold },
  primaryButton: {
    minHeight: 54,
    borderRadius: radius.md,
    backgroundColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  primaryDisabled: { backgroundColor: colors.muted, opacity: 0.45 },
  primaryPressed: { backgroundColor: colors.goldLight, transform: [{ scale: 0.99 }] },
  primaryButtonText: { color: '#FFFFFF', fontSize: 14 },
  secondaryButton: { minHeight: 54, paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  secondaryButtonText: { color: colors.gold, fontSize: 14, fontWeight: '700' },
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
