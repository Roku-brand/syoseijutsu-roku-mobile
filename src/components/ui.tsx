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
  const content = scroll ? (
    <ScrollView
      ref={scrollRef}
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
    <SafeAreaView style={styles.screen} edges={['left', 'right']}>
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

export const AppHeader = Header;

export function SurfaceCard({ children, style, ...props }: ViewProps) {
  return <View {...props} style={[styles.surfaceCard, style]}>{children}</View>;
}

export function Divider({ style }: { style?: ViewProps['style'] }) {
  return <View style={[styles.divider, style]} />;
}

export function GoldIcon({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.goldIcon}>
      <AppText style={styles.goldIconText}>{children}</AppText>
    </View>
  );
}

export function TagChip({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.tagChip}>
      <AppText style={styles.tagChipText}>{children}</AppText>
    </View>
  );
}

export function ListGroup({ children, style }: ViewProps) {
  return <View style={[styles.listGroup, style]}>{children}</View>;
}

export function ListRow({
  title,
  detail,
  icon,
  last = false,
  onPress,
}: {
  title: string;
  detail?: string;
  icon?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
}) {
  const content = (
    <View style={[styles.listRow, last && styles.listRowLast]}>
      {icon}
      <View style={styles.listRowCopy}>
        <AppText style={styles.listRowTitle}>{title}</AppText>
        {detail ? <AppText style={styles.listRowDetail}>{detail}</AppText> : null}
      </View>
      {onPress ? <AppText style={styles.listChevron}>›</AppText> : null}
    </View>
  );
  return onPress ? (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  ) : content;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <View accessibilityRole="tablist" style={styles.segmentedControl}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[styles.segment, selected && styles.segmentActive]}
          >
            <AppText style={[styles.segmentText, selected && styles.segmentTextActive]}>{option.label}</AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A concise chapter heading for category, theme, and theory archive pages. */
export function ChapterTitle({ title }: { title: string }) {
  return (
    <View style={styles.chapterTitleBand}>
      <AppText variant="serif" style={styles.chapterTitleText}>
        {title}
      </AppText>
    </View>
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

export function ChoiceCard({
  title,
  description,
  mark,
  selected = false,
  accentColor = colors.gold,
  tintColor = colors.paperDeep,
  onPress,
}: {
  title: string;
  description?: string;
  mark?: string;
  selected?: boolean;
  accentColor?: string;
  tintColor?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.choice,
        { borderColor: accentColor },
        selected && styles.choiceSelected,
        pressed && styles.pressed,
      ]}
    >
      {mark && (
        <View
          style={[
            styles.choiceMark,
            { backgroundColor: tintColor },
            selected && styles.choiceMarkSelected,
          ]}
        >
          <AppText
            style={[
              styles.choiceMarkText,
              { color: accentColor },
              selected && styles.choiceMarkTextSelected,
            ]}
          >
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
      <AppText style={[styles.chevron, { color: accentColor }]}>›</AppText>
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
    marginBottom: spacing.xxl,
    gap: spacing.md,
  },
  headerCopy: { flex: 1 },
  eyebrow: { color: colors.gold, marginBottom: spacing.xs },
  headerDescription: { color: colors.muted, marginTop: spacing.sm },
  surfaceCard: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  divider: { height: 1, backgroundColor: colors.line },
  goldIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.charcoal,
  },
  goldIconText: { color: colors.goldLight, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '700' },
  tagChip: { minHeight: 28, paddingHorizontal: 11, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  tagChipText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17 },
  listGroup: { overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  listRow: { minHeight: 58, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line },
  listRowLast: { borderBottomWidth: 0 },
  listRowCopy: { flex: 1, minWidth: 0 },
  listRowTitle: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  listRowDetail: { marginTop: 2, color: colors.muted, fontSize: 12, lineHeight: 18 },
  listChevron: { color: colors.gold, fontSize: 25, lineHeight: 28 },
  segmentedControl: { minHeight: 42, padding: 3, flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: colors.surface },
  segment: { flex: 1, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.charcoal },
  segmentText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 20, fontWeight: '600' },
  segmentTextActive: { color: colors.goldLight },
  chapterTitleBand: {
    minHeight: 88,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  chapterTitleText: {
    color: colors.ink,
    fontSize: 28,
    lineHeight: 40,
    fontWeight: '700',
    textAlign: 'center',
  },
  detailHeader: {
    minHeight: 48,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  detailHeaderInlineActions: {
    minHeight: 36,
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  detailBack: {
    position: 'absolute',
    left: 0,
    minWidth: 104,
    height: 48,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#CDBA94',
    backgroundColor: colors.surface,
    shadowColor: '#4A3828',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  detailBackPressed: {
    opacity: 0.72,
    transform: [{ translateX: -2 }, { scale: 0.97 }],
  },
  detailBackIcon: { width: 27, height: 27, borderRadius: 14, overflow: 'hidden', textAlign: 'center', color: colors.gold, backgroundColor: '#F4ECDD', fontSize: 25, lineHeight: 26, marginTop: -1 },
  detailBackText: { color: colors.inkSoft, fontSize: 12, lineHeight: 17, letterSpacing: 0.7 },
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
    marginTop: spacing.xxl,
    marginBottom: spacing.lg,
  },
  sectionTitle: { fontSize: 20, lineHeight: 28 },
  sectionCount: { color: colors.gold },
  sectionAction: { color: colors.gold },
  choice: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
    marginBottom: spacing.md,
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
