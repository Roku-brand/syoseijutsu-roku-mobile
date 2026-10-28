import { useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { colors, fonts } from '@/constants/theme';
import { discoveryFilters, type DiscoveryFilter } from '@/data/discovery-filter';

export function DiscoveryFilterButton({ value, disabled, onChange }: { value: DiscoveryFilter; disabled: boolean; onChange: (value: DiscoveryFilter) => void }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const reduced = useReducedMotion();
  const trigger = useRef<View>(null);
  const choices = useRef<(View | null)[]>([]);
  const close = () => { setOpen(false); setTimeout(() => trigger.current?.focus(), 0); };
  return <>
    <Pressable ref={trigger} testID="home-deck-filter" accessibilityRole="button" accessibilityLabel={`デッキの種類：${discoveryFilters.find(option => option.key === value)!.label}`} accessibilityState={{ expanded: open }} disabled={disabled} onPress={() => setOpen(true)} onFocus={() => setFocused(-2)} onBlur={() => setFocused(-1)} style={({ pressed }) => [styles.trigger, focused === -2 && styles.focused, pressed && styles.pressed]}>
      <Text style={styles.triggerText}>{discoveryFilters.find(option => option.key === value)!.label}</Text><Text style={styles.chevron}>⌄</Text>
    </Pressable>
    <Modal transparent visible={open} animationType={reduced ? 'none' : 'fade'} onRequestClose={close} onShow={() => choices.current[discoveryFilters.findIndex(option => option.key === value)]?.focus()}>
      <View style={styles.overlay} {...(Platform.OS === 'web' ? { onKeyDown: (event: any) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        const index = choices.current.findIndex(node => node === event.target);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 4 : (index + (event.key === 'ArrowDown' ? 1 : 4)) % 5;
          choices.current[next]?.focus();
        }
      } } : {})}>
        <Pressable accessibilityLabel="種類の選択を閉じる" accessibilityRole="button" onPress={close} style={StyleSheet.absoluteFill} />
        <View testID="home-deck-filter-popup" accessibilityViewIsModal style={styles.popup}>
          <View style={styles.heading}><Text accessibilityRole="header" style={styles.title}>デッキの種類</Text><Pressable accessibilityRole="button" accessibilityLabel="閉じる" onPress={close} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable></View>
          <Text style={styles.subtitle}>今、出会いたい知識を選ぶ。</Text>
          <ScrollView accessibilityRole="radiogroup" accessibilityLabel="デッキの種類" style={styles.optionsScroll} contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
            {discoveryFilters.map((option, index) => <Pressable key={option.key} ref={node => { choices.current[index] = node; }} testID={`home-deck-filter-${option.key}`} accessibilityRole="radio" accessibilityState={{ checked: value === option.key }} onPress={() => { close(); if (value !== option.key) onChange(option.key); }} onFocus={() => setFocused(index)} onBlur={() => setFocused(-1)} style={({ pressed }) => [styles.option, value === option.key && styles.selected, focused === index && styles.focused, pressed && styles.pressed]}>
              <View><Text style={styles.optionTitle}>{option.label}</Text><Text style={styles.description}>{option.key === 'all' ? '処世術と理論を織り交ぜて' : `5枚すべて${option.label}に`}</Text></View>
              <View style={[styles.radio, value === option.key && styles.radioSelected]}>{value === option.key ? <View style={styles.dot} /> : null}</View>
            </Pressable>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  trigger: { minWidth: 96, minHeight: 44, paddingHorizontal: 14, borderRadius: 24, borderWidth: 1, borderColor: '#CBB891', backgroundColor: '#FFFDF8', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  triggerText: { color: colors.goldDeep, fontFamily: fonts.sans, fontSize: 12, fontWeight: '600' }, chevron: { color: colors.goldDeep, fontSize: 17, marginTop: -4 },
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(37,32,24,.4)', padding: 24 },
  popup: { width: '100%', maxWidth: 352, maxHeight: '100%', backgroundColor: '#FFFDF8', borderRadius: 20, padding: 20, borderWidth: 1, borderColor: '#E4D9C7', shadowColor: '#241C11', shadowOpacity: .18, shadowRadius: 30, shadowOffset: { width: 0, height: 16 }, elevation: 15 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, title: { fontFamily: fonts.serif, fontSize: 22, fontWeight: '600', color: colors.ink },
  close: { width: 44, height: 44, marginRight: -10, alignItems: 'center', justifyContent: 'center' }, closeText: { fontSize: 26, color: colors.muted },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, color: colors.muted, marginBottom: 18 }, optionsScroll: { flexShrink: 1 }, options: { gap: 7 },
  option: { minHeight: 64, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#EAE4DA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selected: { backgroundColor: '#F6F0E3', borderColor: '#BA995C' },
  optionTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '600', color: colors.ink }, description: { fontFamily: fonts.sans, fontSize: 10, lineHeight: 17, color: colors.muted, marginTop: 3 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#C4BAAB', justifyContent: 'center', alignItems: 'center' }, radioSelected: { borderColor: colors.goldDeep }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.goldDeep }, focused: { borderColor: '#987029', borderWidth: 2 }, pressed: { opacity: .8 },
});
