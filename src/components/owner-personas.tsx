import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, PrimaryButton, SecondaryButton } from './ui';
import { categoryMeta, categoryOrder } from '@/data/catalog';
import { archivePersona, createPersona, type OwnerPersona } from '@/data/owner-personas';
import type { CategoryKey } from '@/data/types';
import { colors, spacing } from '@/constants/theme';

export function PersonaPicker({ personas, value, onChange, disabled = false, allowAll = false }: {
 personas: OwnerPersona[]; value: string; onChange: (name: string) => void; disabled?: boolean; allowAll?: boolean;
}) {
 const [open, setOpen] = useState(false);
 const [query, setQuery] = useState('');
 const current = personas.find((persona) => persona.name === value && persona.status === 'published');
 return <View style={styles.block}>
   <AppText variant="label">{allowAll ? '人物像で絞り込む' : '所属する人物像（必須）'}</AppText>
   <SecondaryButton disabled={disabled} onPress={() => setOpen(!open)}>{current ? current.name + ' ／ ' + categoryMeta[current.category].label : value ? value + '（選び直してください）' : allowAll ? 'すべての人物像 ▾' : '人物像を選択 ▾'}</SecondaryButton>
   {open ? <View style={styles.panel}>
    <TextInput accessibilityLabel="人物像を検索" value={query} onChangeText={setQuery} placeholder="人物像名で検索" style={styles.input} />
    <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 240 }}>
     {allowAll ? <SecondaryButton onPress={() => { onChange(''); setOpen(false); }}>すべての人物像</SecondaryButton> : null}
     {personas.filter((persona) => persona.status === 'published' && persona.name.includes(query.trim())).map((persona) =>
      <Pressable key={persona.name} disabled={disabled} accessibilityRole="button" accessibilityState={{ selected: persona.name === value }} onPress={() => { onChange(persona.name); setOpen(false); setQuery(''); }} style={[styles.option, persona.name === value && styles.selected]}>
       <AppText>{persona.name}</AppText><AppText style={styles.hint}>{categoryMeta[persona.category].label}</AppText>
      </Pressable>)}
    </ScrollView>
   </View> : null}
   {!allowAll && current ? <AppText style={styles.hint}>カテゴリ：{categoryMeta[current.category].label}（人物像により自動決定）</AppText> : null}
 </View>;
}

export function PersonaManager({ personas, counts, selectedName, disabled, onChanged }: {
 personas: OwnerPersona[]; counts: Record<string, number>; selectedName: string; disabled: boolean; onChanged: (name?: string) => Promise<void>;
}) {
 const [open, setOpen] = useState(false);
 const [name, setName] = useState('');
 const [category, setCategory] = useState<CategoryKey>('interpersonal');
 const [busy, setBusy] = useState(false);
 const [error, setError] = useState('');
 const [confirm, setConfirm] = useState('');
 const active = personas.find((persona) => persona.name === selectedName && persona.status === 'published');
 const run = async (remove: boolean) => {
  setBusy(true); setError('');
  try {
   if (remove && active) await archivePersona(active.name); else await createPersona(name, category);
   await onChanged(remove ? '' : name.trim()); setName(''); setConfirm('');
  } catch (cause) { setError(cause instanceof Error ? cause.message : '操作を完了できませんでした。'); }
  finally { setBusy(false); }
 };
 return <View style={styles.block}>
  <SecondaryButton disabled={disabled || busy} onPress={() => setOpen(!open)}>{open ? '人物像の管理を閉じる' : '人物像を作成・削除する'}</SecondaryButton>
  {open ? <View style={styles.panel}>
   <AppText variant="label">新しい人物像を作成</AppText>
   <TextInput accessibilityLabel="新しい人物像名" editable={!busy} value={name} onChangeText={setName} maxLength={100} placeholder="例：判断が的確な人" style={styles.input} />
   <AppText style={styles.hint}>カテゴリは人物像の作成時に決めます。所属する処世術すべてに適用されます。</AppText>
   <View style={styles.actions}>{categoryOrder.map((key) => <Pressable key={key} disabled={busy} accessibilityRole="button" accessibilityState={{ selected: category === key }} onPress={() => setCategory(key)} style={[styles.option, category === key && styles.selected]}><AppText>{categoryMeta[key].label}</AppText></Pressable>)}</View>
   <PrimaryButton disabled={busy || !name.trim()} onPress={() => void run(false)}>{busy ? '処理中…' : '人物像を作成'}</PrimaryButton>
   {active ? <View style={styles.block}>
    <AppText>{active.name}：処世術・下書き {counts[active.name] ?? 0}件</AppText>
    <AppText style={styles.hint}>削除前に、所属する処世術と下書きを別の人物像へ移動するか削除してください。</AppText>
    {confirm === active.name ? <View style={styles.block}><AppText>「{active.name}」を人物像一覧から削除します。</AppText><View style={styles.actions}><SecondaryButton disabled={busy} onPress={() => setConfirm('')}>キャンセル</SecondaryButton><PrimaryButton disabled={busy || !!counts[active.name]} onPress={() => void run(true)}>人物像の削除を確定</PrimaryButton></View></View>
    : <SecondaryButton disabled={busy || !!counts[active.name]} onPress={() => setConfirm(active.name)}>この人物像を削除…</SecondaryButton>}
   </View> : <AppText style={styles.hint}>削除する人物像は、上の絞り込みで選択してください。</AppText>}
   {error ? <AppText accessibilityRole="alert" style={{ color: '#A63F32' }}>{error}</AppText> : null}
  </View> : null}
 </View>;
}
const styles = StyleSheet.create({
 block: { gap: 10, marginBottom: spacing.md }, panel: { padding: spacing.md, gap: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 10 },
 actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, input: { minHeight: 46, padding: 12, color: colors.ink, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.paper },
 option: { minHeight: 46, padding: 12, borderBottomWidth: 1, borderColor: colors.line }, selected: { backgroundColor: '#F3E9D3' }, hint: { color: colors.muted, fontSize: 12, lineHeight: 20 },
});
