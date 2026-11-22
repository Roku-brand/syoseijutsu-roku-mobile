import { useEffect, useRef, useState } from 'react';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AppText } from './ui';
import { ownerCmsStyles as styles } from './owner-cms.styles';

const rowHeight = 44;

export function CmsWheel({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: readonly (readonly [string, string])[];
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const initialIndex = Math.max(0, options.findIndex(([id]) => id === value));

  return <View style={styles.field}>
    <AppText variant="label">{label}</AppText>
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ expanded: open }}
      disabled={!options.length} onPress={() => setOpen(true)} style={[styles.input, wheelStyles.trigger]}>
      <AppText style={styles.buttonText}>{options.find(([id]) => id === value)?.[1] ?? (options.length ? '選択してください' : '候補なし')}</AppText>
      <AppText aria-hidden style={styles.muted}>⌄</AppText>
    </Pressable>
    {open ? <WheelDialog label={label} initialIndex={initialIndex} options={options} onClose={() => setOpen(false)}
      onSelect={(id) => { setOpen(false); if (id !== value) onChange(id); }} /> : null}
  </View>;
}

function WheelDialog({ label, initialIndex, options, onClose, onSelect }: {
  label: string;
  initialIndex: number;
  options: readonly (readonly [string, string])[];
  onClose: () => void;
  onSelect: (id: string) => void;
}) {
  const scroll = useRef<ScrollView>(null);
  const initialPositionSet = useRef(false);
  const settle = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => () => clearTimeout(settle.current), []);

  return <Modal transparent animationType="fade" onRequestClose={onClose}>
    <View style={wheelStyles.backdrop}>
      <View accessibilityViewIsModal role="dialog" accessibilityLabel={label} style={wheelStyles.dialog}>
        <AppText style={styles.sectionTitle}>{label}</AppText>
        <View style={wheelStyles.viewport}>
          <View pointerEvents="none" style={wheelStyles.selection} />
          <ScrollView ref={scroll} testID="owner-cms-wheel-options" showsVerticalScrollIndicator={false} snapToInterval={rowHeight} decelerationRate="fast"
            keyboardShouldPersistTaps="handled" scrollEventThrottle={16} contentContainerStyle={wheelStyles.options}
            onContentSizeChange={() => {
              if (initialPositionSet.current) return;
              initialPositionSet.current = true;
              scroll.current?.scrollTo({ y: initialIndex * rowHeight, animated: false });
            }}
            onScroll={(event) => {
              const y = event.nativeEvent.contentOffset.y;
              const next = Math.max(0, Math.min(options.length - 1, Math.round(y / rowHeight)));
              setIndex(next);
              if (Platform.OS === 'web') {
                clearTimeout(settle.current);
                settle.current = setTimeout(() => {
                  if (Math.abs(y - next * rowHeight) > 0.5) scroll.current?.scrollTo({ y: next * rowHeight, animated: false });
                }, 120);
              }
            }}>
            {options.map(([id, title], optionIndex) => <Pressable key={id} accessibilityRole="button"
              accessibilityState={{ selected: optionIndex === index }} aria-pressed={optionIndex === index}
              onPress={() => onSelect(id)} style={wheelStyles.option}>
              <AppText numberOfLines={1} style={optionIndex === index ? styles.buttonText : styles.muted}>{title}</AppText>
            </Pressable>)}
          </ScrollView>
        </View>
        <View style={styles.saveActions}>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.button}><AppText style={styles.buttonText}>キャンセル</AppText></Pressable>
          <Pressable accessibilityRole="button" onPress={() => onSelect(options[index][0])} style={[styles.button, styles.buttonPrimary]}><AppText style={[styles.buttonText, styles.buttonTextPrimary]}>選択</AppText></Pressable>
        </View>
      </View>
    </View>
  </Modal>;
}

const wheelStyles = StyleSheet.create({
  trigger: { alignSelf: 'flex-start', minWidth: 180, maxWidth: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  backdrop: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16, backgroundColor: 'rgba(32,35,39,0.44)' },
  dialog: { width: '100%', maxWidth: 340, padding: 16, gap: 12, borderRadius: 10, backgroundColor: '#FFFFFF' },
  viewport: { height: rowHeight * 3, overflow: 'hidden' },
  selection: { position: 'absolute', top: rowHeight, left: 0, right: 0, height: rowHeight, borderRadius: 5, backgroundColor: '#ECEFF1' },
  options: { paddingVertical: rowHeight },
  option: { height: rowHeight, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8 },
});
