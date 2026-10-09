import { Platform, StyleSheet, Text, View, type TextStyle } from 'react-native';

// Keep words intact and retain the separator on the preceding line. Longer
// lists use the most balanced word boundary so mobile labels need only two lines.
export function getCategoryLabelParts(label: string): string[] {
  const words = label.match(/[^・]+・?/g) ?? [label];
  if (words.length <= 2) return words;
  const boundaries = words.slice(1).map((_, index) => [words.slice(0, index + 1).join(''), words.slice(index + 1).join('')]);
  return boundaries.sort((a, b) => Math.max(...a.map(part => part.length)) - Math.max(...b.map(part => part.length)))[0];
}

export function CategoryFilterLabel({ label, style, stacked = false }: {
  label: string;
  style: TextStyle;
  stacked?: boolean;
}) {
  return <View style={[styles.label, stacked && styles.stacked]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    {getCategoryLabelParts(label).map((part,index) => <Text key={index} style={[style, styles.word]}>{part}</Text>)}
  </View>;
}

const styles = StyleSheet.create({
  label: { minWidth: 0, maxWidth: '100%', flexShrink: 1, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center' },
  stacked: { width: '100%', height: 34, flexDirection: 'column', flexWrap: 'nowrap' },
  word: { flexShrink: 0, ...Platform.select({ web: { whiteSpace: 'nowrap' as const }, default: {} }) },
});
