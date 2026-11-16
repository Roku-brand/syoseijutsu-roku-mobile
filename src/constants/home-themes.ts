export const HOME_THEME_STORAGE_KEY = '@shoseijutsu-roku/home-background/v1';
export const homeThemes = [
  { id: 'moon-maple', name: '月夜と紅葉', description: '墨緑に浮かぶ満月と、深まる紅葉。', background: '#091F1D', image: require('../../assets/home/themes/moon-maple.webp') },
  { id: 'plum', name: '春の梅', description: '深緑に白梅がほころぶ、春の気配。', background: '#112B26', image: require('../../assets/home/themes/plum.webp') },
  { id: 'seigaiha', name: '青海波', description: '墨紺に古金の波が連なる、静かな海。', background: '#101F30', image: require('../../assets/home/themes/seigaiha.webp') },
  { id: 'wisteria', name: '藤の余韻', description: '深紫に藤が揺れる、穏やかな夕べ。', background: '#251E31', image: require('../../assets/home/themes/wisteria.webp') },
] as const;
export type HomeThemeId = typeof homeThemes[number]['id'];
export const defaultHomeTheme = homeThemes[0];
export const findHomeTheme = (id: unknown) => homeThemes.find(theme => theme.id === id) ?? defaultHomeTheme;
