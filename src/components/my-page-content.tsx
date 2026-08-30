import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { BookScreen, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { useAppState, type PersonalMemo } from '@/state/app-state';
import { useAuth } from '@/auth/auth-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

type SavedPreview = {
  kind: '処世術' | '理論';
  id: string;
  title: string;
  meta: string;
};

export default function MyPageContent() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 760;
  const { user } = useAuth();
  const {
    savedIds,
    savedTheoryIds,
    historyIds,
    personalPrinciple,
    updatePersonalPrinciple,
    personalMemos,
  } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(personalPrinciple);
  const profileDestination = user ? '/settings/profile' : '/auth?mode=signin';
  const libraryCount = savedIds.length + savedTheoryIds.length;
  const recentSaved = useMemo(() => buildRecentSaved(savedIds, savedTheoryIds), [savedIds, savedTheoryIds]);
  const recentHistory = useMemo(
    () => historyIds.slice(0, 4).map((id) => techniqueById.get(id)).filter(Boolean),
    [historyIds],
  );

  const openEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft(personalPrinciple);
    setEditing(true);
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.profileRow}>
        <Pressable
          testID="account-membership-card"
          accessibilityRole="button"
          accessibilityLabel={user ? 'プロフィールを設定' : 'ログインしてプロフィールを設定'}
          onPress={() => router.push(profileDestination as never)}
          style={({ pressed }) => [styles.profileButton, pressed && styles.pressed]}
        >
          <ProfileMark />
          <AppText style={styles.profileButtonText}>プロフィールを設定　›</AppText>
        </Pressable>
      </View>

      <View testID="personal-principle-card" style={[styles.principleCard, compact && styles.principleCardCompact]}>
        <View style={styles.principleCopy}>
          <AppText style={styles.principleLabel}>いまの判断原則</AppText>
          <AppText style={[styles.principle, compact && styles.principleCompact]}>{personalPrinciple}</AppText>
        </View>
        <Pressable
          testID="personal-principle-edit"
          accessibilityRole="button"
          accessibilityLabel="判断原則を編集"
          onPress={openEditor}
          style={({ pressed }) => [styles.editPrinciple, pressed && styles.pressed]}
        >
          <AppText style={styles.editIcon}>✎</AppText>
          <AppText style={styles.editText}>編集</AppText>
        </Pressable>
      </View>

      <View style={[styles.destinationGrid, compact && styles.stack]}>
        <DestinationCard mark="冊" title="蔵書" count={libraryCount} detail="保存した処世術・理論" onPress={() => router.push('/library')} />
        <DestinationCard mark="記" title="マイ処世術" count={personalMemos.length} detail="自分の言葉でつくった処世術" onPress={() => router.push('/my-techniques')} />
        <DestinationCard mark="履" title="履歴" count={historyIds.length} detail="これまでに見た処世術・理論" onPress={() => router.push('/history')} />
      </View>

      <View style={[styles.recentGrid, compact && styles.stack]}>
        <PreviewColumn title="最近保存したもの" actionLabel="すべての蔵書を見る" onAction={() => router.push('/library')}>
          {recentSaved.length ? recentSaved.map((item) => (
            <PreviewRow
              key={`${item.kind}-${item.id}`}
              label={item.kind}
              title={item.title}
              meta={item.meta}
              onPress={() => item.kind === '処世術'
                ? router.push({ pathname: '/card/[id]', params: { id: item.id } })
                : router.push({ pathname: '/theory/[id]', params: { id: item.id } })}
            />
          )) : <QuietEmpty>まだ保存したものはありません</QuietEmpty>}
        </PreviewColumn>

        <PreviewColumn title="マイ処世術" actionLabel="すべてのマイ処世術を見る" onAction={() => router.push('/my-techniques')}>
          {personalMemos.length ? personalMemos.slice(0, 3).map((memo) => (
            <MemoPreview key={memo.id} memo={memo} onPress={() => router.push('/my-techniques')} />
          )) : <QuietEmpty>まだマイ処世術はありません</QuietEmpty>}
        </PreviewColumn>

        <PreviewColumn title="最近の履歴" actionLabel="すべての履歴を見る" onAction={() => router.push('/history')}>
          {recentHistory.length ? recentHistory.map((card) => card ? (
            <PreviewRow
              key={card.id}
              label="処世術"
              title={card.title}
              meta={`${card.categoryName}・${card.subcategory}`}
              onPress={() => router.push({ pathname: '/card/[id]', params: { id: card.id } })}
            />
          ) : null) : <QuietEmpty>まだ履歴はありません</QuietEmpty>}
        </PreviewColumn>
      </View>

      <Modal transparent visible={editing} animationType="fade" onRequestClose={() => setEditing(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>判断原則を整える</AppText>
            <AppText style={styles.modalLead}>迷ったときに戻れる一文を書き留めます。</AppText>
            <TextInput autoFocus multiline maxLength={100} value={draft} onChangeText={setDraft} accessibilityLabel="判断原則" style={styles.input} />
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setEditing(false)} style={styles.cancel}><AppText style={styles.cancelText}>閉じる</AppText></Pressable>
              <Pressable accessibilityRole="button" onPress={() => { updatePersonalPrinciple(draft); setEditing(false); }} style={styles.save}><AppText style={styles.saveText}>保存する</AppText></Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
}

function buildRecentSaved(savedIds: string[], savedTheoryIds: string[]) {
  const rows: SavedPreview[] = [];
  const maxLength = Math.max(savedIds.length, savedTheoryIds.length);
  for (let index = 0; index < maxLength && rows.length < 3; index += 1) {
    const card = techniqueById.get(savedIds[index]);
    if (card) rows.push({ kind: '処世術', id: card.id, title: card.title, meta: `${card.categoryName}・${card.subcategory}` });
    if (rows.length >= 3) break;
    const theory = theoryById.get(savedTheoryIds[index]);
    if (theory) rows.push({ kind: '理論', id: theory.tagId, title: theory.title, meta: theory.categoryTitle });
  }
  return rows;
}

function ProfileMark() {
  return <View accessibilityElementsHidden style={styles.profileMark}><View style={styles.profileHead} /><View style={styles.profileShoulders} /></View>;
}

function DestinationCard({ mark, title, count, detail, onPress }: { mark: string; title: string; count: number; detail: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}を開く`} onPress={onPress} style={({ pressed }) => [styles.destinationCard, pressed && styles.pressed]}>
      <View style={styles.destinationMark}><AppText style={styles.destinationMarkText}>{mark}</AppText></View>
      <AppText style={styles.destinationTitle}>{title}</AppText>
      <AppText style={styles.destinationCount}>{count}</AppText>
      <AppText style={styles.destinationDetail}>{detail}</AppText>
      <AppText style={styles.destinationArrow}>›</AppText>
    </Pressable>
  );
}

function PreviewColumn({ title, actionLabel, onAction, children }: { title: string; actionLabel: string; onAction: () => void; children: ReactNode }) {
  return (
    <View style={styles.previewColumn}>
      <View style={styles.previewHeader}>
        <AppText style={styles.previewTitle}>{title}</AppText>
        <Pressable accessibilityRole="button" accessibilityLabel={actionLabel} onPress={onAction} style={({ pressed }) => pressed && styles.pressed}>
          <AppText style={styles.previewLink}>すべて見る　›</AppText>
        </Pressable>
      </View>
      <View style={styles.previewBody}>{children}</View>
    </View>
  );
}

function PreviewRow({ label, title, meta, onPress }: { label: string; title: string; meta: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}を開く`} onPress={onPress} style={({ pressed }) => [styles.previewRow, pressed && styles.previewRowPressed]}>
      <View style={styles.previewCopy}>
        <View style={styles.previewMetaLine}><AppText style={styles.kindLabel}>{label}</AppText><AppText numberOfLines={1} style={styles.previewMeta}>{meta}</AppText></View>
        <AppText numberOfLines={2} style={styles.previewRowTitle}>{title}</AppText>
      </View>
      <AppText style={styles.previewArrow}>›</AppText>
    </Pressable>
  );
}

function MemoPreview({ memo, onPress }: { memo: PersonalMemo; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${memo.text}を開く`} onPress={onPress} style={({ pressed }) => [styles.previewRow, pressed && styles.previewRowPressed]}>
      <View style={styles.previewCopy}>
        <AppText numberOfLines={2} style={styles.memoTitle}>{memo.text}</AppText>
        <AppText style={styles.memoDate}>{formatMemoDate(memo.createdAt)}</AppText>
      </View>
      <AppText style={styles.previewArrow}>›</AppText>
    </Pressable>
  );
}

function QuietEmpty({ children }: { children: ReactNode }) {
  return <View style={styles.quietEmpty}><AppText style={styles.quietEmptyText}>{children}</AppText></View>;
}

function formatMemoDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime()) || date.getTime() === 0) return '作成日未記録';
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl * 2 },
  profileRow: { minHeight: 44, flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  profileButton: { minHeight: 40, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.68)' },
  profileButtonText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 12, lineHeight: 18, fontWeight: '600' },
  profileMark: { width: 18, height: 19, alignItems: 'center', justifyContent: 'center' },
  profileHead: { width: 6, height: 6, borderWidth: 1, borderColor: colors.inkSoft, borderRadius: 3, marginBottom: 2 },
  profileShoulders: { width: 13, height: 7, borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: colors.inkSoft, borderTopLeftRadius: 7, borderTopRightRadius: 7 },
  principleCard: { minHeight: 154, marginTop: spacing.md, paddingHorizontal: spacing.xxl, paddingVertical: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.74)', flexDirection: 'row', alignItems: 'center', gap: spacing.xl, ...bookCardShadow },
  principleCardCompact: { minHeight: 180, padding: spacing.lg, alignItems: 'flex-start', flexDirection: 'column', gap: spacing.md },
  principleCopy: { flex: 1, minWidth: 0 },
  principleLabel: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, fontWeight: '600', letterSpacing: 1.4 },
  principle: { marginTop: spacing.lg, color: colors.ink, fontFamily: fonts.serif, fontSize: 28, lineHeight: 43, fontWeight: '600', letterSpacing: 1.5 },
  principleCompact: { marginTop: spacing.md, fontSize: 22, lineHeight: 35, letterSpacing: 1 },
  editPrinciple: { minHeight: 42, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.pill, backgroundColor: '#FCFAF6' },
  editIcon: { color: colors.gold, fontSize: 16, lineHeight: 19 },
  editText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600' },
  destinationGrid: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  stack: { flexDirection: 'column' },
  destinationCard: { position: 'relative', flex: 1, minHeight: 188, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.58)', alignItems: 'center', justifyContent: 'center' },
  destinationMark: { width: 41, height: 41, borderRadius: 21, borderWidth: 1, borderColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  destinationMarkText: { color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23 },
  destinationTitle: { marginTop: 9, color: colors.ink, fontFamily: fonts.serif, fontSize: 17, lineHeight: 24, fontWeight: '600', letterSpacing: 1 },
  destinationCount: { marginTop: 2, color: colors.gold, fontFamily: fonts.serif, fontSize: 33, lineHeight: 40 },
  destinationDetail: { color: colors.muted, fontFamily: fonts.serif, fontSize: 11, lineHeight: 18, textAlign: 'center' },
  destinationArrow: { position: 'absolute', right: 16, top: '45%', color: colors.gold, fontSize: 26, lineHeight: 28 },
  recentGrid: { flexDirection: 'row', alignItems: 'stretch', gap: spacing.md, marginTop: spacing.lg },
  previewColumn: { flex: 1, minWidth: 0, minHeight: 314, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.52)', overflow: 'hidden' },
  previewHeader: { minHeight: 50, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  previewTitle: { flex: 1, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  previewLink: { color: colors.gold, fontSize: 10, lineHeight: 16, fontWeight: '700' },
  previewBody: { flex: 1 },
  previewRow: { minHeight: 82, paddingHorizontal: spacing.md, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  previewRowPressed: { backgroundColor: colors.paperDeep },
  previewCopy: { flex: 1, minWidth: 0 },
  previewMetaLine: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  kindLabel: { paddingHorizontal: 5, paddingVertical: 1, borderWidth: 1, borderColor: '#D7C6AB', borderRadius: radius.pill, color: colors.gold, fontSize: 8, lineHeight: 12, fontWeight: '700' },
  previewMeta: { flex: 1, color: colors.muted, fontSize: 9, lineHeight: 14 },
  previewRowTitle: { marginTop: 4, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  previewArrow: { color: colors.gold, fontSize: 24, lineHeight: 26 },
  memoTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, fontWeight: '600' },
  memoDate: { marginTop: 5, color: colors.muted, fontSize: 9, lineHeight: 14 },
  quietEmpty: { minHeight: 210, padding: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  quietEmptyText: { color: colors.muted, fontFamily: fonts.serif, fontSize: 12, lineHeight: 20, textAlign: 'center' },
  modalBackdrop: { flex: 1, padding: spacing.lg, backgroundColor: 'rgba(17,18,17,0.58)', alignItems: 'center', justifyContent: 'center' },
  modalCard: { width: '100%', maxWidth: 520, padding: spacing.xl, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.lg, backgroundColor: colors.surface },
  modalTitle: { fontFamily: fonts.serif, fontSize: 23, lineHeight: 32, fontWeight: '600' },
  modalLead: { marginTop: spacing.sm, color: colors.muted },
  input: { minHeight: 130, marginTop: spacing.lg, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.white, color: colors.ink, fontFamily: fonts.serif, fontSize: 18, lineHeight: 30, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: { minHeight: 50, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: { flex: 1, minHeight: 50, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  saveText: { color: '#FFFFFF', fontWeight: '700' },
  pressed: { opacity: 0.7 },
});
