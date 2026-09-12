import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, EmptyState, PrimaryButton, Screen, SecondaryButton } from '@/components/ui';
import { colors, spacing } from '@/constants/theme';
import { useAuth } from '@/auth/auth-state';
import { archiveTheory, applyTheory, fetchOwnerTheories, publishTheory, seedOwnerTheoriesIfEmpty } from '@/data/owner-theories';
import type { TheoryCard } from '@/data/types';
type EditableTheory = Omit<TheoryCard, 'status'>;

export default function OwnerTheoriesScreen() {
  const { loading, user, role } = useAuth();
  const [items, setItems] = useState<(EditableTheory & { status?: string; displayOrder?: number })[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditableTheory>({ tagId: '', title: '', summary: '', categoryId: 'psychology', categoryTitle: '心理学', aliases: [], relatedTheoryIds: [] });
  const [message, setMessage] = useState('');
  const load = async () => { await seedOwnerTheoriesIfEmpty(); const next = await fetchOwnerTheories(); setItems(next); if (!selected && next[0]) { setSelected(next[0].tagId); setDraft(next[0]); } };
  useEffect(() => { if (role === 'owner') void load().catch((e) => setMessage(e instanceof Error ? e.message : '読み込めませんでした。')); }, [role]);
  if (loading) return <Screen><EmptyState title="権限を確認しています" description="ログイン状態を確認しています。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="owner権限が必要です" description="この画面はコンテンツ管理者専用です。" /></Screen>;
  const select = (item: EditableTheory) => { setSelected(item.tagId); setDraft({ ...item }); setMessage(''); };
  const create = () => { const id = `theory-${Date.now()}`; setSelected(id); setDraft({ tagId: id, title: '', summary: '', categoryId: 'psychology', categoryTitle: '心理学', aliases: [], relatedTheoryIds: [] }); };
  const save = async () => { if (!draft.tagId.trim() || !draft.title.trim()) return setMessage('IDとタイトルを入力してください。'); const saved = await publishTheory(draft); applyTheory(saved); setMessage('公開しました。web版・アプリ版の次回読み込みから反映されます。'); await load(); setSelected(saved.tagId); setDraft(saved); };
  const archive = async () => { if (!selected) return; await archiveTheory(selected); setMessage('アーカイブしました。'); await load(); };
  return <Screen contentContainerStyle={styles.screen}><View style={styles.header}><View><AppText variant="label">OWNER CONTENT</AppText><AppText variant="serif" style={styles.title}>理論の管理</AppText><AppText>追加・編集・公開・アーカイブを共通データで管理します。</AppText></View><SecondaryButton onPress={create}>＋ 新規理論</SecondaryButton></View>{message ? <AppText style={styles.message}>{message}</AppText> : null}<View style={styles.layout}><ScrollView style={styles.list}>{items.map((item) => <Pressable key={item.tagId} onPress={() => select(item)} style={[styles.row, selected === item.tagId && styles.selected]}><AppText style={styles.id}>{item.tagId}</AppText><AppText>{item.title}</AppText></Pressable>)}</ScrollView><View style={styles.editor}><Field label="ID" value={draft.tagId} onChange={(v) => setDraft({ ...draft, tagId: v })} /><Field label="タイトル" value={draft.title} onChange={(v) => setDraft({ ...draft, title: v })} /><Field label="概要" value={draft.summary} onChange={(v) => setDraft({ ...draft, summary: v })} multi /><Field label="カテゴリID" value={draft.categoryId} onChange={(v) => setDraft({ ...draft, categoryId: v })} /><Field label="カテゴリ名" value={draft.categoryTitle} onChange={(v) => setDraft({ ...draft, categoryTitle: v })} /><Field label="別名（カンマ区切り）" value={(draft.aliases ?? []).join(', ')} onChange={(v) => setDraft({ ...draft, aliases: v.split(',').map((x) => x.trim()).filter(Boolean) })} /><View style={styles.actions}><PrimaryButton onPress={() => void save()}>公開して保存</PrimaryButton><SecondaryButton onPress={() => void archive()}>アーカイブ</SecondaryButton></View></View></View></Screen>;
}
function Field({ label, value, onChange, multi = false }: { label: string; value: string; onChange: (value: string) => void; multi?: boolean }) { return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput value={value} onChangeText={onChange} multiline={multi} style={[styles.input, multi && styles.multi]} /></View>; }
const styles = StyleSheet.create({ screen: { padding: spacing.lg, gap: spacing.md }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: spacing.md }, title: { fontSize: 30, marginVertical: 6 }, message: { color: colors.gold }, layout: { flexDirection: 'row', gap: spacing.lg, minHeight: 560 }, list: { width: 300, borderRightWidth: 1, borderColor: colors.line }, row: { padding: spacing.md, borderBottomWidth: 1, borderColor: colors.line }, selected: { backgroundColor: colors.paper }, id: { color: colors.muted, fontSize: 11 }, editor: { flex: 1, maxWidth: 720, gap: spacing.md }, field: { gap: 6 }, input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, minHeight: 42, backgroundColor: colors.white }, multi: { minHeight: 140, textAlignVertical: 'top' }, actions: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' } });
