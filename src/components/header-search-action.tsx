import { useGlobalSearchParams, usePathname, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';
import { Keyboard, KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { colors, fonts } from '@/constants/theme';
import { SEARCH_MODES, type BrowseMode } from '@/data/search-catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { SearchMark } from './search-mark';
import { AppText } from './ui';

export function HeaderSearchAction({ initialMode = 'techniques', label = '検索', size = 25, color = colors.ink, anchorRef }: {
  initialMode?: BrowseMode; label?: string; size?: number; color?: string; anchorRef?: RefObject<View | null>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useGlobalSearchParams<{ q?: string | string[] }>();
  const { width, height } = useHydratedWindowDimensions();
  const compact = width < 700;
  const trigger = useRef<View>(null);
  const input = useRef<TextInput>(null);
  const restoreTriggerFocus = useRef(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<BrowseMode>(initialMode);
  const [query, setQuery] = useState('');
  const [position, setPosition] = useState({ top: 60, left: 12 });
  const panelWidth = Math.max(0, Math.min(780, width - 24));
  const measurePosition = useCallback(() => {
    (anchorRef?.current ?? trigger.current)?.measureInWindow((x, y, w, h) => {
      setPosition({ top: Math.max(0, Math.min(y + h, height - 190)), left: Math.max(12, Math.min(width - panelWidth - 12, x + (w - panelWidth) / 2)) });
    });
  }, [anchorRef, height, panelWidth, width]);
  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    Keyboard.dismiss();
    restoreTriggerFocus.current = restoreFocus;
  }, []);
  useEffect(() => { close(false); }, [close, pathname]);
  useEffect(() => { if (open) measurePosition(); }, [measurePosition, open]);
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); close(); } };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [close, open]);
  const show = () => {
    setMode(initialMode);
    if (pathname === '/search') setQuery(Array.isArray(params.q) ? params.q[0] ?? '' : params.q ?? '');
    measurePosition(); setOpen(true);
  };
  const submit = () => {
    const trimmed = query.trim();
    if (!trimmed) { input.current?.focus(); return; }
    close(false);
    router.push({ pathname: '/search', params: { q: trimmed, mode } });
  };
  return <>
    <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }} aria-expanded={open} onPress={show} style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}><SearchMark size={size} color={color} /></Pressable>
    <Modal visible={open} transparent animationType="none" onRequestClose={() => close()} onShow={() => input.current?.focus()} onDismiss={() => { if (restoreTriggerFocus.current && Platform.OS === 'web') requestAnimationFrame(() => (trigger.current as unknown as { focus?: () => void })?.focus?.()); }}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable testID="header-search-backdrop" accessible={false} onPress={() => close()} style={styles.backdrop} />
        <View testID="header-search-popup" accessibilityViewIsModal style={[styles.panel, compact && styles.panelCompact, { width: panelWidth, top: position.top, left: position.left }]}>
          <View style={styles.topRow}>
            <View accessibilityRole="tablist" style={styles.tabs}>{SEARCH_MODES.map(item => <Pressable key={item.id} accessibilityRole="tab" accessibilityLabel={item.label} accessibilityState={{ selected: mode === item.id }} aria-selected={mode === item.id} onPress={() => setMode(item.id)} style={[styles.tab, mode === item.id && styles.tabActive]}><AppText style={[styles.tabText, mode === item.id && styles.tabTextActive]}>{item.label}</AppText></Pressable>)}</View>
            <Pressable accessibilityRole="button" accessibilityLabel="検索を閉じる" onPress={() => close()} style={styles.close}><AppText style={styles.closeText}>×</AppText></Pressable>
          </View>
          <View style={styles.form}>
            <TextInput ref={input} autoFocus value={query} onChangeText={setQuery} onSubmitEditing={submit} returnKeyType="search" autoCapitalize="none" autoCorrect={false} accessibilityLabel="キーワードを検索" placeholder="人間関係、仕事、人生…" placeholderTextColor="#AAA79D" style={[styles.input, compact && styles.inputCompact]} />
            <Pressable accessibilityRole="button" accessibilityLabel="検索を実行" onPress={submit} style={[styles.submit, !query.trim() && styles.submitEmpty]}><AppText style={styles.submitText}>検索</AppText></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  trigger: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.65 },
  overlay: { flex: 1 }, backdrop: { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.08)' },
  panel: { position: 'absolute', paddingHorizontal: 26, paddingBottom: 24, paddingTop: 10, backgroundColor: '#25261F', borderBottomWidth: 1, borderBottomColor: colors.gold, elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 18 }, panelCompact: { paddingHorizontal: 16, paddingBottom: 18 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 }, close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginRight: -10 }, closeText: { color: '#D5D3C8', fontSize: 26 },
  tabs: { flex: 1, flexDirection: 'row', gap: 24 }, tab: { minHeight: 40, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: 'transparent' }, tabActive: { borderBottomColor: '#D8B568' }, tabText: { color: '#AAA79D', fontFamily: fonts.serif, fontSize: 14, lineHeight: 22 }, tabTextActive: { color: '#D8B568' },
  form: { flexDirection: 'row', gap: 12, alignItems: 'center' }, input: { flex: 1, minWidth: 0, height: 52, paddingHorizontal: 4, color: '#FFF9EF', fontFamily: fonts.serif, fontSize: 17, borderBottomWidth: 1, borderBottomColor: '#B69A60' }, inputCompact: { fontSize: 16 }, submit: { minHeight: 52, paddingHorizontal: 20, borderWidth: 1, borderColor: '#B69A60', justifyContent: 'center' }, submitEmpty: { opacity: 0.65 }, submitText: { color: '#FFF9EF', fontFamily: fonts.serif, fontSize: 15 },
});
