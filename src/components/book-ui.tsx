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
  ...props
}: ScrollViewProps) {
  const { width } = useHydratedWindowDimensions();
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
  const { user } = useAuth();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const [principlesVisible, setPrinciplesVisible] = useState(false);
  const currentTitle = getCurrentTitle(pathname);
  const showBack = shouldShowHeaderBack(pathname);
  const lightHeader = pathname === '/upgrade' || pathname.startsWith('/subcategory/');
  const minimalHeaderActions = pathname === '/upgrade';
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
              <AppText style={styles.brandSubtitle}>賢者の手帳</AppText>
            </View>
          </View>
        )}
        <AppText numberOfLines={2} style={[styles.screenTitle, lightHeader && styles.screenTitleLight, pathname === '/upgrade' && styles.upgradeScreenTitle]}>
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
                <AccountMark active={Boolean(user)} light={lightHeader} />
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

function AccountMark({ active, light }: { active: boolean; light: boolean }) {
  const tone = light ? colors.gold : colors.goldLight;
  return (
    <View style={[styles.accountMark, { borderColor: tone }, active && styles.accountMarkActive]} accessibilityElementsHidden>
      <View style={[styles.accountHead, { backgroundColor: tone }]} />
      <View style={[styles.accountShoulders, { borderColor: tone }]} />
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isSaved ? '蔵書から外す' : '蔵書に保存'}
        onPress={toggle}
        style={({ pressed }) => [styles.detailAction, pressed && styles.headerActionPressed]}
      >
        <SymbolView
          name={{
            ios: isSaved ? 'star.fill' : 'star',
            android: isSaved ? 'star' : 'star_border',
            web: isSaved ? 'star' : 'star_border',
          }}
          fallback={<AppText style={[styles.detailActionFallback, isSaved && styles.detailActionSaved]}>★</AppText>}
          size={20}
          tintColor={isSaved ? colors.goldLight : colors.surface}
          weight="regular"
        />
        {!compact ? <AppText style={[styles.detailActionLabel, isSaved && styles.detailActionLabelSaved]}>{isSaved ? '保存済み' : '保存'}</AppText> : null}
      </Pressable>
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
          tintColor={colors.surface}
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
  if (segments[0] === 'theory') return '理論カード';
  if (
    pathname.includes('/discover') ||
    pathname.includes('/topic/') ||
    pathname.includes('/catalog')
  ) return '探す';
  if (pathname.includes('/my-os') || pathname.includes('/library')) return 'マイOS';
  if (pathname.includes('/learn')) return '学習';
  if (pathname.includes('/collection/')) return 'コレクション';
  if (pathname.includes('/legal/')) return '規約・ポリシー';
  if (pathname.includes('/upgrade')) return '完全版を購入';
  if (pathname.includes('/settings')) return '設定';
  if (pathname.includes('/card/')) return '処世術カード';
  return '処世術禄';
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
