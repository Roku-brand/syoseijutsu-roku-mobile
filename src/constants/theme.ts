import { Platform } from 'react-native';

export const colors = {
  ink: '#151714',
  inkSoft: '#343832',
  paper: '#F4F0E7',
  paperDeep: '#E8E0D1',
  surface: '#FBF8F1',
  surfaceDark: '#242720',
  gold: '#9A7A3E',
  goldLight: '#C6AB70',
  moss: '#4E5B49',
  line: '#D8CFBE',
  muted: '#75786F',
  white: '#FFFFFF',
  danger: '#8E3F39',
  success: '#49624A',
  navInk: '#172019',
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

export const radius = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 6,
  },
};
