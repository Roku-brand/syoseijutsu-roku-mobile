import { Redirect, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useAuth } from '@/auth/auth-state';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { EditorialAvatar, EDITORIAL_PORTRAITS } from '@/components/editorial-guide';
import { colors, fonts } from '@/constants/theme';
import { blankEditorialCharacter, editorialCharacterPayload, fetchEditorialCharacterEditor, saveEditorialCharacter, type EditorialCharacter, type EditorialCharacterPayload } from '@/data/editorial-characters';
import { pickContentImage, uploadContentImage, type ContentImageAsset } from '@/lib/content-media';
import { editorialGuideRoute } from '@/navigation/app-routes';

export default function OwnerEditorialCharactersScreen() {
  const { loading, user, role } = useAuth();
  if (loading) return <Screen><EmptyState title="権限を確認しています" description="少しお待ちください。" /></Screen>;
  if (!user) return <Redirect href="/auth?mode=signin" />;
  if (role !== 'owner') return <Screen><EmptyState title="オーナー権限が必要です" description="編集案内人の管理はオーナー専用です。" /></Screen>;
  return <CharacterEditor />;
}
function CharacterEditor() {
  const router = useRouter();
  const [characters, setCharacters] = useState<EditorialCharacter[]>([]);
  const [selected, setSelected] = useState<EditorialCharacter | null>(null);
  const [payload, setPayload] = useState<EditorialCharacterPayload>(blankEditorialCharacter);
  const [interests, setInterests] = useState('');
  const [asset, setAsset] = useState<ContentImageAsset | null>(null);
  const [dirty, setDirty] = useState(false);
  const [pending, setPending] = useState<EditorialCharacter | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const choose = (character: EditorialCharacter | null) => { setSelected(character); const next = character ? editorialCharacterPayload(character) : blankEditorialCharacter(); setPayload(next); setInterests(next.interests.join('、')); setAsset(null); setDirty(false); setPending(undefined); setError(''); setNotice(''); };
  const reload = () => { setLoading(true); void fetchEditorialCharacterEditor().then(rows => { setCharacters(rows); choose(rows[0] ?? null); }).catch(cause => setError(String(cause.message))).finally(() => setLoading(false)); };
  useEffect(reload, []);
  useEffect(() => { if (Platform.OS !== 'web' || !dirty) return; const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  const patch = (value: Partial<EditorialCharacterPayload>) => { setPayload(current => ({ ...current, ...value })); setDirty(true); setError(''); setNotice(''); };
  const select = (character: EditorialCharacter | null) => dirty ? setPending(character) : choose(character);
  const save = async (status = payload.status) => {
    setBusy(true); setError(''); setNotice('');
    try { const image_path = asset ? await uploadContentImage(asset, 'feature', `editor-${selected?.id ?? 'new'}`) : payload.image_path; const row = await saveEditorialCharacter(selected?.id ?? null, { ...payload, interests: interests.split(/[、,\n]/).map(value => value.trim()).filter(Boolean), image_path, status }, selected?.updated_at ?? null); setCharacters(await fetchEditorialCharacterEditor()); choose(row); setNotice(status === 'archived' ? '案内人を無効化しました。既存の記事は編集部名義で引き続き表示されます。' : '編集案内人を保存しました。'); }
    catch (cause) { setError(cause && typeof cause === 'object' && 'message' in cause ? String(cause.message) : '保存できませんでした。'); }
    finally { setBusy(false); }
  };
  return <Screen contentContainerStyle={styles.page} testID="editorial-character-editor"><AppText accessibilityRole="header" aria-level={1} style={styles.title}>編集案内人の管理</AppText><AppText style={styles.note}>編集案内人のプロフィールを管理します。記事の制作主体は処世術禄編集部です。名前を変更してもプロフィールのURLは維持されます。</AppText><View style={styles.actions}><Button label="特集管理へ" disabled={busy || dirty} onPress={() => router.push('/owner/features')} /><Button label="＋ 案内人を追加" disabled={busy} onPress={() => select(null)} /></View>{error ? <AppText accessibilityRole="alert" style={styles.error}>{error}</AppText> : null}{notice ? <AppText accessibilityLiveRegion="polite" style={styles.notice}>{notice}</AppText> : null}{pending !== undefined ? <View style={styles.panel}><AppText>未保存の変更があります。破棄して切り替えますか？</AppText><Button label="編集を続ける" onPress={() => setPending(undefined)} /><Button label="破棄して切り替える" onPress={() => choose(pending)} /></View> : null}{loading ? <AppText>案内人を読み込んでいます。</AppText> : <><View style={styles.actions}>{characters.map(character => <Button key={character.id} label={`${character.name}を編集`} disabled={busy} onPress={() => select(character)} />)}</View><View style={styles.panel}><EditorialAvatar character={payload} size={80} /><Button label="プロフィール画像を選ぶ" disabled={busy} onPress={() => { void pickContentImage().then(picked => { if (picked) { setAsset(picked); setDirty(true); } }).catch(cause => setError(String(cause.message))); }} />{asset ? <AppText style={styles.note}>新しい画像を選択しました。保存時に反映されます。</AppText> : null}<View style={styles.actions}><>{EDITORIAL_PORTRAITS.map(portrait => <Button key={portrait.id} label={`${portrait.name}のイラスト`} disabled={busy} onPress={() => { setAsset(null); patch({ image_path: portrait.id }); }} />)}</><Button label="仮アイコンを使う" disabled={busy} onPress={() => { setAsset(null); patch({ image_path: null }); }} /></View><Field label="名前" value={payload.name} disabled={busy} onChange={name => patch({ name })} /><Field label="肩書き" value={payload.role} disabled={busy} onChange={role => patch({ role })} /><Field label="紹介文" value={payload.bio} disabled={busy} multiline onChange={bio => patch({ bio })} /><Field label="関心領域" value={interests} disabled={busy} onChange={value => { setInterests(value); setDirty(true); }} /><AppText style={styles.note}>読点または改行で区切ります。</AppText><Field label="画像の説明" value={payload.image_alt} disabled={busy} onChange={image_alt => patch({ image_alt })} /><Field label="表示順" value={String(payload.display_order)} disabled={busy} onChange={value => patch({ display_order: Math.max(0, Math.min(100000, Number.parseInt(value, 10) || 0)) })} /><View accessibilityRole="radiogroup" accessibilityLabel="案内人の公開状態" style={styles.actions}>{(['draft', 'published', 'archived'] as const).map((status, index) => <Pressable key={status} accessibilityRole="radio" aria-checked={payload.status === status} accessibilityState={{ checked: payload.status === status }} accessibilityLabel={['非公開', '公開', '無効'][index]} disabled={busy} onPress={() => patch({ status })} style={[styles.button, payload.status === status && styles.selected]}><AppText>{['非公開', '公開', '無効'][index]}</AppText></Pressable>)}</View><View style={styles.actions}><Button label={busy ? '保存中…' : '案内人を保存'} disabled={busy || !payload.name.trim()} onPress={() => void save()} />{selected ? <Button label="無効化する" disabled={busy || dirty} onPress={() => void save('archived')} /> : null}{selected?.status === 'published' ? <Button label="プロフィールを見る" disabled={busy || dirty} onPress={() => router.push(editorialGuideRoute(selected.id))} /> : null}</View></View></>}</Screen>;
}
function Button({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) { return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress} style={[styles.button, disabled && styles.disabled]}><AppText style={styles.buttonText}>{label}</AppText></Pressable>; }
function Field({ label, value, onChange, disabled, multiline }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; multiline?: boolean }) { return <View style={styles.field}><AppText style={styles.label}>{label}</AppText><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} editable={!disabled} multiline={multiline} style={[styles.input, multiline && styles.multiline]} /></View>; }
const styles = StyleSheet.create({ page: { width: '100%', maxWidth: 880, alignSelf: 'center', padding: 22, gap: 18 }, title: { fontFamily: fonts.serif, fontSize: 28, lineHeight: 42 }, note: { color: colors.muted, fontSize: 13, lineHeight: 25 }, panel: { gap: 18, padding: 20, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.line, borderRadius: 10 }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, field: { gap: 8 }, label: { fontSize: 14, fontWeight: '700' }, input: { minHeight: 48, borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 12, color: colors.ink, fontSize: 16, lineHeight: 26 }, multiline: { minHeight: 120 }, button: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 8, backgroundColor: colors.surface }, buttonText: { fontSize: 13, lineHeight: 22, color: colors.ink }, selected: { borderColor: colors.gold, backgroundColor: '#EFE6D4' }, disabled: { opacity: 0.45 }, error: { color: '#9B332D', fontSize: 14, lineHeight: 25 }, notice: { color: '#3E6144', fontSize: 14, lineHeight: 25 } });
