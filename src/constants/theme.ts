import { Platform } from 'react-native';

export const colors = {
  ink: '#171712',
  inkSoft: '#3D3A32',
  paper: '#FAF9F5',
  paperDeep: '#F1ECE1',
  surface: '#FFFDF8',
  surfaceDark: '#181817',
  gold: '#A57B35',
  goldLight: '#D2A64A',
  goldDeep: '#7D5923',
  goldSoft: '#E7D9C3',
  moss: '#596558',
  line: '#E6DDCE',
  muted: '#77736C',
  white: '#FFFDF8',
  danger: '#8E3F39',
  success: '#49624A',
  navInk: '#FFFDF8',
  sage: '#E7EEDF',
  charcoal: '#171712',
} as const;

export const categoryPalette = {
  interpersonal: {
    accent: '#6B5430',
    tint: '#F6F0E5',
    soft: '#EDE2CF',
  },
  work: {
    accent: '#8A682A',
    tint: '#F7F1E7',
    soft: '#EADCC5',
  },
  life: {
    accent: '#4D4A43',
    tint: '#F3EFE7',
    soft: '#E5DED1',
  },
} as const;

export const fonts = {
  serif: Platform.select({
    ios: 'Hiragino Mincho ProN',
    android: 'serif',
    web: '"Yu Mincho", "Hiragino Mincho ProN", "Hiragino Mincho Pro", "Noto Serif JP", serif',
    default: 'serif',
  }),
  sans: Platform.select({
    ios: 'Hiragino Sans',
    android: 'sans-serif',
    web: '"Yu Gothic", "Hiragino Kaku Gothic ProN", "Noto Sans JP", system-ui, sans-serif',
    default: 'sans-serif',
  }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  section: 40,
} as const;

export const layout = {
  bottomNavHeight: 72,
  bottomNavOuterSpacing: 12,
  bottomContentInset: 112,
  readingWidth: 1040,
} as const;

export const radius = {
  sm: 12,
  md: 18,
  lg: 22,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#6F604A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.045,
    shadowRadius: 10,
    elevation: 1,
  },
};

export const typography = {
  pageTitle: { fontSize: 26, lineHeight: 36, fontWeight: '600' as const },
  largeTitle: { fontSize: 32, lineHeight: 44, fontWeight: '600' as const },
  sectionTitle: { fontSize: 23, lineHeight: 33, fontWeight: '700' as const },
  cardTitle: { fontSize: 17, lineHeight: 25, fontWeight: '600' as const },
  body: { fontSize: 15, lineHeight: 25 },
  caption: { fontSize: 13, lineHeight: 19 },
} as const;

export const border = {
  hairline: 1,
  color: colors.line,
} as const;
