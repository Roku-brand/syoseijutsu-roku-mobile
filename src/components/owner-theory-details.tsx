import { isRetiredTheoryId, KNOWLEDGE_TYPES, RELATION_TYPES } from '@/data/theory-knowledge';
import { fetchTheoryRelations } from '@/lib/theory-network';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { AppText, SecondaryButton } from './ui';
import { colors, spacing } from '@/constants/theme';
import type { TheoryCard, TheoryProvenance, TheoryQuotation, TheoryRelation, TheoryRelationType } from '@/data/types';

export function TheoryDetailsEditor({ value, onChange, options, disabled }: {
 value: Omit<TheoryCard, 'status'>; onChange: (patch: Partial<Omit<TheoryCard, 'status'>>) => void; options: Omit<TheoryCard, 'status'>[]; disabled: boolean;
}) {
 const [query, setQuery] = useState('');
 const [relationError, setRelationError] = useState('');
 useEffect(() => { let active = true; setRelationError('');
  if (value.relations === undefined) void fetchTheoryRelations(value.tagId).then(relations => { if (active) onChange({ relations }); }).catch(() => { if (active) setRelationError('関連知識を読み込めませんでした。保存済みの関係は変更しません。'); });
  return () => { active = false; };
  // Switching records starts a new read; edits remain local until draft/save/publish.
 }, [value.tagId]);
 const q: TheoryQuotation = value.quotation ?? { originalText: '', translationText: '', author: '', work: '', locator: '', translationKind: 'independent_translation', verification: 'pending', rightsStatus: 'pending', rightsBasis: '', sourceUrls: [], checkedOn: '' };
 const quote = (patch: Partial<TheoryQuotation>) => onChange({ quotation: { ...q, ...patch }, ...(patch.translationText !== undefined ? { title: '「'+patch.translationText+'」' } : {}) });
 const relationRows = value.relations ?? [];
 const updateRelation = (index: number, patch: Partial<TheoryRelation>) => onChange({ relations: relationRows.map((r,i) => i === index ? { ...r,...patch } : r) });
 const p: TheoryProvenance = value.provenance ?? { status: '出典不明' };
 const update = (patch: Partial<TheoryProvenance>) => onChange({ provenance: { ...p, ...patch } });
 const ids = value.relatedTheoryIds ?? [];
 const results = options.filter((item) => item.tagId !== value.tagId && !isRetiredTheoryId(item.tagId) && !ids.includes(item.tagId) && item.title.includes(query.trim())).slice(0, 12);
 return <View style={styles.section}>
  <AppText variant="label">知識の種類</AppText>
  <View style={styles.wrap}>{Object.entries(KNOWLEDGE_TYPES).map(([id,label]) => <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: (value.knowledgeType ?? 'unspecified') === id }} disabled={disabled} style={[styles.choice, value.knowledgeType === id && styles.selected]} onPress={() => onChange({ knowledgeType: id as TheoryCard['knowledgeType'], ...(id === 'aphorism' ? { quotation: q } : {}) })}><AppText>{label}</AppText></Pressable>)}</View>
  <AppText style={styles.hint}>分類タブは増やさず、理論・現象・手法・思想を区別するための属性です。</AppText>
  {value.knowledgeType === 'aphorism' || value.quotation ? <>
   <AppText variant="label">格言の原典・権利監査</AppText>
   <Field label="表示用日本語（原文・訓読・訳文）" value={q.translationText} onChange={translationText => quote({translationText})} disabled={disabled} multi />
   <AppText style={styles.hint}>この言葉が一覧・検索の公開見出しになります。原文・出典・解説は設定した公開範囲で配信します。</AppText>
   <Field label="著作者・発言者" value={q.author} onChange={author => quote({author})} disabled={disabled} />
   <Field label="著作者の死亡年" value={q.authorDeathYear == null ? '' : String(q.authorDeathYear)} onChange={year => quote({authorDeathYear: /^-?\d+$/.test(year) ? Number(year) : null})} disabled={disabled} />
   {q.authorDeathYear == null && q.authorDeathYearUpperBound != null && <AppText style={styles.hint}>没年不詳：確認済みの上限年 {q.authorDeathYearUpperBound}年</AppText>}
   <Field label="作品・原典" value={q.work} onChange={work => quote({work})} disabled={disabled} />
   <Field label="原典内の位置" value={q.locator} onChange={locator => quote({locator})} disabled={disabled} />
   <Field label="初出・参照版の刊行年" value={q.publicationYear == null ? '' : String(q.publicationYear)} onChange={year => quote({publicationYear: /^\d+$/.test(year) ? Number(year) : null})} disabled={disabled} />
   {q.publicationYear == null && q.publicationYearUpperBound != null && <AppText style={styles.hint}>成立年不詳：確認済みの上限年 {q.publicationYearUpperBound}年</AppText>}
   <Field label="原文" value={q.originalText} onChange={originalText => quote({originalText})} disabled={disabled} multi />
   <Field label="原文の言語" value={q.originalLanguage ?? ''} onChange={originalLanguage => quote({originalLanguage})} disabled={disabled} />
   <AppText variant="label">翻訳区分</AppText><View style={styles.wrap}>{([['independent_translation','独自訳'],['original_japanese','日本語原文'],['classical_transcription','古典の表記整理'],['established_translation','定着した日本語表現']] as const).map(([id,label]) => <SecondaryButton key={id} disabled={disabled} onPress={() => quote({translationKind:id})}>{q.translationKind === id ? '✓ ' : ''}{label}</SecondaryButton>)}</View>
   {q.translationKind === 'established_translation' && <Field label="日本語表現の確認資料URL" value={q.translationSourceUrl ?? ''} onChange={text => quote({ translationSourceUrl: text })} disabled={disabled} />}
   <Field label="使用可能性の判断根拠（原典・翻訳・戦時加算）" value={q.rightsBasis} onChange={rightsBasis => quote({rightsBasis})} disabled={disabled} multi />
   <Field label="確認資料URL（1行に1件）" value={q.sourceUrls.join('\n')} onChange={urls => quote({sourceUrls: urls.split('\n').map(x => x.trim()).filter(Boolean)})} disabled={disabled} multi />
   <Field label="確認日（YYYY-MM-DD）" value={q.checkedOn} onChange={checkedOn => quote({checkedOn})} disabled={disabled} />
   <Field label="作中の発言者・文脈の注記" value={q.contextNote ?? ''} onChange={contextNote => quote({contextNote})} disabled={disabled} multi />
   <View style={styles.wrap}>{([['pending','原典：未確認'],['verified','原典：照合済み'],['rejected','原典：不一致']] as const).map(([id,label]) => <SecondaryButton key={id} disabled={disabled} onPress={() => quote({verification:id})}>{q.verification === id ? '✓ ' : ''}{label}</SecondaryButton>)}</View>
   <View style={styles.wrap}>{([['pending','権利：保留'],['cleared','権利：確認済み'],['blocked','権利：使用不可']] as const).map(([id,label]) => <SecondaryButton key={id} disabled={disabled} onPress={() => quote({rightsStatus:id})}>{q.rightsStatus === id ? '✓ ' : ''}{label}</SecondaryButton>)}</View>
   <AppText style={styles.hint}>死亡年だけでは公開できません。原典・初出・翻訳・例外の根拠を確認し、確認済みにした記録だけ公開できます。</AppText>
  </> : null}
  <AppText variant="label">出典情報（公開画面に表示）</AppText>
  <AppText style={styles.hint}>確認できた著作・研究を記録します。独自作成の名言は公開できません。</AppText>
  <View style={styles.wrap}>{(['確認済み','書誌確認済み','一部確認','出典不明'] as const).map(status => <Pressable key={status} accessibilityRole="button" accessibilityState={{selected:p.status === status}} disabled={disabled} style={[styles.choice,p.status === status && styles.selected]} onPress={() => update({status})}><AppText>{status}</AppText></Pressable>)}</View>
  <Field label="提唱者・著者" value={p.attribution ?? ''} onChange={(attribution) => update({ attribution })} disabled={disabled} />
  {p.status !== 'オリジナル' ? <><Field label="発表・刊行時期" value={p.period ?? ''} onChange={(period) => update({ period })} disabled={disabled} />
  <Field label="著作・研究（1行に1件）" value={(p.works ?? []).join('\n')} onChange={(works) => update({ works: works.split('\n') })} disabled={disabled} multi />
  </> : <AppText>出典：処世術禄オリジナル</AppText>}
  <Field label="出典の注記" value={p.note ?? ''} onChange={(note) => update({ note })} disabled={disabled} multi />
  {p.status !== 'オリジナル' ? <><AppText variant="label">参照先リンク</AppText>
  {(p.sources ?? []).map((source, index) => <View key={index} style={styles.source}>
    <Field label={'参照先の名称 ' + (index + 1)} value={source.title} onChange={(title) => update({ sources: p.sources!.map((row, i) => i === index ? { ...row, title } : row) })} disabled={disabled} />
    <Field label={'参照先URL ' + (index + 1)} value={source.url} onChange={(url) => update({ sources: p.sources!.map((row, i) => i === index ? { ...row, url } : row) })} disabled={disabled} />
    <SecondaryButton disabled={disabled} onPress={() => update({ sources: p.sources!.filter((_, i) => i !== index) })}>参照先を外す</SecondaryButton>
  </View>)}
  <SecondaryButton disabled={disabled} onPress={() => update({ sources: [...(p.sources ?? []), { title: '', url: '' }] })}>＋ 参照先リンク</SecondaryButton>
  </> : null}
  <AppText variant="label">関連知識の関係・方向</AppText>
  {relationError ? <AppText style={styles.hint}>{relationError}</AppText> : null}
  {relationRows.map((r,index) => {const otherId = r.sourceId === value.tagId ? r.targetId : r.sourceId;return <View key={otherId} style={styles.source}>
   <AppText>{options.find(t => t.tagId === otherId)?.title ?? otherId}</AppText>
   <View style={styles.wrap}>{Object.entries(RELATION_TYPES).map(([id,label]) => <SecondaryButton key={id} disabled={disabled} onPress={() => updateRelation(index,{type:id as TheoryRelationType,reviewStatus:'draft'})}>{r.type === id ? '✓ ' : ''}{label}</SecondaryButton>)}</View>
   {['contains','explains','applies'].includes(r.type) ? <SecondaryButton disabled={disabled} onPress={() => updateRelation(index,{sourceId:r.targetId,targetId:r.sourceId,reviewStatus:'draft'})}>方向：{r.sourceId === value.tagId ? 'この知識 → 相手' : '相手 → この知識'}（反転）</SecondaryButton> : null}
   <Field label={'関係の根拠 ' + (index+1)} value={r.rationale} onChange={rationale => updateRelation(index,{rationale})} disabled={disabled} multi />
   <Field label={'関連の表示優先度 ' + (index+1)} value={String(r.priority)} onChange={text => updateRelation(index,{priority:Number(text)||100})} disabled={disabled} />
   <View style={styles.wrap}><SecondaryButton disabled={disabled} onPress={() => updateRelation(index,{reviewStatus:'draft'})}>{r.reviewStatus === 'draft' ? '✓ ' : ''}確認待ち</SecondaryButton><SecondaryButton disabled={disabled || !r.rationale.trim()} onPress={() => updateRelation(index,{reviewStatus:'confirmed'})}>{r.reviewStatus === 'confirmed' ? '✓ ' : ''}内容を照合済み</SecondaryButton></View>
   <SecondaryButton disabled={disabled} onPress={() => onChange({relations:relationRows.filter((_,i) => i!==index),relatedTheoryIds:ids.filter(id => id!==otherId)})}>関係を外す</SecondaryButton>
  </View>;})}
  <AppText variant="label">あわせて読む理論</AppText>
  <AppText style={styles.hint}>公開画面の関連理論に使用します。理論名で選択してください。</AppText>
  {ids.map((id) => <View key={id} style={styles.wrap}><AppText>{options.find((item) => item.tagId === id)?.title ?? '削除済みの理論'}</AppText><SecondaryButton disabled={disabled} onPress={() => onChange({ relatedTheoryIds: ids.filter((item) => item !== id), relations: value.relations?.filter(r => r.sourceId !== id && r.targetId !== id) })}>関連から外す</SecondaryButton></View>)}
  <TextInput accessibilityLabel="関連理論を検索" value={query} onChangeText={setQuery} style={styles.input} placeholder="追加する理論名で検索" editable={!disabled} />
  <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled" style={{ maxHeight: 220 }}>
    {results.map((item) => <Pressable accessibilityRole="button" disabled={disabled} key={item.tagId} style={styles.choice} onPress={() => onChange({ relatedTheoryIds: [...ids, item.tagId], ...(value.relations ? {relations: [...value.relations,{sourceId:value.tagId,targetId:item.tagId,type:'related',reviewStatus:'draft',rationale:'',priority:100}]} : {}) })}><AppText>＋ {item.title}</AppText></Pressable>)}
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
 choice: { padding: 12, minHeight: 44, borderWidth: 1, borderColor: colors.line, borderRadius: 8 }, selected: { backgroundColor: '#E8E8E8' },
 hint: { color: colors.muted, fontSize: 12, lineHeight: 20 }, input: { minHeight: 46, padding: 12, backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line, borderRadius: 8, color: colors.ink },
});
