import { Redirect } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, TextInput, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollView as ScrollViewType } from 'react-native';
import { AppText, EmptyState, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { useAccess } from '@/access/access-state';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { getTheoryDisplayId, techniqueById, theories, upsertManagedTechnique } from '@/data/catalog';
import { isLockedTheoryShell } from '@/data/theory-display';
import type { TheoryCard } from '@/data/types';
import {
  fetchOwnerDrafts,
  fetchOwnerTechniques,
  seedOwnerTechniquesIfEmpty,
  fetchTechniqueRevisions,
  fetchTechniqueChangeLogs,
  normalizeSnapshot,
  restoreTechniqueRevision,
  saveAndPublishTechnique,
  saveTechniqueDraft,
  snapshotFromTechnique,
  toTechniquePayload,
  type TechniqueContent,
  type TechniqueRevision,
  type TechniqueChangeLog,
  type TechniqueSnapshot,
} from '@/data/owner-content';

const REEL_CARD_HEIGHT = 104;

export default function OwnerContentScreen() {
  const { loading, user, role } = useAuth();
  const { refreshPublishedContent, catalogRevision } = useAccess();
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
  const [restoreConfirming, setRestoreConfirming] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [revisions, setRevisions] = useState<TechniqueRevision[]>([]);
  const [changeLogs, setChangeLogs] = useState<TechniqueChangeLog[]>([]);
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
    const matched = !keywords.length
      ? techniques
      : techniques.filter((technique) => keywords.every((keyword) => [technique.id, technique.title, technique.persona_id, technique.essence, technique.category].join(' ').toLocaleLowerCase().includes(keyword)));
    return [...matched].sort((left, right) => techniqueNumber(left.id) - techniqueNumber(right.id) || left.id.localeCompare(right.id, 'en'));
  }, [query, techniques]);

  const selected = techniques.find((technique) => technique.id === selectedId) ?? null;
  const selectedReelIndex = filtered.findIndex((technique) => technique.id === selectedId);
  const selectedSnapshot = selected ? drafts[selected.id] ?? snapshotFromTechnique(selected) : null;
  const theoryOptions = useMemo(() => theories.filter((theory) => !isLockedTheoryShell(theory)), [catalogRevision]);

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
    if (selectedId) {
      void fetchTechniqueRevisions(selectedId).then(setRevisions).catch(() => setRevisions([]));
      void fetchTechniqueChangeLogs(selectedId).then(setChangeLogs).catch(() => setChangeLogs([]));
    }
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
      const published = await saveAndPublishTechnique(selected.id, selectedSnapshot, selected.updated_at);
      upsertManagedTechnique(toTechniquePayload(published));
      await refreshPublishedContent();
      // A just-published row must win over a stale read returned by a
      // concurrently cached/public catalogue request.
      upsertManagedTechnique(toTechniquePayload(published));
      const latestRevisions = await fetchTechniqueRevisions(selected.id);
      setRevisions(latestRevisions);
      setChangeLogs(await fetchTechniqueChangeLogs(selected.id));
      const reflected = techniqueById.get(selected.id);
      if (!reflected || !isSnapshotReflected(reflected, selectedSnapshot)) {
        throw new Error('公開は完了しましたが、表示データの更新を確認できませんでした。もう一度読み込んでください。');
      }
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
    setRestoreConfirming(revision.revision_id);
  };

  const restoreConfirmed = async (revision: TechniqueRevision) => {
    try {
      await restoreTechniqueRevision(revision.revision_id);
      await reload(revision.technique_id);
      const latestRevisions = await fetchTechniqueRevisions(revision.technique_id);
      setRevisions(latestRevisions);
      setChangeLogs(await fetchTechniqueChangeLogs(revision.technique_id));
      setRestoreConfirming(null);
      setNotice(`バージョン ${revision.version} を下書きに戻しました。内容を確認して公開してください。`);
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '履歴を復元できませんでした。');
      setRestoreConfirming(null);
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
              <View style={[styles.actions, styles.actionsTop]}>
                <SecondaryButton onPress={() => void save()} disabled={saving}>{saving ? '保存中…' : '下書き保存'}</SecondaryButton>
                <PrimaryButton onPress={beginPublish} disabled={saving || publishConfirming}>公開する</PrimaryButton>
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
                  <TheorySelector theoryOptions={theoryOptions} selectedIds={selectedSnapshot.theory_ids} onChange={(theory_ids) => updateSnapshot({ theory_ids })} />
                </>
              )}
              <RevisionHistory revisions={revisions} theoryOptions={theoryOptions} restoringRevisionId={restoreConfirming} onRestore={restore} onCancelRestore={() => setRestoreConfirming(null)} onConfirmRestore={(revision) => void restoreConfirmed(revision)} />
              <ChangeLogHistory logs={changeLogs} theoryOptions={theoryOptions} />
            </View>
          ) : null}
        </View>
      ) : null}
    </Screen>
  );
}

function techniqueNumber(id: string) {
  const matched = id.match(/(\d+)(?!.*\d)/);
  return matched ? Number(matched[1]) : Number.MAX_SAFE_INTEGER;
}

function isSnapshotReflected(card: { title: string; essence?: string; explanation?: string; importance?: number; categoryKey: string; subcategory: string; relatedTheoryIds?: string[]; theoryTagIds?: string[]; practicalActions?: { todayActions?: string[]; examples?: string[]; cautions?: string[] } }, snapshot: TechniqueSnapshot) {
  const sameList = (left: string[] | undefined, right: string[]) => JSON.stringify(left ?? []) === JSON.stringify(right);
  return card.title === snapshot.title
    && (card.essence ?? '') === snapshot.essence
    && (card.explanation ?? '') === snapshot.explanation
    && card.importance === snapshot.importance
    && card.categoryKey === snapshot.category
    && card.subcategory === snapshot.persona_id
    && sameList(card.relatedTheoryIds ?? card.theoryTagIds, snapshot.theory_ids)
    && sameList(card.practicalActions?.todayActions, snapshot.practices)
    && sameList(card.practicalActions?.examples, snapshot.examples)
    && sameList(card.practicalActions?.cautions, snapshot.cautions);
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

function TheorySelector({ theoryOptions, selectedIds, onChange }: { theoryOptions: TheoryCard[]; selectedIds: string[]; onChange: (ids: string[]) => void }) {
  const [adding, setAdding] = useState(false);
  const [query, setQuery] = useState('');
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);
  const results = useMemo(
    () => searchTheories(query, theoryOptions).filter((theory) => !selectedSet.has(theory.tagId)),
    [query, selectedSet, theoryOptions],
  );
  const move = (index: number, offset: -1 | 1) => {
    const targetIndex = index + offset;
    if (targetIndex < 0 || targetIndex >= selectedIds.length) return;
    const next = [...selectedIds];
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    onChange(next);
  };

  return (
    <View style={styles.field}>
      <View style={styles.theoryHeader}>
        <AppText variant="label" style={styles.fieldLabel}>関連する理論　{selectedIds.length}件</AppText>
        <Pressable onPress={() => setAdding((open) => !open)} style={styles.addButton} accessibilityRole="button" accessibilityLabel="理論を追加">
          <AppText style={styles.addText}>{adding ? '閉じる' : '＋ 理論を追加'}</AppText>
        </Pressable>
      </View>

      {selectedIds.length ? <View style={styles.selectedTheoryList}>
        {selectedIds.map((id, index) => {
          const theory = theoryOptions.find((item) => item.tagId === id);
          return (
            <View key={`${id}-${index}`} style={styles.selectedTheoryRow}>
              <View style={styles.selectedTheoryCopy}>
                <AppText style={styles.selectedTheoryId}>{theory ? getTheoryDisplayId(theory) : '—'}</AppText>
                <AppText numberOfLines={2} style={styles.selectedTheoryTitle}>{theory?.title ?? `未登録の理論 (${id})`}</AppText>
              </View>
              <View style={styles.selectedTheoryActions}>
                <Pressable disabled={index === 0} onPress={() => move(index, -1)} style={[styles.orderButton, index === 0 && styles.orderButtonDisabled]} accessibilityRole="button" accessibilityLabel={`${theory?.title ?? id}を上へ移動`}><AppText style={styles.orderButtonText}>↑</AppText></Pressable>
                <Pressable disabled={index === selectedIds.length - 1} onPress={() => move(index, 1)} style={[styles.orderButton, index === selectedIds.length - 1 && styles.orderButtonDisabled]} accessibilityRole="button" accessibilityLabel={`${theory?.title ?? id}を下へ移動`}><AppText style={styles.orderButtonText}>↓</AppText></Pressable>
                <Pressable onPress={() => onChange(selectedIds.filter((_, itemIndex) => itemIndex !== index))} style={styles.removeButton} accessibilityRole="button" accessibilityLabel={`${theory?.title ?? id}を削除`}><AppText style={styles.removeText}>削除</AppText></Pressable>
              </View>
            </View>
          );
        })}
      </View> : <AppText style={styles.noRelatedTheories}>関連する理論はありません。</AppText>}

      {adding ? <View style={styles.theorySearchPanel}>
        <TextInput value={query} onChangeText={setQuery} placeholder="ID・tagId・タイトル・概要で検索" placeholderTextColor={colors.muted} style={styles.searchInput} accessibilityLabel="追加する理論を検索" />
        {theoryOptions.length ? <>
          <View style={styles.theoryCandidateHeader}>
            <AppText style={styles.theorySearchHint}>{query.trim() ? `検索結果 ${results.length}件` : `追加候補 ${results.length}件`}</AppText>
            {!query.trim() ? <AppText style={styles.theorySearchHint}>横に流して選べます</AppText> : null}
          </View>
          {results.length ? <FlatList
            horizontal
            data={results}
            keyExtractor={(theory) => theory.tagId}
            testID="owner-related-theory-reel"
            accessibilityLabel="追加する関連理論の横スクロール一覧"
            showsHorizontalScrollIndicator={false}
            initialNumToRender={8}
            windowSize={5}
            contentContainerStyle={styles.theoryCandidateRail}
            renderItem={({ item: theory }) => <View style={styles.theoryCandidateCard}>
              <AppText style={styles.theorySearchId}>{getTheoryDisplayId(theory)}</AppText>
              <AppText numberOfLines={2} style={styles.theorySearchTitle}>{theory.title}</AppText>
              <AppText numberOfLines={3} style={styles.theorySearchSummary}>{theory.summary}</AppText>
              <Pressable onPress={() => onChange([...selectedIds, theory.tagId])} style={styles.theoryAddButton} accessibilityRole="button" accessibilityLabel={`${theory.title}を追加`}><AppText style={styles.addText}>追加</AppText></Pressable>
            </View>}
          /> : <AppText style={styles.noRelatedTheories}>一致する未選択の理論はありません。</AppText>}
        </> : <AppText style={styles.noRelatedTheories}>理論候補を同期中です。</AppText>}
      </View> : null}
    </View>
  );
}

function searchTheories(query: string, source: TheoryCard[]) {
  const normalizedQuery = normalizeTheorySearchText(query);
  if (!normalizedQuery) return source;
  return source.map((theory) => {
    const displayId = getTheoryDisplayId(theory);
    const normalizedDisplayId = normalizeTheorySearchText(displayId);
    const title = normalizeTheorySearchText(theory.title);
    const tagId = normalizeTheorySearchText(theory.tagId);
    const summary = normalizeTheorySearchText(theory.summary);
    const rank = normalizedDisplayId === normalizedQuery || tagId === normalizedQuery ? 0
      : title === normalizedQuery ? 1
        : title.startsWith(normalizedQuery) ? 2
          : title.includes(normalizedQuery) ? 3
            : summary.includes(normalizedQuery) ? 4
              : tagId.includes(normalizedQuery) ? 5
                : Number.POSITIVE_INFINITY;
    return { theory, rank };
  }).filter(({ rank }) => Number.isFinite(rank)).sort((left, right) => left.rank - right.rank || left.theory.title.localeCompare(right.theory.title, 'ja')).map(({ theory }) => theory);
}

function normalizeTheorySearchText(value: string) {
  return value.trim().toLocaleLowerCase().replace(/[‐‑‒–—―ー－]/g, '-').replace(/\s+/g, '');
}

function TechniquePreview({ snapshot, id }: { snapshot: TechniqueSnapshot; id: string }) {
  return <View style={styles.previewCard}><AppText style={styles.previewId}>{id}</AppText><AppText variant="serif" style={styles.previewTitle}>{snapshot.title || 'タイトル未入力'}</AppText><View style={styles.previewRule} /><AppText variant="label" style={styles.previewLabel}>本質</AppText><AppText variant="serif" style={styles.previewEssence}>{snapshot.essence || '本質未入力'}</AppText>{snapshot.explanation ? <><AppText variant="label" style={styles.previewLabel}>解説</AppText><AppText style={styles.previewBody}>{snapshot.explanation}</AppText></> : null}<PreviewList title="今日からできる実践" items={snapshot.practices} /><PreviewList title="具体例" items={snapshot.examples} /><PreviewList title="注意点" items={snapshot.cautions} /></View>;
}

function PreviewList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return <View style={styles.previewList}><AppText variant="label" style={styles.previewLabel}>{title}</AppText>{items.map((item, index) => <AppText key={`${index}-${item}`} style={styles.previewItem}>・{item}</AppText>)}</View>;
}

function RevisionHistory({ revisions, theoryOptions, restoringRevisionId, onRestore, onCancelRestore, onConfirmRestore }: { revisions: TechniqueRevision[]; theoryOptions: TheoryCard[]; restoringRevisionId: string | null; onRestore: (revision: TechniqueRevision) => void; onCancelRestore: () => void; onConfirmRestore: (revision: TechniqueRevision) => void }) {
  return <View style={styles.history}><AppText variant="label" style={styles.paneLabel}>更新履歴 {revisions.length}</AppText>{revisions.length ? revisions.map((revision, index) => {
    const relatedTheories = revision.snapshot.theory_ids.map((id) => {
      const theory = theoryOptions.find((candidate) => candidate.tagId === id);
      return theory ? `${getTheoryDisplayId(theory)} ${theory.title}` : id;
    });
    return <View key={revision.revision_id} style={styles.historyRow}><View style={styles.historyCopy}><View style={styles.historyMeta}><AppText style={styles.historyDate}>{new Date(revision.created_at).toLocaleString('ja-JP')}</AppText>{index === 0 ? <AppText style={styles.latestBadge}>最新</AppText> : null}</View><AppText style={styles.historyDetail}>バージョン {revision.version} · {revision.snapshot.title}</AppText><AppText style={styles.historyTheoryLabel}>関連する理論（{relatedTheories.length}件）</AppText>{relatedTheories.length ? <View style={styles.historyTheoryList}>{relatedTheories.map((theory, theoryIndex) => <AppText key={`${revision.revision_id}-${theoryIndex}`} style={styles.historyTheories}>・{theory}</AppText>)}</View> : <AppText style={styles.historyTheories}>なし</AppText>}</View>{restoringRevisionId === revision.revision_id ? <View style={styles.restoreActions}><Pressable onPress={onCancelRestore} style={styles.cancelRestoreButton}><AppText style={styles.cancelRestoreText}>キャンセル</AppText></Pressable><Pressable onPress={() => onConfirmRestore(revision)} style={styles.restoreButton}><AppText style={styles.restoreText}>下書きに戻す</AppText></Pressable></View> : <Pressable onPress={() => onRestore(revision)} style={styles.restoreButton}><AppText style={styles.restoreText}>この版に戻す</AppText></Pressable>}</View>;
  }) : <AppText style={styles.noHistory}>公開後の履歴がここに表示されます。</AppText>}</View>;
}

function ChangeLogHistory({ logs, theoryOptions }: { logs: TechniqueChangeLog[]; theoryOptions: TheoryCard[] }) {
  return <View style={styles.changeLog}><AppText variant="label" style={styles.paneLabel}>変更ログ {logs.length}</AppText>{logs.length ? logs.map((log) => {
    const theoryIds = log.snapshot.theory_ids ?? [];
    const theoryNames = theoryIds.map((id) => theoryOptions.find((theory) => theory.tagId === id)?.title ?? id);
    return <View key={log.log_id} style={styles.changeLogRow}><View style={styles.changeLogCopy}><View style={styles.historyMeta}><AppText style={styles.historyDate}>{new Date(log.created_at).toLocaleString('ja-JP')}</AppText><AppText style={styles.changeType}>{log.event_type === 'published' ? '公開' : '下書き保存'}</AppText></View><AppText style={styles.historyDetail}>{log.snapshot.title || 'タイトル未入力'} · 関連する理論 {theoryIds.length}件</AppText>{theoryNames.length ? <View style={styles.historyTheoryList}>{theoryNames.map((theory, theoryIndex) => <AppText key={`${log.log_id}-${theoryIndex}`} style={styles.changeLogDetail}>・{theory}</AppText>)}</View> : <AppText style={styles.changeLogDetail}>理論: なし</AppText>}<AppText style={styles.changeLogScope}>本質・解説・実践・具体例・注意点を含む完全スナップショット</AppText></View></View>;
  }) : <AppText style={styles.noHistory}>保存・公開した変更がここに記録されます。</AppText>}</View>;
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
  theoryHeader: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  selectedTheoryList: { borderTopWidth: 1, borderTopColor: colors.line },
  selectedTheoryRow: { minHeight: 62, paddingVertical: 9, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  selectedTheoryCopy: { flex: 1, minWidth: 0 },
  selectedTheoryId: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5 },
  selectedTheoryTitle: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  selectedTheoryActions: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  orderButton: { minWidth: 30, minHeight: 34, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm },
  orderButtonDisabled: { opacity: 0.3 },
  orderButtonText: { color: colors.gold, fontSize: 17, lineHeight: 21, fontWeight: '700' },
  noRelatedTheories: { paddingVertical: 10, color: colors.muted, fontSize: 12, lineHeight: 18 },
  theorySearchPanel: { marginTop: spacing.sm, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: '#F8F4EC' },
  theorySearchHint: { paddingTop: 8, color: colors.muted, fontSize: 12, lineHeight: 18 },
  theoryCandidateHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  theoryCandidateRail: { gap: 10, paddingBottom: 3, paddingTop: spacing.sm, paddingRight: spacing.md },
  theoryCandidateCard: { width: 232, minHeight: 188, padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper },
  theoryOptions: { marginTop: spacing.sm, gap: 8 },
  theorySearchResult: { padding: spacing.sm, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper },
  theorySearchId: { color: colors.gold, fontSize: 11, lineHeight: 16, fontWeight: '700', letterSpacing: 0.5 },
  theorySearchTitle: { marginTop: 2, color: colors.ink, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  theorySearchSummary: { marginTop: 5, color: colors.inkSoft, fontSize: 12, lineHeight: 18 },
  theoryAddButton: { alignSelf: 'flex-start', marginTop: 9, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: spacing.sm, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  actionsTop: { marginTop: 0, marginBottom: spacing.lg },
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
  historyMeta: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  historyDate: { color: colors.ink, fontSize: 12, fontWeight: '700' },
  latestBadge: { paddingHorizontal: 6, paddingVertical: 2, color: colors.gold, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, fontSize: 10, fontWeight: '700' },
  historyDetail: { marginTop: 2, color: colors.muted, fontSize: 11 },
  historyTheoryLabel: { marginTop: 6, color: colors.gold, fontSize: 10, fontWeight: '700' },
  historyTheories: { marginTop: 2, color: colors.inkSoft, fontSize: 11, lineHeight: 17 },
  historyTheoryList: { marginTop: 1 },
  restoreButton: { paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  restoreText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  restoreActions: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  cancelRestoreButton: { paddingHorizontal: 8, paddingVertical: 8 },
  cancelRestoreText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  noHistory: { marginTop: 8, color: colors.muted, fontSize: 12 },
  changeLog: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  changeLogRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.line },
  changeLogCopy: { minWidth: 0 },
  changeType: { paddingHorizontal: 6, paddingVertical: 2, color: colors.gold, borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, fontSize: 10, fontWeight: '700' },
  changeLogDetail: { marginTop: 4, color: colors.muted, fontSize: 10, lineHeight: 16 },
  changeLogScope: { marginTop: 5, color: colors.muted, fontSize: 10, lineHeight: 16 },
});
