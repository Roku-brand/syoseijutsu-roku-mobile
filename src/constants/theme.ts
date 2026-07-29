import { Platform } from 'react-native';

export const colors = {
  ink: '#1C2024',
  inkSoft: '#3F423F',
  paper: '#F7F2E8',
  paperDeep: '#EEE6D8',
  surface: '#FCFAF5',
  surfaceDark: '#242720',
  gold: '#A7833D',
  goldLight: '#D2B66F',
  moss: '#4E5B49',
  line: '#D8CEBD',
  muted: '#77776F',
  white: '#FFFFFF',
  danger: '#8E3F39',
  success: '#49624A',
  navInk: '#1D1F1E',
  sage: '#E7EEDF',
  charcoal: '#1A1B1A',
} as const;

export const categoryPalette = {
  interpersonal: {
    accent: '#566A82',
    tint: '#EEF2F6',
    soft: '#DDE5ED',
  },
  work: {
    accent: '#A07135',
    tint: '#F6F0E6',
    soft: '#EADCC7',
  },
  life: {
    accent: '#5F7868',
    tint: '#EDF3EE',
    soft: '#DCE8DF',
  },
} as const;

export const fonts = {
  serif: Platform.select({
    ios: 'Hiragino Mincho ProN',
    android: 'serif',
    web: '"Yu Mincho", "Hiragino Mincho ProN", serif',
    default: 'serif',
  }),
  sans: Platform.select({
    ios: 'Hiragino Sans',
    android: 'sans-serif',
    web: '"Hiragino Sans", "Yu Gothic", sans-serif',
    default: 'sans-serif',
  }),
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  section: 64,
} as const;

export const layout = {
  bottomNavHeight: 76,
  bottomNavOuterSpacing: 24,
  bottomContentInset: 152,
  readingWidth: 1120,
} as const;

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#4C4232',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.11,
    shadowRadius: 18,
    elevation: 5,
  },
};
