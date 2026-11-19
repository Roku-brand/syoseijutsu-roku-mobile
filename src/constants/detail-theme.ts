import { StyleSheet } from 'react-native';

import { colors, fonts, radius } from './theme';

export const detailColors = {
  background: '#FBF8F2',
  surface: '#FDFBF7',
  rule: '#DFD7CA',
  accent: '#B28B3A',
} as const;

export const detailStyles = StyleSheet.create({
  screen: { minHeight: 0, backgroundColor: detailColors.background },
  numberRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  number: { color: colors.goldDeep, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, flexShrink: 0 },
  metadata: { flexShrink: 1, minWidth: 0, color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20 },
  title: {
    width: '100%',
    color: '#111311',
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 50,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  rule: { height: 1, marginTop: 18, backgroundColor: detailColors.rule },
  summaryCard: {
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#CBB583',
    shadowColor: '#685433',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 1,
    borderRadius: radius.md,
    backgroundColor: detailColors.surface,
  },
  summaryLabel: { color: colors.goldDeep, fontSize: 13, lineHeight: 19, marginBottom: 11 },
  summaryText: { color: '#141714', fontSize: 17, lineHeight: 32, fontWeight: '600' },
  sectionMark: { width: 4, height: 23, backgroundColor: detailColors.accent },
});
