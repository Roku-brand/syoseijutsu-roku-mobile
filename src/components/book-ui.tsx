import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, layout, radius, shadow, spacing } from '@/constants/theme';
import { AppText } from './ui';

export function BookScreen({
  children,
  contentContainerStyle,
  ...props
}: ScrollViewProps) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const desktop = width >= 1000;
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      <ScrollView
        {...props}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          compact && styles.contentCompact,
          desktop && styles.contentDesktop,
          contentContainerStyle,
        ]}
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function BookHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { width } = useWindowDimensions();
  const compact = width < 700;
  const [principlesVisible, setPrinciplesVisible] = useState(false);
  const currentTitle = getCurrentTitle(pathname);

  return (
    <>
      <View style={[styles.header, compact && styles.headerCompact]}>
        <View style={styles.brandGroup}>
          <View style={[styles.seal, compact && styles.sealCompact]}>
            <AppText style={styles.sealText}>禄</AppText>
          </View>
          <View style={[styles.brandCopy, compact && styles.brandCopyHidden]}>
            <AppText style={styles.brandName}>処世術禄</AppText>
            <AppText style={styles.brandSubtitle}>賢者の手帳</AppText>
          </View>
        </View>
        {compact ? (
          <AppText numberOfLines={1} style={styles.mobileScreenTitle}>
            {currentTitle}
          </AppText>
        ) : null}

        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="処世術の五大原則を開く"
            onPress={() => setPrinciplesVisible(true)}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
          >
            <PrincipleMark />
            {!compact ? <AppText style={styles.headerActionLabel}>原則</AppText> : null}
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="設定を開く"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.headerAction,
              pressed && styles.headerActionPressed,
            ]}
          >
            <AppText style={styles.settingsIcon}>⚙</AppText>
            {!compact ? <AppText style={styles.headerActionLabel}>設定</AppText> : null}
          </Pressable>
        </View>
      </View>

      <PrinciplesModal
        visible={principlesVisible}
        compact={compact}
        onClose={() => setPrinciplesVisible(false)}
      />
    </>
  );
}

function getCurrentTitle(pathname: string) {
  if (pathname.includes('/discover') || pathname.includes('/topic/')) return '探す';
  if (
    pathname.includes('/catalog') ||
    pathname.includes('/category/') ||
    pathname.includes('/subcategory/') ||
    pathname.includes('/theory')
  ) return '体系';
  if (pathname.includes('/my-os') || pathname.includes('/library')) return 'マイOS';
  if (pathname.includes('/settings')) return '設定';
  if (pathname.includes('/card/')) return '処世術';
  return '処世術禄';
}

function PrincipleMark() {
  return (
    <View style={styles.principleMark} accessibilityElementsHidden>
      <View style={[styles.principleDot, styles.principleDotTop]} />
      <View style={[styles.principleDot, styles.principleDotUpperLeft]} />
      <View style={[styles.principleDot, styles.principleDotUpperRight]} />
      <View style={[styles.principleDot, styles.principleDotLowerLeft]} />
      <View style={[styles.principleDot, styles.principleDotLowerRight]} />
      <View style={styles.principleCenter} />
    </View>
  );
}

const principles = [
  {
    number: '01',
    title: '処世術は好かれない',
    label: 'メタ発言抑制',
    description: '処世術は“使うもの”であって、“語るもの”ではない。',
  },
  {
    number: '02',
    title: '処世術は万能ではない',
    label: 'コンテクスト依存性',
    description:
      '同じ戦術でも、人・場・力関係・時間軸が変われば結果は反転する。',
  },
  {
    number: '03',
    title: '処世術は人格の代替ではない',
    label: '行動分離原則',
    description:
      '処世術は人格を作るものではない。人格を守るための道具である。',
  },
  {
    number: '04',
    title: '処世術は知識ではない',
    label: '実践優先',
    description:
      '知っているだけでは意味がない。現場で使えて初めて“術”になる。',
  },
  {
    number: '05',
    title: '処世術は目的ではない',
    label: '手段従属',
    description:
      '処世術は手段であって目的ではない。目的がないと空回りする。',
  },
] as const;

function PrinciplesModal({
  visible,
  compact,
  onClose,
}: {
  visible: boolean;
  compact: boolean;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={[styles.modalRoot, compact && styles.modalRootCompact]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="原則を閉じる"
          onPress={onClose}
          style={StyleSheet.absoluteFill}
        />
        <View
          accessibilityViewIsModal
          style={[styles.principlesCard, compact && styles.principlesCardCompact]}
        >
          <View style={styles.modalHeader}>
            <View style={styles.modalTitleGroup}>
              <PrincipleMark />
              <View>
                <AppText style={styles.modalEyebrow}>賢者の手帳</AppText>
                <AppText style={styles.modalTitle}>処世術の五大原則</AppText>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="原則を閉じる"
              onPress={onClose}
              hitSlop={10}
              style={({ pressed }) => [
                styles.modalClose,
                pressed && styles.headerActionPressed,
              ]}
            >
              <AppText style={styles.modalCloseText}>×</AppText>
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.principlesContent}
          >
            <AppText style={styles.modalLead}>
              術に使われず、術を使うための五つの戒め。
            </AppText>
            {principles.map((principle) => (
              <View key={principle.number} style={styles.principleRow}>
                <View style={styles.principleNumber}>
                  <AppText style={styles.principleNumberText}>
                    {principle.number}
                  </AppText>
                </View>
                <View style={styles.principleCopy}>
                  <View style={styles.principleTitleLine}>
                    <AppText style={styles.principleTitle}>
                      {principle.title}
                    </AppText>
                    <AppText style={styles.principleLabel}>
                      {principle.label}
                    </AppText>
                  </View>
                  <AppText style={styles.principleDescription}>
                    {principle.description}
                  </AppText>
                </View>
              </View>
            ))}

            <View style={styles.principleSummary}>
              <AppText style={styles.principleSummaryText}>
                語るな ／ 信じるな ／ 同一化するな
              </AppText>
              <AppText style={styles.principleSummaryText}>
                運用せよ ／ 目的に従え
              </AppText>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function BookTitle({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  const { width } = useWindowDimensions();
  const compact = width < 700;
  return (
    <View style={styles.titleBlock}>
      <AppText style={[styles.pageTitle, compact && styles.pageTitleCompact]}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText style={[styles.pageSubtitle, compact && styles.pageSubtitleCompact]}>
          {subtitle}
        </AppText>
      ) : null}
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
    maxWidth: layout.readingWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: layout.bottomContentInset,
  },
  contentCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  contentDesktop: { paddingBottom: spacing.section },
  header: {
    minHeight: 72,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: colors.gold,
  },
  headerCompact: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  brandGroup: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  seal: {
    width: 46,
    height: 46,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealCompact: { width: 40, height: 40, borderRadius: 9 },
  sealText: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontWeight: '700',
    fontSize: 27,
    lineHeight: 36,
  },
  brandCopy: { minWidth: 0, gap: 1 },
  brandCopyHidden: { display: 'none' },
  mobileScreenTitle: {
    position: 'absolute',
    left: 70,
    right: 112,
    color: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '600',
    letterSpacing: 1.6,
    textAlign: 'center',
  },
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  headerAction: {
    width: 48,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  headerActionPressed: {
    backgroundColor: 'rgba(210,182,111,0.14)',
    opacity: 0.72,
  },
  headerActionLabel: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
  },
  settingsIcon: {
    color: colors.goldLight,
    fontSize: 23,
    lineHeight: 28,
  },
  principleMark: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.goldLight,
    position: 'relative',
  },
  principleDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.goldLight,
  },
  principleDotTop: { top: 3, left: 11 },
  principleDotUpperLeft: { top: 9, left: 4 },
  principleDotUpperRight: { top: 9, right: 4 },
  principleDotLowerLeft: { bottom: 4, left: 7 },
  principleDotLowerRight: { bottom: 4, right: 7 },
  principleCenter: {
    position: 'absolute',
    left: 11,
    top: 11,
    width: 5,
    height: 5,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  modalRoot: {
    flex: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(16,17,16,0.72)',
  },
  modalRootCompact: {
    paddingHorizontal: 0,
    paddingTop: 72,
    paddingBottom: 0,
    justifyContent: 'flex-end',
  },
  principlesCard: {
    width: '100%',
    maxWidth: 680,
    maxHeight: '92%',
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.paper,
    overflow: 'hidden',
    ...shadow.card,
  },
  principlesCardCompact: {
    maxHeight: '88%',
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  modalHeader: {
    minHeight: 82,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.charcoal,
    borderBottomWidth: 1,
    borderBottomColor: colors.gold,
  },
  modalTitleGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modalEyebrow: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 2,
  },
  modalTitle: {
    color: colors.surface,
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 2,
  },
  modalClose: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(210,182,111,0.45)',
  },
  modalCloseText: {
    color: colors.goldLight,
    fontSize: 29,
    lineHeight: 32,
    fontWeight: '300',
  },
  principlesContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  modalLead: {
    marginBottom: spacing.md,
    color: colors.inkSoft,
    fontFamily: fonts.serif,
    fontSize: 14,
    lineHeight: 24,
    letterSpacing: 0.8,
  },
  principleRow: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
  principleNumber: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
  },
  principleNumberText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 18,
    fontWeight: '700',
    letterSpacing: 1,
  },
  principleCopy: { flex: 1 },
  principleTitleLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: 7,
  },
  principleTitle: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 25,
    fontWeight: '600',
  },
  principleLabel: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  principleDescription: {
    marginTop: 5,
    color: colors.inkSoft,
    fontSize: 13,
    lineHeight: 22,
  },
  principleSummary: {
    marginTop: spacing.sm,
    padding: spacing.md,
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.sage,
  },
  principleSummaryText: {
    color: colors.moss,
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 23,
    fontWeight: '600',
    letterSpacing: 1,
    textAlign: 'center',
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
  pageTitleCompact: {
    fontSize: 30,
    lineHeight: 42,
    letterSpacing: 2.5,
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
  pageSubtitleCompact: { fontSize: 13, lineHeight: 21 },
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
