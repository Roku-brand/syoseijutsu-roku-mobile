import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  Share,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, layout, radius, shadow, spacing } from '@/constants/theme';
import { AppText } from './ui';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import {
  categories,
  categoryMeta,
  techniqueById,
  theories,
  theoryById,
} from '@/data/catalog';
import { useAppState } from '@/state/app-state';
import { useAppToast } from './app-toast';
import { useAuth } from '@/auth/auth-state';

export function BookScreen({
  children,
  contentContainerStyle,
  scroll = true,
  ...props
}: ScrollViewProps & { scroll?: boolean }) {
  const { width } = useHydratedWindowDimensions();
  const { density } = useResponsiveLayout();
  const compact = width < 700;
  const desktop = width >= 1000;
  return (
    <SafeAreaView edges={['left', 'right']} style={styles.safe}>
      {scroll ? (
        <ScrollView
          {...props}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            compact && styles.contentCompact,
            desktop && styles.contentDesktop,
            density === 'compact' && styles.contentHeightCompact,
            density === 'veryCompact' && styles.contentHeightVeryCompact,
            contentContainerStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View
          style={[
            styles.fixed,
            styles.content,
            compact && styles.contentCompact,
            desktop && styles.contentDesktop,
            density === 'compact' && styles.contentHeightCompact,
            density === 'veryCompact' && styles.contentHeightVeryCompact,
            contentContainerStyle,
          ]}
        >
          {children}
        </View>
      )}
    </SafeAreaView>
  );
}

export function BookHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const [principlesVisible, setPrinciplesVisible] = useState(false);
  const currentTitle = getCurrentTitle(pathname);
  const showBack = shouldShowHeaderBack(pathname);
  const lightHeader = true;
  const minimalHeaderActions = false;
  const detail = getDetail(pathname);
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace('/');
  };

  return (
    <>
      <View style={[styles.header, compact && styles.headerCompact, lightHeader && styles.headerLight]}>
        {showBack ? (
          <View style={styles.brandGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="前の画面へ戻る"
              onPress={handleBack}
              hitSlop={8}
              style={({ pressed }) => [
                styles.headerBack,
                compact && styles.headerBackCompact,
                lightHeader && styles.headerBackLight,
                pressed && styles.headerActionPressed,
              ]}
            >
              <AppText style={[styles.headerBackIcon, lightHeader && styles.headerBackIconLight]}>‹</AppText>
              <AppText style={[styles.headerBackText, lightHeader && styles.headerBackTextLight]}>戻る</AppText>
            </Pressable>
          </View>
        ) : (
          <View style={styles.brandGroup}>
            <View style={[styles.seal, compact && styles.sealCompact]}>
              <AppText style={styles.sealText}>禄</AppText>
            </View>
            <View style={[styles.brandCopy, compact && styles.brandCopyHidden]}>
              <AppText style={styles.brandName}>処世術禄</AppText>
              <AppText style={styles.brandSubtitle}>判断と実践のカード集</AppText>
            </View>
          </View>
        )}
        <AppText style={[styles.screenTitle, lightHeader && styles.screenTitleLight, pathname === '/upgrade' && styles.upgradeScreenTitle]}>
          {currentTitle}
        </AppText>

        {detail ? (
          <DetailHeaderActions detail={detail} compact={compact} />
        ) : (
          <View style={styles.headerActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="処世術の五大原則を開く"
              onPress={() => setPrinciplesVisible(true)}
              style={({ pressed }) => [
                styles.headerAction,
                lightHeader && styles.headerActionLight,
                pressed && styles.headerActionPressed,
              ]}
            >
              <PrincipleMark />
              {!compact ? <AppText style={[styles.headerActionLabel, lightHeader && styles.headerActionLabelLight]}>原則</AppText> : null}
            </Pressable>
            {!minimalHeaderActions ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="設定を開く"
                onPress={() => router.push('/settings')}
                style={({ pressed }) => [
                  styles.headerAction,
                  lightHeader && styles.headerActionLight,
                  pressed && styles.headerActionPressed,
                ]}
              >
                <MenuMark active={Boolean(user)} light={lightHeader} />
                {!compact ? <AppText style={[styles.headerActionLabel, lightHeader && styles.headerActionLabelLight]}>設定</AppText> : null}
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <PrinciplesModal
        visible={principlesVisible}
        compact={compact}
        onClose={() => setPrinciplesVisible(false)}
      />
    </>
  );
}

/** 処世術・理論で共通の、蔵書保存用のひし形マーク。 */
export function SaveDiamondButton({
  saved,
  onPress,
  label,
  compact = false,
}: {
  saved: boolean;
  onPress: () => void;
  label?: string;
  compact?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={saved ? '蔵書から外す' : '蔵書に保存'}
      accessibilityState={{ selected: saved }}
      onPress={onPress}
      hitSlop={compact ? 6 : 8}
      style={({ pressed }) => [
        styles.saveDiamondButton,
        compact && styles.saveDiamondButtonCompact,
        pressed && styles.saveDiamondButtonPressed,
      ]}
    >
      <View style={[styles.saveDiamond, saved && styles.saveDiamondFilled]} />
      {label ? (
        <AppText style={[styles.saveDiamondLabel, saved && styles.saveDiamondLabelSaved]}>
          {label}
        </AppText>
      ) : null}
    </Pressable>
  );
}

function MenuMark({ active, light }: { active: boolean; light: boolean }) {
  const tone = light ? colors.gold : colors.goldLight;
  return (
    <View style={[styles.menuMark, active && styles.menuMarkActive]} accessibilityElementsHidden>
      <View style={[styles.menuLine, { backgroundColor: tone }]} />
      <View style={[styles.menuLine, { backgroundColor: tone }]} />
      <View style={[styles.menuLine, { backgroundColor: tone }]} />
    </View>
  );
}

type DetailTarget =
  | { kind: 'card'; id: string; title: string }
  | { kind: 'theory'; id: string; title: string };

function getDetail(pathname: string): DetailTarget | null {
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  const [kind, id] = segments;
  if (!id) return null;
  if (kind === 'card') {
    const card = techniqueById.get(id);
    return card ? { kind, id, title: card.title } : null;
  }
  if (kind === 'theory') {
    const theory = theoryById.get(id);
    return theory ? { kind, id, title: theory.title } : null;
  }
  return null;
}

function DetailHeaderActions({
  detail,
  compact,
}: {
  detail: DetailTarget;
  compact: boolean;
}) {
  const showToast = useAppToast();
  const { savedIds, savedTheoryIds, toggleSaved, toggleSavedTheory } = useAppState();
  const isSaved = detail.kind === 'card'
    ? savedIds.includes(detail.id)
    : savedTheoryIds.includes(detail.id);
  const toggle = () => {
    if (detail.kind === 'card') toggleSaved(detail.id);
    else toggleSavedTheory(detail.id);
    showToast(isSaved ? '蔵書から外しました' : '蔵書に保存しました');
  };

  return (
    <View style={styles.detailActions}>
      <SaveDiamondButton
        saved={isSaved}
        onPress={toggle}
        label={compact ? undefined : isSaved ? '保存済み' : '保存'}
        compact={compact}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="共有"
        onPress={() => void Share.share({ title: '処世術禄', message: `${detail.title}\n\n処世術禄` })}
        style={({ pressed }) => [styles.detailAction, pressed && styles.headerActionPressed]}
      >
        <SymbolView
          name={{ ios: 'square.and.arrow.up', android: 'ios_share', web: 'ios_share' }}
          fallback={<AppText style={styles.detailActionFallback}>⇧</AppText>}
          size={20}
          tintColor={colors.gold}
          weight="regular"
        />
        {!compact ? <AppText style={styles.detailActionLabel}>共有</AppText> : null}
      </Pressable>
    </View>
  );
}

function getCurrentTitle(pathname: string) {
  const segments = pathname.split('/').filter(Boolean).map(decodeURIComponent);
  if (segments[0] === 'category') {
    if (segments[1] === 'all') return 'すべての処世術';
    const category = categories.find((item) => item.key === segments[1]);
    return category ? categoryMeta[category.key].label : '探す';
  }
  if (segments[0] === 'theme') return segments[2] ?? 'テーマから探す';
  if (segments[0] === 'theories') {
    if (segments[1] === 'all') return 'すべての理論';
    return theories.find((theory) => theory.categoryId === segments[1])?.categoryTitle ?? '理論辞典';
  }
  if (segments[0] === 'subcategory') return segments[2] ?? '人物像から探す';
  if (segments[0] === 'goal') return '目的から探す';
  if (segments[0] === 'theory') return '理論カード';
  if (
    pathname.includes('/discover') ||
    pathname.includes('/topic/') ||
    pathname.includes('/catalog')
  ) return '探す';
  if (pathname.includes('/my-techniques')) return 'マイ処世術';
  if (pathname.includes('/library')) return '蔵書';
  if (pathname.includes('/history')) return '履歴';
  if (pathname.includes('/my-os')) return 'マイページ';
  if (pathname.includes('/learn')) return '学ぶ';
  if (pathname.includes('/auth')) return 'アカウント';
  if (pathname.includes('/collection/')) return 'コレクション';
  if (pathname.includes('/legal/')) return '規約・ポリシー';
  if (pathname.includes('/upgrade')) return '完全版を購入';
  if (pathname.includes('/settings')) return '設定';
  if (pathname.includes('/card/')) return '処世術カード';
  return 'ホーム';
}

function shouldShowHeaderBack(pathname: string) {
  return !['/', '/discover', '/learn', '/catalog', '/my-os', '/onboarding'].includes(pathname);
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
                <AppText style={styles.modalEyebrow}>処世術禄</AppText>
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
  const { width } = useHydratedWindowDimensions();
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
  safe: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  scroll: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  fixed: { flex: 1, minHeight: 0, backgroundColor: colors.paper },
  content: {
    width: '100%',
    maxWidth: layout.readingWidth,
    alignSelf: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.section,
  },
  contentCompact: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  contentHeightCompact: { paddingTop: spacing.md, paddingBottom: spacing.lg },
  contentHeightVeryCompact: { paddingTop: spacing.sm, paddingBottom: spacing.md },
  contentDesktop: { paddingBottom: spacing.section },
  header: {
    minHeight: 58,
    paddingHorizontal: spacing.lg,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerCompact: {
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  headerLight: { backgroundColor: colors.surface, borderBottomColor: colors.line },
  brandGroup: {
    minWidth: 0,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerBack: {
    minWidth: 74,
    minHeight: 36,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.sm,
  },
  headerBackCompact: {
    minWidth: 80,
    minHeight: 36,
    paddingHorizontal: 10,
  },
  headerBackLight: { borderWidth: 1, justifyContent: 'center', paddingHorizontal: 10 },
  headerBackIcon: {
    color: colors.gold,
    fontSize: 27,
    lineHeight: 28,
    marginTop: -2,
  },
  headerBackText: {
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  headerBackIconLight: { color: colors.gold },
  headerBackTextLight: { color: colors.ink },
  seal: {
    width: 34,
    height: 34,
    borderRadius: 7,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealCompact: { width: 34, height: 34, borderRadius: 7 },
  sealText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontWeight: '700',
    fontSize: 22,
    lineHeight: 29,
  },
  brandCopy: { minWidth: 0, gap: 1 },
  brandCopyHidden: { display: 'none' },
  screenTitle: {
    position: 'absolute',
    left: 88,
    right: 88,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 17,
    lineHeight: 24,
    fontWeight: '700',
    letterSpacing: 1.4,
    textAlign: 'center',
  },
  screenTitleLight: { color: colors.ink },
  upgradeScreenTitle: { left: 96, right: 72, fontSize: 19, lineHeight: 27, letterSpacing: 0.6 },
  brandName: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 29,
    fontWeight: '700',
    letterSpacing: 3,
  },
  brandSubtitle: {
    color: colors.gold,
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
  detailActions: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  detailAction: {
    minWidth: 42,
    minHeight: 44,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 1,
  },
  detailActionLabel: {
    color: colors.gold,
    fontSize: 10,
    lineHeight: 13,
    fontWeight: '600',
  },
  detailActionLabelSaved: { color: colors.gold },
  detailActionFallback: { color: colors.gold, fontSize: 20, lineHeight: 22 },
  detailActionSaved: { color: colors.gold },
  headerAction: {
    width: 48,
    minHeight: 44,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  headerActionLight: { backgroundColor: 'transparent' },
  headerActionPressed: {
    backgroundColor: 'rgba(210,182,111,0.14)',
    opacity: 0.72,
  },
  headerActionLabel: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 1,
  },
  headerActionLabelLight: { color: colors.gold },
  accountMarkFallback: { color: colors.gold, fontSize: 31, lineHeight: 32 },
  menuMark: { width: 28, height: 27, justifyContent: 'space-between', paddingVertical: 2 },
  menuMarkActive: { opacity: 1 },
  menuLine: { width: 28, height: 1.25, borderRadius: 2, alignSelf: 'center' },
  principleMark: {
    width: 27,
    height: 27,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.gold,
    position: 'relative',
  },
  principleDot: {
    position: 'absolute',
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gold,
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
    borderRadius: 3,
    backgroundColor: colors.gold,
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
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionHeadingCentered: { justifyContent: 'center' },
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
  saveDiamondButton: {
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 4,
  },
  saveDiamondButtonCompact: { width: 30, paddingHorizontal: 0 },
  saveDiamondButtonPressed: { opacity: 0.78, transform: [{ scale: 0.94 }] },
  saveDiamond: {
    width: 15,
    height: 15,
    borderWidth: 1.5,
    borderColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  saveDiamondFilled: { backgroundColor: colors.gold },
  saveDiamondLabel: { color: colors.goldLight, fontSize: 11, lineHeight: 16, fontWeight: '700' },
  saveDiamondLabelSaved: { color: colors.goldLight },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
