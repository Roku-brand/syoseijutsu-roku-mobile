import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, Screen } from '@/components/ui';
import { colors, fonts } from '@/constants/theme';
import { homeThemes } from '@/constants/home-themes';
import { useHomeAppearance } from '@/state/home-appearance';
import { useReducedMotion } from '@/hooks/use-reduced-motion';

export default function BackgroundSettingsScreen() {
  const { theme, selectTheme, storageError } = useHomeAppearance();
  const reduced = useReducedMotion();
  return <Screen contentContainerStyle={styles.content}>
    <AppText variant="serif" accessibilityRole="header" style={styles.title}>日々の知恵に、季節の余韻を。</AppText>
    <AppText style={styles.lead}>ホームの背景を、お好みの風景に。{`\n`}いつでもこの画面から変更できます。</AppText>
    <View accessibilityRole="radiogroup" accessibilityLabel="背景テーマ" style={styles.grid}>
      {homeThemes.map(item => {
        const selected = item.id === theme.id;
        return <Pressable key={item.id} testID={`background-theme-${item.id}`} accessibilityRole="radio" accessibilityLabel={item.name} accessibilityState={{ checked: selected }} aria-checked={selected} onPress={() => selectTheme(item.id)} style={({ pressed }) => [styles.option, selected && styles.selected, pressed && styles.pressed]}>
          <View style={[styles.preview, { backgroundColor: item.background }]}>
            <Image source={item.image} contentFit="cover" contentPosition="top" transition={reduced ? 0 : 180} style={StyleSheet.absoluteFill} accessibilityElementsHidden />
            <View style={styles.previewCard}><View style={styles.previewRule} /><View style={styles.previewLine} /><View style={[styles.previewLine, { width: '58%' }]} /></View>
            <View style={[styles.check, selected && styles.checkSelected]}>{selected ? <AppText style={styles.checkText}>✓</AppText> : null}</View>
          </View>
          <View style={styles.copy}><View style={styles.nameRow}><AppText variant="serif" style={styles.name}>{item.name}</AppText>{selected ? <AppText style={styles.selectedText}>選択中</AppText> : null}</View><AppText style={styles.description}>{item.description}</AppText></View>
        </Pressable>;
      })}
    </View>
    <AppText accessibilityLiveRegion="polite" style={[styles.note, storageError && styles.error]}>{storageError ? '設定を保存できませんでした。使いたい背景をもう一度タップしてください。' : `現在の背景：${theme.name}。この端末に自動で保存されます。`}</AppText>
  </Screen>;
}
const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 760, alignSelf: 'center', paddingHorizontal: 18, paddingTop: 24, paddingBottom: 60 },
  title: { color: colors.ink, fontSize: 23, lineHeight: 34, fontWeight: '600' },
  lead: { marginTop: 8, marginBottom: 22, color: colors.muted, fontSize: 13, lineHeight: 23 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  option: { width: '47.8%', flexGrow: 1, minWidth: 126, overflow: 'hidden', borderRadius: 16, borderWidth: 2, borderColor: colors.line, backgroundColor: colors.surface },
  selected: { borderColor: colors.gold }, pressed: { opacity: .84, transform: [{ scale: .985 }] },
  preview: { height: 162, overflow: 'hidden' }, previewCard: { position: 'absolute', left: '14%', right: '14%', top: 79, height: 104, borderRadius: 9, borderWidth: 1, borderColor: '#E4D9C5', backgroundColor: '#FFFDF5', padding: 13, gap: 8, transform: [{ rotate: '-3deg' }] },
  previewRule: { width: 28, height: 6, borderRadius: 3, backgroundColor: '#BFA06A' }, previewLine: { width: '83%', height: 4, borderRadius: 2, backgroundColor: '#E6DDCF' },
  check: { position: 'absolute', top: 10, right: 10, width: 25, height: 25, borderRadius: 13, borderWidth: 1, borderColor: '#D0B478', backgroundColor: 'rgba(5,20,19,.5)', alignItems: 'center', justifyContent: 'center' }, checkSelected: { backgroundColor: colors.gold }, checkText: { color: colors.white, fontSize: 16, lineHeight: 20, fontWeight: '700' },
  copy: { padding: 11, minHeight: 98 }, nameRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 }, name: { color: colors.ink, fontSize: 17, lineHeight: 25, fontWeight: '600' }, selectedText: { color: colors.goldDeep, fontSize: 10, fontWeight: '600' }, description: { marginTop: 5, color: colors.muted, fontFamily: fonts.sans, fontSize: 12, lineHeight: 20 }, note: { marginTop: 20, color: colors.muted, fontSize: 12, lineHeight: 22 }, error: { color: colors.danger },
});
