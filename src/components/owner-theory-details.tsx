import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, SecondaryButton } from './ui';
import { colors, spacing } from '@/constants/theme';
import type { TheoryCard, TheoryProvenance } from '@/data/types';

export function TheoryDetailsEditor({ value, onChange, options, disabled }: {
 value: Omit<TheoryCard, 'status'>; onChange: (patch: Partial<Omit<TheoryCard, 'status'>>) => void; options: Omit<TheoryCard, 'status'>[]; disabled: boolean;
}) {
 const [query, setQuery] = useState('');
 const p: TheoryProvenance = value.provenance ?? { status: '出典不明' };
 const update = (patch: Partial<TheoryProvenance>) => onChange({ provenance: { ...p, ...patch } });
 const ids = value.relatedTheoryIds ?? [];
 const results = options.filter((item) => item.tagId !== value.tagId && !ids.includes(item.tagId) && item.title.includes(query.trim())).slice(0, 12);
 return <View style={styles.section}>
  <AppText variant="label">出典情報（公開画面に表示）</AppText>
  <AppText style={styles.hint}>確認できた情報だけ入力してください。未確認なら「出典不明」を選びます。</AppText>
  <View style={styles.wrap}>{(['確認済み','書誌確認済み','一部確認','出典不明'] as const).map((status) =>
   <Pressable key={status} accessibilityRole="button" accessibilityState={{ selected: p.status === status }} disabled={disabled} style={[styles.choice, p.status === status && styles.selected]} onPress={() => update({ status })}><AppText>{status}</AppText></Pressable>)}</View>
  <Field label="提唱者・著者" value={p.attribution ?? ''} onChange={(attribution) => update({ attribution })} disabled={disabled} />
  <Field label="発表・刊行時期" value={p.period ?? ''} onChange={(period) => update({ period })} disabled={disabled} />
  <Field label="著作・研究（1行に1件）" value={(p.works ?? []).join('\n')} onChange={(works) => update({ works: works.split('\n') })} disabled={disabled} multi />
  <Field label="出典の注記" value={p.note ?? ''} onChange={(note) => update({ note })} disabled={disabled} multi />
  <AppText variant="label">参照先リンク</AppText>
  {(p.sources ?? []).map((source, index) => <View key={index} style={styles.source}>
    <Field label={'参照先の名称 ' + (index + 1)} value={source.title} onChange={(title) => update({ sources: p.sources!.map((row, i) => i === index ? { ...row, title } : row) })} disabled={disabled} />
    <Field label={'参照先URL ' + (index + 1)} value={source.url} onChange={(url) => update({ sources: p.sources!.map((row, i) => i === index ? { ...row, url } : row) })} disabled={disabled} />
    <SecondaryButton disabled={disabled} onPress={() => update({ sources: p.sources!.filter((_, i) => i !== index) })}>参照先を外す</SecondaryButton>
  </View>)}
  <SecondaryButton disabled={disabled} onPress={() => update({ sources: [...(p.sources ?? []), { title: '', url: '' }] })}>＋ 参照先リンク</SecondaryButton>
  <AppText variant="label">あわせて読む理論</AppText>
  <AppText style={styles.hint}>公開画面の関連理論に使用します。理論名で選択してください。</AppText>
  {ids.map((id) => <View key={id} style={styles.wrap}><AppText>{options.find((item) => item.tagId === id)?.title ?? '削除済みの理論'}</AppText><SecondaryButton disabled={disabled} onPress={() => onChange({ relatedTheoryIds: ids.filter((item) => item !== id) })}>関連から外す</SecondaryButton></View>)}
  <TextInput accessibilityLabel="関連理論を検索" value={query} onChangeText={setQuery} style={styles.input} placeholder="追加する理論名で検索" editable={!disabled} />
  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
    {results.map((item) => <Pressable accessibilityRole="button" disabled={disabled} key={item.tagId} style={styles.choice} onPress={() => onChange({ relatedTheoryIds: [...ids, item.tagId] })}><AppText>＋ {item.title}</AppText></Pressable>)}
    {!results.length ? <AppText>一致する追加候補はありません。</AppText> : null}
  </ScrollView>
 </View>;
}
function Field({ label, value, onChange, disabled, multi = false }: { label: string; value: string; onChange: (value: string) => void; disabled: boolean; multi?: boolean }) {
 return <View style={styles.field}><AppText variant="label">{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} multiline={multi} style={[styles.input, multi && { minHeight: 90, textAlignVertical: 'top' }]} /></View>;
}
const styles = StyleSheet.create({
 section: { gap: 14, paddingTop: spacing.md, borderTopWidth: 1, borderColor: colors.line },
 field: { gap: 6 }, wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' }, source: { gap: 10, padding: 12, borderWidth: 1, borderColor: colors.line, borderRadius: 8 },
 choice: { padding: 12, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 8 }, selected: { backgroundColor: '#F3E9D3' },
 hint: { color: colors.muted, fontSize: 12, lineHeight: 20 }, input: { minHeight: 46, padding: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 8, color: colors.ink },
});
