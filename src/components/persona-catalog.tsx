import { Link } from 'expo-router';
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
            aria-selected={active}
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

export function PersonaCard({ entry, variant, compact, narrow = false, showCategory = false }: {
  entry: PersonaEntry;
  variant: 'rail' | 'grid';
  compact: boolean;
  narrow?: boolean;
  showCategory?: boolean;
}) {
  const { isPaid } = useAccess();
  const { category, persona } = entry;
  const locked = !isPaid && !isFreePersona(persona.name);
  const cardStyle = StyleSheet.flatten([
    styles.personaCard,
    variant === 'rail' ? styles.personaCardRail : styles.personaCardGrid,
    compact && variant === 'rail' && styles.personaCardRailCompact,
    compact && variant === 'grid' && styles.personaCardGridCompact,
    narrow && variant === 'grid' && styles.personaCardGridNarrow,
  ]);

  return (
    <Link href={{ pathname: '/subcategory/[category]/[name]', params: { category: category.key, name: persona.name } }} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`${persona.name}、${categoryMeta[category.key].label}、${persona.items.length}処世術を開く`}
        style={cardStyle}
      >
        <View accessibilityElementsHidden style={[styles.personaIcon, narrow && styles.personaIconNarrow]}>
          <View style={styles.personaHead} />
          <View style={styles.personaShoulders} />
        </View>
        {showCategory ? <AppText style={[styles.personaCategory, narrow && styles.personaCategoryNarrow]}>{categoryMeta[category.key].label}</AppText> : null}
        <AppText numberOfLines={2} style={[styles.personaTitle, narrow && styles.personaTitleNarrow]}>{persona.name}</AppText>
        <View style={styles.personaFooter}>
          <AppText style={styles.personaTechniqueCount}>{persona.items.length}処世術</AppText>
          <AppText accessibilityElementsHidden style={styles.personaArrow}>›</AppText>
        </View>
        {locked ? <View style={styles.accessBadge}><AccessBadge locked compact /></View> : null}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  filterRow: { minWidth: '100%', justifyContent: 'center', gap: 14, paddingHorizontal: 2, paddingVertical: 2 },
  filterButton: { width: 190, minHeight: 44, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.72)', alignItems: 'center', justifyContent: 'center' },
  filterButtonActive: { borderColor: colors.charcoal, backgroundColor: colors.charcoal },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 13, lineHeight: 19, fontWeight: '600', letterSpacing: 0.6 },
  filterTextActive: { color: colors.goldLight },
  personaCard: { position: 'relative', minWidth: 0, minHeight: 210, paddingTop: 30, paddingHorizontal: 18, paddingBottom: 17, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: 'rgba(255,253,248,0.82)', alignItems: 'center', justifyContent: 'flex-start' },
  personaCardRail: { width: 238, height: 230, flexShrink: 0 },
  personaCardRailCompact: { width: 174, height: 196, minHeight: 196, paddingTop: 23, paddingHorizontal: 11 },
  personaCardGrid: { width: 224, flexBasis: 224, height: 210, flexGrow: 0, flexShrink: 0 },
  personaCardGridCompact: { width: '48%', flexBasis: '48%', maxWidth: '48%', height: 194, minHeight: 194, paddingHorizontal: 9 },
  personaCardGridNarrow: { width: '100%', flexBasis: '100%', maxWidth: '100%', height: 164, minHeight: 164, paddingTop: 15, paddingBottom: 11 },
  personaIcon: { width: 58, height: 58, borderRadius: 29, backgroundColor: colors.paperDeep, alignItems: 'center', justifyContent: 'center' },
  personaIconNarrow: { width: 48, height: 48, borderRadius: 24 },
  personaHead: { width: 11, height: 11, borderWidth: 1.2, borderColor: colors.inkSoft, borderRadius: 6, marginBottom: 5 },
  personaShoulders: { width: 23, height: 12, borderTopWidth: 1.2, borderLeftWidth: 1.2, borderRightWidth: 1.2, borderColor: colors.inkSoft, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  personaCategory: { marginTop: 10, color: colors.gold, fontSize: 9, lineHeight: 14, fontWeight: '700', letterSpacing: 0.8 },
  personaCategoryNarrow: { marginTop: 5 },
  personaTitle: { minHeight: 48, marginTop: 12, color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 22, fontWeight: '600', textAlign: 'center' },
  personaTitleNarrow: { minHeight: 24, marginTop: 6, fontSize: 16, lineHeight: 23 },
  personaFooter: { width: '100%', minHeight: 26, marginTop: 'auto', paddingTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  personaTechniqueCount: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 11, lineHeight: 17 },
  personaArrow: { color: colors.gold, fontSize: 21, lineHeight: 21 },
  accessBadge: { position: 'absolute', right: 9, top: 9, transform: [{ scale: 0.86 }] },
  pressed: { opacity: 0.7 },
});
