import { Redirect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView as ScrollViewType } from 'react-native';
import { AppText, EmptyState, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { theories } from '@/data/catalog';
import {
  fetchOwnerDrafts,
  fetchOwnerTechniques,
  seedOwnerTechniquesIfEmpty,
  fetchTechniqueRevisions,
  normalizeSnapshot,
  restoreTechniqueRevision,
  saveAndPublishTechnique,
  saveTechniqueDraft,
  snapshotFromTechnique,
  type TechniqueContent,
  type TechniqueRevision,
  type TechniqueSnapshot,
} from '@/data/owner-content';

const REEL_CARD_HEIGHT = 104;

export default function OwnerContentScreen() {
  const router = useRouter();
  const { loading, user, role } = useAuth();
  const { width } = useHydratedWindowDimensions();
  const [techniques, setTechniques] = useState<TechniqueContent[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TechniqueSnapshot>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [loadingContent, setLoadingContent] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [publishConfirming, setPublishConfirming] = useState(false);
  const [preview, setPreview] = useState(false);
  const [revisions, setRevisions] = useState<TechniqueRevision[]>([]);
  const reelRef = useRef<ScrollViewType>(null);

  const reload = useCallback(async (preferredId?: string | null) => {
    setLoadingContent(true);
    setError(null);
    try {
      await seedOwnerTechniquesIfEmpty();
      const [nextTechniques, nextDraftRows] = await Promise.all([fetchOwnerTechniques(), fetchOwnerDrafts()]);
      setTechniques(nextTechniques);
      setDrafts(Object.fromEntries(nextDraftRows.map((draft) => [draft.technique_id, draft.snapshot])));
      setSelectedId((current) => preferredId ?? current ?? nextTechniques[0]?.id ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'コンテンツを読み込めませんでした。');
    } finally {
      setLoadingContent(false);
    }
  }, []);

  useEffect(() => {
    if (role === 'owner') void reload();
  }, [reload, role]);

  const filtered = useMemo(() => {
    const keywords = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    if (!keywords.length) return techniques;
    return techniques.filter((technique) => keywords.every((keyword) => [technique.id, technique.title, technique.persona_id, technique.essence, technique.category].join(' ').toLocaleLowerCase().includes(keyword)));
  }, [query, techniques]);

  const selected = techniques.find((technique) => technique.id === selectedId) ?? null;
  const selectedReelIndex = filtered.findIndex((technique) => technique.id === selectedId);
  const selectedSnapshot = selected ? drafts[selected.id] ?? snapshotFromTechnique(selected) : null;

  const selectTechnique = (id: string) => {
    setSelectedId(id);
    setPreview(false);
    setPublishConfirming(false);
    void fetchTechniqueRevisions(id).then(setRevisions).catch(() => setRevisions([]));
  };

  useEffect(() => {
    if (filtered.length && selectedReelIndex < 0) selectTechnique(filtered[0].id);
  }, [filtered, selectedReelIndex]);

  useEffect(() => {
    if (selectedReelIndex < 0) return;
    reelRef.current?.scrollTo({ y: selectedReelIndex * REEL_CARD_HEIGHT, animated: true });
  }, [selectedReelIndex]);

  const selectTechniqueAtReelPosition = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (!filtered.length) return;
    const nextIndex = Math.max(0, Math.min(filtered.length - 1, Math.round(event.nativeEvent.contentOffset.y / REEL_CARD_HEIGHT)));
    const nextTechnique = filtered[nextIndex];
    if (nextTechnique && nextTechnique.id !== selectedId) selectTechnique(nextTechnique.id);
  };

  useEffect(() => {
    if (selectedId) void fetchTechniqueRevisions(selectedId).then(setRevisions).catch(() => setRevisions([]));
  }, [selectedId]);

  const updateSnapshot = (patch: Partial<TechniqueSnapshot>) => {
    if (!selected) return;
    setNotice(null);
    setDrafts((current) => ({ ...current, [selected.id]: normalizeSnapshot({ ...(current[selected.id] ?? snapshotFromTechnique(selected)), ...patch }) }));
  };

  const save = async () => {
    if (!selected || !selectedSnapshot) return;
    if (!selectedSnapshot.title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveTechniqueDraft(selected.id, selectedSnapshot, selected.updated_at);
      setDrafts((current) => ({ ...current, [selected.id]: selectedSnapshot }));
      setNotice('下書きを保存しました。公開するまでユーザーには表示されません。');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '下書きを保存できませんでした。');
    } finally {
      setSaving(false);
    }
  };

  const beginPublish = () => {
    if (!selected || !selectedSnapshot) return;
    if (!selectedSnapshot.title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }
    setError(null);
    setNotice(null);
    setPublishConfirming(true);
  };

  const publishConfirmed = async () => {
    if (!selected || !selectedSnapshot) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      await saveAndPublishTechnique(selected.id, selectedSnapshot, selected.updated_at);
      await reload(selected.id);
      setPreview(false);
      setPublishConfirming(false);
      setNotice('公開しました。ホームのコンテンツに反映されています。');
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : '公開できませんでした。';
      setError(message.includes('conflict') || message.includes('40001') ? '別の更新が先に公開されています。最新状態を読み込みました。' : message);
      await reload(selected.id);
    } finally {
      setSaving(false);
    }
  };

  const restore = (revision: TechniqueRevision) => {
    Alert.alert('このバージョンを下書きに戻しますか？', '公開中の内容は変わりません。戻した後に確認して公開してください。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '下書きに戻す', onPress: () => void restoreConfirmed(revision) },
    ]);
  };

  const restoreConfirmed = async (revision: TechniqueRevision) => {
    try {
      await restoreTechniqueRevision(revision.revision_id);
      await reload(revision.technique_id);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '履歴を復元できませんでした。');
    }
  };

  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="owner権限が必要です" description="この画面はコンテンツ管理者専用です。" /></Screen>;

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <View style={styles.topBar}>
        <View style={styles.headingCopy}>
          <AppText variant="label" style={styles.eyebrow}>OWNER CONTENT</AppText>
          <AppText variant="serif" style={styles.title}>コンテンツ管理</AppText>
          <AppText style={styles.description}>処世術を検索して、下書き・プレビュー・公開を行います。</AppText>
        </View>
        <Pressable onPress={() => router.back()} style={styles.backButton}><AppText style={styles.backButtonText}>設定へ戻る</AppText></Pressable>
      </View>

      {error ? <View style={styles.error}><AppText style={styles.errorText}>{error}</AppText></View> : null}
      {notice ? <View style={styles.notice}><AppText style={styles.noticeText}>{notice}</AppText></View> : null}
      {loadingContent ? <AppText style={styles.loading}>コンテンツを読み込んでいます…</AppText> : null}
      {!loadingContent && !techniques.length ? <EmptyState title="管理対象がありません" description="Supabaseのmigrationと移行スクリプトを実行してください。" /> : null}

      {techniques.length ? (
        <View style={[styles.workspace, width < 900 && styles.workspaceCompact]}>
          <View style={[styles.listPane, width < 900 && styles.listPaneCompact]}>
            <View style={styles.reelHeading}>
              <AppText variant="label" style={styles.paneLabel}>処世術一覧 {techniques.length}</AppText>
              {selectedReelIndex >= 0 ? <AppText style={styles.reelPosition}>{selectedReelIndex + 1} / {filtered.length}</AppText> : null}
            </View>
            <TextInput value={query} onChangeText={setQuery} placeholder="タイトル・人物像・IDで検索" placeholderTextColor={colors.muted} style={styles.searchInput} accessibilityLabel="処世術を検索" />
            <AppText style={styles.reelHint}>上下にスクロールして選択</AppText>
            <ScrollView
              ref={reelRef}
              style={styles.reelViewport}
              contentContainerStyle={styles.reelContent}
              snapToInterval={REEL_CARD_HEIGHT}
              snapToAlignment="start"
              decelerationRate="fast"
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              onMomentumScrollEnd={selectTechniqueAtReelPosition}
              onScrollEndDrag={selectTechniqueAtReelPosition}
              scrollEventThrottle={16}
              accessibilityLabel="処世術の縦リール"
            >
            <View style={styles.resultList}>
              {filtered.map((technique) => (
                <Pressable key={technique.id} onPress={() => selectTechnique(technique.id)} style={[styles.resultRow, technique.id === selectedId && styles.resultRowSelected]}>
                  <View style={styles.resultCopy}>
                    <AppText style={styles.resultId}>{technique.id}</AppText>
                    <AppText numberOfLines={2} style={styles.resultTitle}>{technique.title}</AppText>
                    <AppText numberOfLines={1} style={styles.resultPersona}>{technique.persona_id}</AppText>
                  </View>
                  {drafts[technique.id] ? <AppText style={styles.draftBadge}>下書き</AppText> : null}
                </Pressable>
              ))}
            </View>
            </ScrollView>
          </View>

          {selected && selectedSnapshot ? (
            <View style={[styles.editorPane, width < 900 && styles.editorPaneCompact]}>
              <View style={styles.editorHeader}>
                <View style={styles.editorHeaderCopy}>
                  <AppText variant="label" style={styles.eyebrow}>{selected.id} · {selected.status === 'published' ? '公開中' : '下書き'}</AppText>
                  <AppText variant="serif" style={styles.editorTitle}>処世術を編集</AppText>
                </View>
                <Pressable onPress={() => setPreview((value) => !value)} style={styles.previewButton}><AppText style={styles.previewButtonText}>{preview ? '編集に戻る' : 'プレビュー'}</AppText></Pressable>
              </View>
              {preview ? <TechniquePreview snapshot={selectedSnapshot} id={selected.id} /> : (
                <>
                  <EditorField label="タイトル" value={selectedSnapshot.title} onChangeText={(value) => updateSnapshot({ title: value })} />
                  <EditorField label="本質" value={selectedSnapshot.essence} onChangeText={(value) => updateSnapshot({ essence: value })} multiline />
                  <EditorField label="解説" value={selectedSnapshot.explanation} onChangeText={(value) => updateSnapshot({ explanation: value })} multiline tall />
                  <EditorField label="メモ" value={selectedSnapshot.memo} onChangeText={(value) => updateSnapshot({ memo: value })} multiline />
                  <Selector label="重要度" values={[1, 2, 3]} value={selectedSnapshot.importance} onChange={(value) => updateSnapshot({ importance: value as 1 | 2 | 3 })} />
                  <Selector label="カテゴリ" values={['interpersonal', 'work', 'life']} value={selectedSnapshot.category} onChange={(value) => updateSnapshot({ category: value as TechniqueSnapshot['category'] })} />
                  <EditorField label="人物像" value={selectedSnapshot.persona_id} onChangeText={(value) => updateSnapshot({ persona_id: value })} />
                  <ListEditor label="今日からできる実践" items={selectedSnapshot.practices} onChange={(items) => updateSnapshot({ practices: items })} />
                  <ListEditor label="具体例" items={selectedSnapshot.examples} onChange={(items) => updateSnapshot({ examples: items })} />
                  <ListEditor label="注意点" items={selectedSnapshot.cautions} onChange={(items) => updateSnapshot({ cautions: items })} />
                  <TheorySelector selectedIds={selectedSnapshot.theory_ids} onChange={(theory_ids) => updateSnapshot({ theory_ids })} />
                  {publishConfirming ? <View style={styles.publishConfirmation}>
                    <View style={styles.publishConfirmationCopy}>
                      <AppText variant="label" style={styles.publishConfirmationLabel}>公開の確認</AppText>
                      <AppText style={styles.publishConfirmationText}>この編集内容を、すべてのユーザーに公開します。</AppText>
                    </View>
                    <View style={styles.publishConfirmationActions}>
                      <SecondaryButton onPress={() => setPublishConfirming(false)} disabled={saving}>キャンセル</SecondaryButton>
                      <PrimaryButton onPress={() => void publishConfirmed()} disabled={saving}>{saving ? '公開中…' : '公開を確定'}</PrimaryButton>
                    </View>
                  </View> : null}
                  <View style={styles.actions}>
                    <SecondaryButton onPress={() => void save()} disabled={saving}>{saving ? '保存中…' : '下書き保存'}</SecondaryButton>
                    <PrimaryButton onPress={beginPublish} disabled={saving || publishConfirming}>公開する</PrimaryButton>
                  </View>
                </>
              )}
              <RevisionHistory revisions={revisions} onRestore={restore} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function EditorField({ label, value, onChangeText, multiline = false, tall = false }: { label: string; value: string; onChangeText: (value: string) => void; multiline?: boolean; tall?: boolean }) {
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>{label}</AppText><TextInput value={value} onChangeText={onChangeText} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multilineInput, tall && styles.tallInput]} /></View>;
}

function Selector<T extends string | number>({ label, values, value, onChange }: { label: string; values: readonly T[]; value: T; onChange: (value: T) => void }) {
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>{label}</AppText><View style={styles.selector}>{values.map((item) => <Pressable key={String(item)} onPress={() => onChange(item)} style={[styles.selectorItem, item === value && styles.selectorItemActive]}><AppText style={[styles.selectorText, item === value && styles.selectorTextActive]}>{String(item)}</AppText></Pressable>)}</View></View>;
}

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const update = (index: number, value: string) => onChange(items.map((item, itemIndex) => itemIndex === index ? value : item));
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>{label}</AppText>{items.map((item, index) => <View key={`${index}-${item.slice(0, 8)}`} style={styles.listInputRow}><TextInput value={item} onChangeText={(value) => update(index, value)} multiline style={[styles.input, styles.listInput]} /><Pressable onPress={() => onChange(items.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeButton}><AppText style={styles.removeText}>削除</AppText></Pressable></View>)}<Pressable onPress={() => onChange([...items, ''])} style={styles.addButton}><AppText style={styles.addText}>＋ 追加</AppText></Pressable></View>;
}

function TheorySelector({ selectedIds, onChange }: { selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const available = theories.filter((theory) => !selectedIds.includes(theory.tagId)).slice(0, 8);
  return <View style={styles.field}><AppText variant="label" style={styles.fieldLabel}>関連する理論カード</AppText><View style={styles.theoryChips}>{selectedIds.map((id) => { const theory = theories.find((item) => item.tagId === id); return <Pressable key={id} onPress={() => onChange(selectedIds.filter((item) => item !== id))} style={styles.theoryChip}><AppText numberOfLines={1} style={styles.theoryChipText}>{theory?.title ?? id} ×</AppText></Pressable>; })}</View>{available.length ? <View style={styles.theoryOptions}>{available.map((theory) => <Pressable key={theory.tagId} onPress={() => onChange([...selectedIds, theory.tagId])} style={styles.theoryOption}><AppText numberOfLines={1} style={styles.theoryOptionText}>{theory.title}</AppText><AppText style={styles.addText}>追加</AppText></Pressable>)}</View> : null}</View>;
}

function TechniquePreview({ snapshot, id }: { snapshot: TechniqueSnapshot; id: string }) {
  return <View style={styles.previewCard}><AppText style={styles.previewId}>{id}</AppText><AppText variant="serif" style={styles.previewTitle}>{snapshot.title || 'タイトル未入力'}</AppText><View style={styles.previewRule} /><AppText variant="label" style={styles.previewLabel}>本質</AppText><AppText variant="serif" style={styles.previewEssence}>{snapshot.essence || '本質未入力'}</AppText>{snapshot.explanation ? <><AppText variant="label" style={styles.previewLabel}>解説</AppText><AppText style={styles.previewBody}>{snapshot.explanation}</AppText></> : null}<PreviewList title="今日からできる実践" items={snapshot.practices} /><PreviewList title="具体例" items={snapshot.examples} /><PreviewList title="注意点" items={snapshot.cautions} /></View>;
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <View style={styles.previewList}><AppText variant="label" style={styles.previewLabel}>{title}</AppText>{items.map((item, index) => <AppText key={`${index}-${item}`} style={styles.previewItem}>・{item}</AppText>)}</View>;
}

function RevisionHistory({ revisions, onRestore }: { revisions: TechniqueRevision[]; onRestore: (revision: TechniqueRevision) => void }) {
  return <View style={styles.history}><AppText variant="label" style={styles.paneLabel}>更新履歴 {revisions.length}</AppText>{revisions.length ? revisions.map((revision) => <View key={revision.revision_id} style={styles.historyRow}><View style={styles.historyCopy}><AppText style={styles.historyDate}>{new Date(revision.created_at).toLocaleString('ja-JP')}</AppText><AppText style={styles.historyDetail}>バージョン {revision.version} · {revision.snapshot.title}</AppText></View><Pressable onPress={() => onRestore(revision)} style={styles.restoreButton}><AppText style={styles.restoreText}>この版に戻す</AppText></Pressable></View>) : <AppText style={styles.noHistory}>公開後の履歴がここに表示されます。</AppText>}</View>;
}

const styles = StyleSheet.create({
  screenContent: { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingBottom: spacing.xl * 2 },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.lg },
  headingCopy: { flex: 1 },
  eyebrow: { color: colors.gold, letterSpacing: 1.8, fontSize: 10 },
  title: { marginTop: 3, color: colors.ink, fontSize: 30, lineHeight: 40, fontWeight: '700' },
  description: { marginTop: 4, color: colors.muted, fontSize: 13, lineHeight: 21 },
  backButton: { padding: 10 },
  backButtonText: { color: colors.gold, fontWeight: '700', fontSize: 13 },
  loading: { color: colors.muted, paddingVertical: spacing.xl },
  error: { padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.sm, backgroundColor: '#FDE9E4' },
  errorText: { color: '#A63F32', fontSize: 13, lineHeight: 19 },
  notice: { padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.sm, backgroundColor: '#EAF2DF' },
  noticeText: { color: '#456531', fontSize: 13, lineHeight: 19 },
  workspace: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  workspaceCompact: { flexDirection: 'column' },
  listPane: { width: 360, maxWidth: '38%', height: 690, padding: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card },
  listPaneCompact: { width: '100%', maxWidth: '100%', height: 390 },
  editorPane: { flex: 1, minWidth: 0, padding: spacing.lg, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface, ...shadow.card },
  editorPaneCompact: { width: '100%' },
  paneLabel: { color: colors.gold, letterSpacing: 1.1, fontSize: 11 },
  searchInput: { minHeight: 44, marginTop: spacing.sm, marginBottom: spacing.sm, paddingHorizontal: 12, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, backgroundColor: colors.paper },
  reelHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  reelPosition: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  reelHint: { marginTop: 4, color: colors.muted, fontSize: 11 },
  reelViewport: { flex: 1, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: '#F8F4EC' },
  reelContent: {},
  resultList: {},
  resultRow: { height: REEL_CARD_HEIGHT, padding: 10, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  resultRowSelected: { borderRadius: radius.sm, backgroundColor: '#F3E9D3' },
  resultCopy: { flex: 1, minWidth: 0 },
  resultId: { color: colors.gold, fontSize: 10, fontWeight: '700' },
  resultIdSelected: { color: colors.goldLight },
  resultTitle: { marginTop: 2, color: colors.ink, fontSize: 14, lineHeight: 19, fontWeight: '700' },
  resultTitleSelected: { color: colors.paper },
  resultPersona: { marginTop: 2, color: colors.muted, fontSize: 11 },
  resultPersonaSelected: { color: '#D9CCB6' },
  draftBadge: { paddingHorizontal: 6, paddingVertical: 3, color: colors.gold, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, fontSize: 10, fontWeight: '700' },
  editorHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.md, alignItems: 'flex-start', marginBottom: spacing.lg },
  editorHeaderCopy: { flex: 1 },
  editorTitle: { marginTop: 3, color: colors.ink, fontSize: 24, lineHeight: 32, fontWeight: '700' },
  previewButton: { paddingHorizontal: 13, paddingVertical: 10, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  previewButtonText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  field: { marginBottom: spacing.lg },
  fieldLabel: { marginBottom: 6, color: colors.inkSoft, fontSize: 11, letterSpacing: 0.8 },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, color: colors.ink, fontFamily: fonts.sans, fontSize: 15, backgroundColor: colors.paper },
  multilineInput: { minHeight: 100 },
  tallInput: { minHeight: 230 },
  selector: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  selectorItem: { minHeight: 40, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill },
  selectorItemActive: { borderColor: colors.gold, backgroundColor: colors.charcoal },
  selectorText: { color: colors.inkSoft, fontSize: 12, fontWeight: '700' },
  selectorTextActive: { color: colors.goldLight },
  listInputRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  listInput: { flex: 1, minHeight: 52 },
  removeButton: { padding: 12 },
  removeText: { color: '#A63F32', fontSize: 12, fontWeight: '700' },
  addButton: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  addText: { color: colors.gold, fontSize: 12, fontWeight: '700' },
  theoryChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  theoryChip: { maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.charcoal },
  theoryChipText: { color: colors.goldLight, fontSize: 12, fontWeight: '700' },
  theoryOptions: { gap: 6 },
  theoryOption: { minHeight: 38, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm },
  theoryOptionText: { flex: 1, color: colors.inkSoft, fontSize: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  publishConfirmation: { gap: spacing.md, padding: spacing.md, marginTop: spacing.sm, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, backgroundColor: '#FBF4E3' },
  publishConfirmationCopy: { gap: 4 },
  publishConfirmationLabel: { color: colors.gold, fontSize: 11, letterSpacing: 1 },
  publishConfirmationText: { color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '700' },
  publishConfirmationActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  previewCard: { padding: spacing.lg, marginBottom: spacing.lg, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.md, backgroundColor: '#FBF8F2' },
  previewId: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  previewTitle: { marginTop: 5, color: colors.ink, fontSize: 28, lineHeight: 38, fontWeight: '700' },
  previewRule: { height: 1, marginVertical: spacing.md, backgroundColor: colors.gold },
  previewLabel: { marginTop: spacing.md, marginBottom: 5, color: colors.gold, letterSpacing: 1, fontSize: 11 },
  previewEssence: { color: colors.ink, fontSize: 19, lineHeight: 29, fontWeight: '700' },
  previewBody: { color: colors.inkSoft, fontSize: 14, lineHeight: 23 },
  previewList: { marginTop: 5 },
  previewItem: { color: colors.inkSoft, fontSize: 14, lineHeight: 23 },
  history: { marginTop: spacing.xl, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  historyRow: { minHeight: 58, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  historyCopy: { flex: 1 },
  historyDate: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  historyDetail: { marginTop: 2, color: colors.muted, fontSize: 11 },
  restoreButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  restoreText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  noHistory: { marginTop: 8, color: colors.muted, fontSize: 12 },
});
