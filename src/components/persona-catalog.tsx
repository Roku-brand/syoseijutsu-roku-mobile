import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { isFreePersona } from '@/access/access-config';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories, categoryMeta, categoryOrder } from '@/data/catalog';
import type { CatalogCategory, CategoryKey } from '@/data/types';
import { AccessBadge } from './access-badge';
import { AppText } from './ui';

export type PersonaFilterKey = 'all' | CategoryKey;

export type PersonaEntry = {
  category: CatalogCategory;
  persona: CatalogCategory['subcategories'][number];
};

export function getPersonaCount() {
  return categories.reduce((total, category) => total + category.subcategories.length, 0);
}

export function getPersonaEntries(filter: PersonaFilterKey): PersonaEntry[] {
  return categories
    .filter((category) => filter === 'all' || category.key === filter)
    .flatMap((category) => category.subcategories.map((persona) => ({ category, persona })));
}

export function getPersonaFilterLabel(filter: PersonaFilterKey) {
  return filter === 'all' ? 'すべて' : categoryMeta[filter].label;
}

export function PersonaFilterBar({ selected, onSelect }: {
  selected: PersonaFilterKey;
  onSelect: (filter: PersonaFilterKey) => void;
}) {
  const options: Array<{ key: PersonaFilterKey; label: string }> = [
    { key: 'all', label: 'すべて' },
    ...categoryOrder.map((key) => ({ key, label: categoryMeta[key].label })),
  ];

  return (
    <ScrollView
      horizontal
      testID="persona-category-filters"
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
    >
      {options.map((option) => {
        const active = option.key === selected;
        return (
          <Pressable
            key={option.key}
            accessibilityRole="button"
            accessibilityLabel={`${option.label}で絞り込む`}
            accessibilityState={{ selected: active }}
            onPress={() => onSelect(option.key)}
            style={({ pressed }) => [styles.filterButton, active && styles.filterButtonActive, pressed && styles.pressed]}
          >
            <AppText style={[styles.filterText, active && styles.filterTextActive]}>{option.label}</AppText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function PersonaCard({ entry, variant, compact, showCategory = false }: {
  entry: PersonaEntry;
  variant: 'rail' | 'grid';
  compact: boolean;
  showCategory?: boolean;
}) {
  const router = useRouter();
  const { isPaid } = useAccess();
  const { category, persona } = entry;
  const locked = !isPaid && !isFreePersona(persona.name);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${persona.name}、${categoryMeta[category.key].label}、${persona.items.length}処世術を開く`}
      onPress={() => router.push({ pathname: '/subcategory/[category]/[name]', params: { category: category.key, name: persona.name } })}
      style={({ pressed }) => [
        styles.personaCard,
        variant === 'rail' ? styles.personaCardRail : styles.personaCardGrid,
        compact && variant === 'rail' && styles.personaCardRailCompact,
        compact && variant === 'grid' && styles.personaCardGridCompact,
        pressed && styles.pressed,
      ]}
    >
      <View accessibilityElementsHidden style={styles.personaIcon}>
        <View style={styles.personaHead} />
        <View style={styles.personaShoulders} />
      </View>
      {showCategory ? <AppText style={styles.personaCategory}>{categoryMeta[category.key].label}</AppText> : null}
      <AppText numberOfLines={2} style={styles.personaTitle}>{persona.name}</AppText>
      <View style={styles.personaFooter}>
        <AppText style={styles.personaTechniqueCount}>{persona.items.length}処世術</AppText>
        <AppText accessibilityElementsHidden style={styles.personaArrow}>›</AppText>
      </View>
      {locked ? <View style={styles.accessBadge}><AccessBadge locked compact /></View> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filterRow: { minWidth: '100%', justifyContent: 'center', gap: 14, paddingHorizontal: 2, paddingVertical: 2 },
  filterButton: { width: 150, minHeight: 40, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.72)', alignItems: 'center', justifyContent: 'center' },
  filterButtonActive: { borderColor: colors.charcoal, backgroundColor: colors.charcoal },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600', letterSpacing: 0.6 },
  filterTextActive: { color: colors.goldLight },
  personaCard: { position: 'relative', minWidth: 0, minHeight: 184, paddingTop: 24, paddingHorizontal: 13, paddingBottom: 14, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.7)', alignItems: 'center', justifyContent: 'flex-start' },
  personaCardRail: { width: 190, height: 184, flexShrink: 0 },
  personaCardRailCompact: { width: 164, height: 176, minHeight: 176, paddingHorizontal: 10 },
  personaCardGrid: { width: 214, height: 204, flexGrow: 0, flexShrink: 0 },
  personaCardGridCompact: { width: '48%', flexBasis: '48%', maxWidth: '48%', height: 194, minHeight: 194, paddingHorizontal: 9 },
  personaIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' },
  personaHead: { width: 10, height: 10, borderWidth: 1.2, borderColor: colors.inkSoft, borderRadius: 5, marginBottom: 4 },
  personaShoulders: { width: 21, height: 11, borderTopWidth: 1.2, borderLeftWidth: 1.2, borderRightWidth: 1.2, borderColor: colors.inkSoft, borderTopLeftRadius: 11, borderTopRightRadius: 11 },
  personaCategory: { marginTop: 10, color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },
  personaTitle: { minHeight: 42, marginTop: 10, color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600', textAlign: 'center' },
  personaFooter: { width: '100%', minHeight: 24, marginTop: 'auto', paddingTop: 7, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  personaTechniqueCount: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 },
  personaArrow: { color: colors.gold, fontSize: 21, lineHeight: 21 },
  accessBadge: { position: 'absolute', right: 9, top: 9, transform: [{ scale: 0.86 }] },
  pressed: { opacity: 0.7 },
});
