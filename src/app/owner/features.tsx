import { Redirect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { Screen, AppText, EmptyState } from '@/components/ui';
import { FeatureArticleContent, FEATURE_IMAGES, featureImage } from '@/components/feature-article';
import { colors, fonts } from '@/constants/theme';
import { archiveFeature, blankFeature, featureCharacterCount, featurePayload, fetchFeatureEditor, publishFeature, saveFeatureDraft, type FeatureArticle, type FeatureDraft, type FeaturePayload } from '@/data/features';
import { techniqueById, theoryById } from '@/data/catalog';
import { pickContentImage, uploadContentImage, type ContentImageAsset } from '@/lib/content-media';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { FEATURE_CATEGORIES, featureCategoryLabel } from '@/data/feature-categories';

export default function OwnerFeaturesScreen() {
  const { loading, user, role } = useAuth();
  if (loading) return <Screen><EmptyState title="権限を確認しています" description="少しお待ちください。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="オーナー権限が必要です" description="特集の編集はオーナー専用です。" /></Screen>;
  return <FeatureEditor />;
}
import { fetchEditorialCharacterEditor, type EditorialCharacter } from '@/data/editorial-characters';

const causeMessage = (cause: unknown) => cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : '操作を完了できませんでした。';
function FeatureEditor() {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const [characters, setCharacters] = useState<EditorialCharacter[]>([]);
  const [charactersError, setCharactersError] = useState('');
  const [articles, setArticles] = useState<FeatureArticle[]>([]);
  const [drafts, setDrafts] = useState<FeatureDraft[]>([]);
  const [id, setId] = useState<string | null>(null);
  const [payload, setPayload] = useState<FeaturePayload>(blankFeature);
  const [base, setBase] = useState<string | null>(null);
  const [revision, setRevision] = useState<number | null>(null);
  const [asset, setAsset] = useState<ContentImageAsset | null>(null);
  const [dirty, setDirty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState<'publish' | 'archive' | null>(null);
  const [pending, setPending] = useState<string | null | undefined>(undefined);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const selected = articles.find(article => article.id === id);
  const choose = (nextId: string | null, rows = articles, changes = drafts) => {
    const article = rows.find(item => item.id === nextId);
    const draft = changes.find(item => item.article_id === nextId);
    setId(article?.id ?? null); setPayload(draft?.payload ?? (article ? featurePayload(article) : blankFeature()));
    setBase(draft?.base_updated_at ?? article?.updated_at ?? null); setRevision(draft?.revision ?? null);
    setDirty(false); setAsset(null); setPreview(false); setConfirm(null); setNotice(''); setError(''); setPending(undefined);
  };
  const reload = useCallback(async (preferredId?: string | null) => {
    setLoading(true);
    try { const data = await fetchFeatureEditor(); setArticles(data.articles); setDrafts(data.drafts); choose(preferredId === undefined ? data.articles[0]?.id ?? null : preferredId, data.articles, data.drafts); }
    catch (cause) { setError(causeMessage(cause)); }
    finally { setLoading(false); }
    // Reload selects a fresh server snapshot, not an in-progress form.
  }, []);
  useEffect(() => { void reload(); void fetchEditorialCharacterEditor().then(setCharacters).catch(() => setCharactersError('案内人を読み込めませんでした。設定は保持されます。画面を再読み込みしてください。')); }, [reload]);
  useEffect(() => {
    if (Platform.OS !== 'web' || !dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const patch = (changes: Partial<FeaturePayload>) => { setPayload(current => ({ ...current, ...changes })); setDirty(true); setNotice(''); setError(''); setConfirm(null); };
  const navigate = (nextId: string | null) => { if (dirty) setPending(nextId); else choose(nextId); };
  const save = async () => {
    const next = { ...payload };
    if (asset) next.image_path = await uploadContentImage(asset, 'feature', id ?? 'new');
    const saved = await saveFeatureDraft(id, next, base, revision);
    setId(saved.id); setBase(saved.base_updated_at); setRevision(saved.revision); setPayload(next); setDirty(false); setAsset(null);
    return saved;
  };
  const perform = async (action: 'save' | 'publish' | 'archive') => {
    setBusy(true); setError(''); setNotice(''); setConfirm(null);
    try {
      if (action === 'archive') { if (!selected) return; await archiveFeature(selected); await reload(selected.id); setNotice('記事を非公開にしました。本文と下書きは保持されています。'); }
      else { const saved = await save(); if (action === 'publish') { await publishFeature(saved.id, saved.revision); await reload(saved.id); setNotice('特集を公開しました。'); } else { const data = await fetchFeatureEditor(); setArticles(data.articles); setDrafts(data.drafts); setNotice('下書きを保存しました。公開中の内容は変わりません。'); } }
    } catch (cause) { setError(causeMessage(cause)); }
    finally { setBusy(false); }
  };
  const previewArticle: FeatureArticle = { ...payload, id: id ?? 'preview', status: 'draft', updated_at: '', image_path: asset?.uri ?? payload.image_path };
  return <Screen testID="feature-editor" contentContainerStyle={styles.page}>
    <View style={styles.top}><View style={styles.topCopy}><AppText style={styles.pageTitle}>特集管理</AppText><AppText style={styles.muted}>記事・画像・掲載順を編集し、下書きを確認してから公開できます。</AppText></View><Button disabled={busy || dirty} onPress={() => router.push('/features')}>公開画面を見る</Button><Button disabled={busy || dirty} onPress={() => router.push('/owner/editorial-characters')}>編集案内人を管理</Button></View>
    {error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}{notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}
    {pending !== undefined ? <View style={styles.confirm}><AppText>未保存の変更があります。破棄して記事を切り替えますか？</AppText><View style={styles.actions}><Button onPress={() => setPending(undefined)}>編集を続ける</Button><Button onPress={() => choose(pending)}>破棄して切り替える</Button></View></View> : null}
    {loading ? <AppText>特集を読み込んでいます。</AppText> : <View style={[styles.workspace, width < 1000 && styles.workspaceCompact]}>
      <View style={[styles.articleList, width < 1000 && styles.articleListCompact]}>
        <Button primary disabled={busy} onPress={() => navigate(null)}>＋ 記事を作成</Button>
        {articles.map(article => {
          const draft = drafts.find(item => item.article_id === article.id);
          return <Pressable key={article.id} accessibilityRole="button" accessibilityLabel={`${article.title || '無題の記事'}を編集`} accessibilityState={{ selected: article.id === id }} disabled={busy} onPress={() => navigate(article.id)} style={[styles.listItem, article.id === id && styles.listSelected]}>
            <AppText style={styles.listTitle}>{draft?.payload.title || article.title || '無題の記事'}</AppText>
            <AppText style={styles.muted}>{featureCategoryLabel(draft ? draft.payload.category_id : article.category_id)}</AppText>
            <AppText style={styles.muted}>{article.status === 'published' ? '公開中' : article.status === 'archived' ? '非公開' : '下書き'}{draft ? ' · 下書きあり' : ''}{article.is_featured ? ' · ヒーロー' : ''}</AppText>
          </Pressable>;
        })}
      </View>
      <View style={styles.editor}><View style={styles.actions}><Button disabled={busy} onPress={() => setPreview(false)} primary={!preview}>編集</Button><Button disabled={busy} onPress={() => setPreview(true)} primary={preview}>プレビュー</Button>{dirty ? <AppText style={styles.unsaved}>未保存</AppText> : null}</View>
        {preview ? <FeatureArticleContent article={previewArticle} characters={characters} others={articles.filter(item => item.id !== id && item.status === 'published')} preview /> : <>
          <Field label="タイトル" value={payload.title} onChange={title => patch({ title })} disabled={busy} />
          <View style={styles.field}>
            <AppText style={styles.fieldLabel}>主カテゴリ</AppText>
            <AppText style={styles.muted}>記事の中心となる問いに合うものを一つ選びます。</AppText>
            <View accessibilityRole="radiogroup" accessibilityLabel="主カテゴリ" style={styles.actions}>
              {FEATURE_CATEGORIES.map(category => <Pressable key={category.id} accessibilityRole="radio" accessibilityLabel={category.label} accessibilityState={{ checked: payload.category_id === category.id, disabled: busy }} aria-checked={payload.category_id === category.id} disabled={busy} onPress={() => patch({ category_id: category.id })} style={[styles.button, payload.category_id === category.id && styles.primary, busy && styles.disabled]}>
                <AppText style={[styles.buttonText, payload.category_id === category.id && styles.primaryText]}>{category.label}</AppText>
              </Pressable>)}
            </View>
            {payload.category_id ? <AppText style={styles.muted}>{FEATURE_CATEGORIES.find(category => category.id === payload.category_id)?.description}</AppText> : <AppText style={styles.muted}>カテゴリが未設定の記事も「すべて」に表示されます。</AppText>}
          </View>
          <View style={styles.field}><AppText style={styles.fieldLabel}>編集案内人（任意）</AppText><AppText style={styles.muted}>制作主体は処世術禄編集部です。記事を案内する人物を選びます。</AppText>{charactersError ? <AppText style={styles.error}>{charactersError}</AppText> : null}<View accessibilityRole="radiogroup" accessibilityLabel="編集案内人" style={styles.actions}>{[{ id: null, name: '設定なし' }, ...characters].map(character => <Pressable key={character.id ?? 'none'} accessibilityRole="radio" accessibilityLabel={character.name} aria-checked={payload.editorial_character_id === character.id} accessibilityState={{ checked: payload.editorial_character_id === character.id }} disabled={busy} onPress={() => patch({ editorial_character_id: character.id })} style={[styles.button, payload.editorial_character_id === character.id && styles.primary]}><AppText style={[styles.buttonText, payload.editorial_character_id === character.id && styles.primaryText]}>{character.name}{'status' in character && character.status !== 'published' ? '（非公開）' : ''}</AppText></Pressable>)}</View></View>
          <Field label="記事のURL名" hint="半角英数字とハイフンで指定します。公開後は固定されます。" value={payload.slug} onChange={slug => patch({ slug })} disabled={busy || Boolean(selected && selected.status !== 'draft')} />
          <Field label="導入文" value={payload.lead} onChange={lead => patch({ lead })} multiline disabled={busy} />
          <View style={styles.field}><AppText style={styles.fieldLabel}>写真</AppText><Image source={asset ? { uri: asset.uri } : featureImage(payload.image_path)} contentFit="cover" style={styles.image} /><View style={styles.actions}><Button disabled={busy} onPress={() => { void pickContentImage().then(picked => { if (picked) { setAsset(picked); setDirty(true); } }).catch(cause => setError(causeMessage(cause))); }}>画像をアップロード</Button>{Object.keys(FEATURE_IMAGES).map((key, index) => <Button key={key} disabled={busy} primary={!asset && payload.image_path === key} onPress={() => { setAsset(null); patch({ image_path: key }); }}>{['海', '森', '山'][index]}</Button>)}</View></View>
          <Field label="写真の説明" hint="画像を見られない方にも内容が伝わる短い説明です。" value={payload.image_alt} onChange={image_alt => patch({ image_alt })} disabled={busy} />
          <Field label="本文" hint="見出しは「## 見出し」、段落は空行で区切れます。太字は **言葉**、箇条書きは「- 項目」です。" value={payload.body} onChange={body => patch({ body })} multiline large disabled={busy} />
          <AppText style={styles.muted}>本文 {featureCharacterCount(payload.body).toLocaleString()}字 · 約2,000字は目安です。長さの制限や定期更新の必要はありません。</AppText>
          <View style={styles.switchRow}><AppText style={styles.fieldLabel}>ヒーローに掲載</AppText><Switch accessibilityLabel="ヒーローに掲載" disabled={busy} value={payload.is_featured} onValueChange={is_featured => patch({ is_featured })} /></View>
          <View style={styles.switchRow}><AppText style={styles.fieldLabel}>一覧に掲載</AppText><Switch accessibilityLabel="一覧に掲載" disabled={busy} value={payload.show_in_list} onValueChange={show_in_list => patch({ show_in_list })} /></View>
          <Field label="掲載順" hint="小さい番号から並びます。ヒーローの順序にも使います。" value={String(payload.display_order)} onChange={value => patch({ display_order: Math.max(0, Math.min(100000, Number.parseInt(value, 10) || 0)) })} disabled={busy} />
          <RelatedPicker label="関連する処世術" ids={payload.related_technique_ids} choices={[...techniqueById.values()].filter(item => item.title !== '完全版の処世術').map(item => ({ id: item.id, title: item.title }))} disabled={busy} onChange={related_technique_ids => patch({ related_technique_ids })} />
          <RelatedPicker label="関連する理論" ids={payload.related_theory_ids} choices={[...theoryById.values()].filter(item => item.title !== '完全版の理論').map(item => ({ id: item.tagId, title: item.title }))} disabled={busy} onChange={related_theory_ids => patch({ related_theory_ids })} />
          <RelatedPicker label="関連する特集" ids={payload.related_feature_ids} choices={articles.filter(item => item.id !== id && item.status === 'published').map(item => ({ id: item.id, title: item.title }))} disabled={busy} onChange={related_feature_ids => patch({ related_feature_ids })} />
          <View style={styles.field}><AppText style={styles.fieldLabel}>参考文献・出典（任意）</AppText><AppText style={styles.muted}>確認できた出典のみ設定します。対象年や適用範囲は補足に記載できます。URLは http / https のみです。</AppText>{payload.source_references.map((reference, index) => <View key={index} style={styles.confirm}><Field label={`出典${index + 1}の名称`} value={reference.title} disabled={busy} onChange={title => patch({ source_references: payload.source_references.map((item, n) => n === index ? { ...item, title } : item) })} /><Field label={`出典${index + 1}のURL`} value={reference.url ?? ''} disabled={busy} onChange={url => patch({ source_references: payload.source_references.map((item, n) => n === index ? { ...item, url: url.trim() || null } : item) })} /><Field label={`出典${index + 1}の補足`} value={reference.note} multiline disabled={busy} onChange={note => patch({ source_references: payload.source_references.map((item, n) => n === index ? { ...item, note } : item) })} /><Button disabled={busy} onPress={() => patch({ source_references: payload.source_references.filter((_, n) => n !== index) })}>{`出典${index + 1}を外す`}</Button></View>)}<Button disabled={busy || payload.source_references.length >= 12} onPress={() => patch({ source_references: [...payload.source_references, { title: '', url: null, note: '' }] })}>＋ 出典を追加</Button></View>
        </>}
        {confirm ? <View style={styles.confirm}><AppText>{confirm === 'publish' ? 'この内容を無料公開します。公開画面の本文・画像・掲載設定が更新されます。' : 'この記事を非公開にします。保存した本文と下書きは残ります。'}</AppText><View style={styles.actions}><Button disabled={busy} onPress={() => setConfirm(null)}>取り消す</Button><Button primary disabled={busy} onPress={() => void perform(confirm)}>{confirm === 'publish' ? 'この内容で公開' : 'この特集を非公開にする'}</Button></View></View> : null}
        <View style={styles.actions}><Button disabled={busy || !payload.title.trim()} onPress={() => void perform('save')}>{busy ? '保存中…' : '下書きを保存'}</Button><Button primary disabled={busy || !payload.title.trim() || !payload.body.trim()} onPress={() => setConfirm('publish')}>公開する</Button>{selected?.status === 'published' ? <Button disabled={busy || dirty} onPress={() => setConfirm('archive')}>非公開にする</Button> : null}</View>
        <AppText style={styles.muted}>特集は無料公開です。日付・更新時刻・読了時間は読者画面に表示されません。</AppText>
      </View>
    </View>}
  </Screen>;
}
function Field({ label, hint, value, onChange, multiline, large, disabled }: { label: string; hint?: string; value: string; onChange: (value: string) => void; multiline?: boolean; large?: boolean; disabled?: boolean }) {
  return <View style={styles.field}><AppText style={styles.fieldLabel}>{label}</AppText>{hint ? <AppText style={styles.muted}>{hint}</AppText> : null}<TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} style={[styles.input, multiline && styles.multiline, large && styles.bodyInput]} /></View>;
}
function Button({ children, onPress, disabled, primary }: { children: string; onPress: () => void; disabled?: boolean; primary?: boolean }) { return <Pressable accessibilityRole="button" accessibilityLabel={children} disabled={disabled} onPress={onPress} style={[styles.button, primary && styles.primary, disabled && styles.disabled]}><AppText style={[styles.buttonText, primary && styles.primaryText]}>{children}</AppText></Pressable>; }
function RelatedPicker({ label, ids, choices, disabled, onChange }: { label: string; ids: string[]; choices: { id: string; title: string }[]; disabled: boolean; onChange: (ids: string[]) => void }) {
  const [query, setQuery] = useState('');
  const candidates = query.trim() ? choices.filter(item => item.title.includes(query.trim()) && !ids.includes(item.id)).slice(0, 8) : [];
  return <View style={styles.field}><AppText style={styles.fieldLabel}>{label}（任意）</AppText><View style={styles.actions}>{ids.map(id => <Button key={id} disabled={disabled} onPress={() => onChange(ids.filter(item => item !== id))}>{`${choices.find(item => item.id === id)?.title ?? id} ×`}</Button>)}</View><TextInput accessibilityLabel={`${label}を検索`} placeholder="タイトルで検索して追加" value={query} onChangeText={setQuery} editable={!disabled} style={styles.input} />{candidates.map(item => <Button key={item.id} disabled={disabled} onPress={() => { onChange([...ids, item.id]); setQuery(''); }}>{`＋ ${item.title}`}</Button>)}</View>;
}
const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1280, alignSelf: 'center', padding: 20, gap: 18 }, top: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 16 }, topCopy: { flex: 1, minWidth: 200 }, pageTitle: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 42 }, muted: { color: colors.muted, fontSize: 12, lineHeight: 21 }, workspace: { flexDirection: 'row', gap: 28, alignItems: 'flex-start' }, workspaceCompact: { flexDirection: 'column' }, articleList: { width: 270, gap: 10 }, articleListCompact: { width: '100%' }, listItem: { padding: 14, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 9, gap: 6 }, listSelected: { borderColor: colors.gold }, listTitle: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 26 }, editor: { flex: 1, width: '100%', minWidth: 0, gap: 20 }, field: { gap: 8 }, fieldLabel: { fontSize: 14, fontWeight: '700' }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: 8, padding: 12, fontSize: 16, lineHeight: 25, color: colors.ink }, multiline: { minHeight: 110 }, bodyInput: { minHeight: 440, fontFamily: fonts.serif, lineHeight: 30 }, actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10 }, button: { paddingVertical: 10, paddingHorizontal: 15, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.surface, minHeight: 44, justifyContent: 'center' }, buttonText: { color: colors.ink, fontSize: 13, lineHeight: 22 }, primary: { backgroundColor: colors.gold, borderColor: colors.gold }, primaryText: { color: '#FFFFFF' }, disabled: { opacity: 0.45 }, switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 20, minHeight: 44 }, image: { width: '100%', aspectRatio: 2.2, borderRadius: 9, backgroundColor: colors.line }, error: { color: '#9B332D', fontSize: 14, lineHeight: 25 }, notice: { color: '#3E6144', fontSize: 14, lineHeight: 25 }, unsaved: { color: '#995122', fontSize: 12 }, confirm: { padding: 18, gap: 14, backgroundColor: '#F2E9D8', borderRadius: 10 },
});
