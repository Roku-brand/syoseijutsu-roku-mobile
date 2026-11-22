import { useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { BookPopup } from './book-popup';
import { catalogTheme, colors, fonts } from '@/constants/theme';
import { discoveryFilters, type DiscoveryFilter } from '@/data/discovery-filter';
import { DiscoveryActionButton } from './discovery-action-button';

export const discoveryFilterColor = (value: DiscoveryFilter) => value === 'all' ? colors.gold : value === 'theory' ? catalogTheme.theory.ink : catalogTheme.categoryBars[value];
const descriptions: Record<DiscoveryFilter, string> = {
  all: '人物像または理論のテーマをおまかせで',
  interpersonal: '人との関わり方を、ひとつの人物像から',
  work: '仕事の進め方を、ひとつの人物像から',
  life: '生き方や考え方を、ひとつの人物像から',
  theory: '心理学など、ひとつのテーマから',
};

export function DiscoveryFilterButton({ value, disabled, dimWhenDisabled = true, onChange, outlined = false }: { value: DiscoveryFilter; disabled: boolean; dimWhenDisabled?: boolean; onChange: (value: DiscoveryFilter) => void; outlined?: boolean }) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(-1);
  const { desktop } = useResponsiveLayout();
  const trigger = useRef<View>(null);
  const choices = useRef<(View | null)[]>([]);
  const close = () => { setOpen(false); setTimeout(() => trigger.current?.focus(), 0); };
  return <>
    <DiscoveryActionButton ref={trigger} testID="home-deck-filter" label={discoveryFilters.find(option => option.key === value)!.label} accessibilityLabel={`デッキの種類：${discoveryFilters.find(option => option.key === value)!.label}`} expanded={open} disabled={disabled} dimWhenDisabled={dimWhenDisabled} variant={outlined ? 'outline' : 'filled'} color={outlined && value === 'all' ? '#C6A15D' : discoveryFilterColor(value)} onPress={() => setOpen(true)} />
    <BookPopup visible={open} compact={!desktop} title="デッキを選ぶ" closeLabel="種類の選択を閉じる" onClose={close} testID="home-deck-filter-popup" onShow={() => choices.current[discoveryFilters.findIndex(option => option.key === value)]?.focus()}>
      {scrollProps => <View style={styles.body} {...(Platform.OS === 'web' ? { onKeyDown: (event: any) => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        const index = choices.current.findIndex(node => node === event.target);
        if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
          event.preventDefault();
          const next = event.key === 'Home' ? 0 : event.key === 'End' ? 4 : (index + (event.key === 'ArrowDown' ? 1 : 4)) % 5;
          choices.current[next]?.focus();
        }
      } } : {})}>
          <Text style={styles.subtitle}>ひとつの人物像やテーマから、毎回5枚を選びます。ホームの先頭で画面を下に引いて離すと、新しいデッキを引けます。</Text>
          <ScrollView {...scrollProps} accessibilityRole="radiogroup" accessibilityLabel="デッキの種類" style={styles.optionsScroll} contentContainerStyle={styles.options} showsVerticalScrollIndicator={false}>
            {discoveryFilters.map((option, index) => <Pressable key={option.key} ref={node => { choices.current[index] = node; }} testID={`home-deck-filter-${option.key}`} accessibilityRole="radio" aria-checked={value === option.key} accessibilityState={{ checked: value === option.key }} onPress={() => { close(); if (value !== option.key) onChange(option.key); }} onFocus={() => setFocused(index)} onBlur={() => setFocused(-1)} style={({ pressed }) => [styles.option, value === option.key && styles.selected, focused === index && styles.focused, pressed && styles.pressed]}>
              <View style={styles.optionCopy}><Text style={styles.optionTitle}>{option.label}</Text><Text style={styles.description}>{descriptions[option.key]}</Text></View>
              <View style={[styles.radio, value === option.key && styles.radioSelected]}>{value === option.key ? <View style={styles.dot} /> : null}</View>
            </Pressable>)}
          </ScrollView>
      </View>}
    </BookPopup>
  </>;
}

const styles = StyleSheet.create({
  body: { flexShrink: 1, padding: 24 },
  subtitle: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, color: colors.muted, marginBottom: 18 }, optionsScroll: { flexShrink: 1 }, options: { gap: 7 },
  option: { minHeight: 64, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: '#EAE4DA', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, selected: { backgroundColor: '#F6F0E3', borderColor: '#BA995C' },
  optionCopy: { flexShrink: 1, marginRight: 8 }, optionTitle: { fontFamily: fonts.serif, fontSize: 17, fontWeight: '600', color: colors.ink }, description: { fontFamily: fonts.sans, fontSize: 12, lineHeight: 20, color: colors.inkSoft, marginTop: 3 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1, borderColor: '#C4BAAB', justifyContent: 'center', alignItems: 'center' }, radioSelected: { borderColor: colors.goldDeep }, dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.goldDeep }, focused: { borderColor: '#987029', borderWidth: 2 }, pressed: { opacity: .8 },
});
