import { useRouter } from 'expo-router';
import { Image, type ImageSource } from 'expo-image';
import { useEffect, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { isFreePersona } from '@/access/access-config';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { categories, categoryMeta, categoryOrder } from '@/data/catalog';
import { formatPersonaNumber, getPersonaPresentation } from '@/data/persona-presentation';
import type { CatalogCategory, CategoryKey } from '@/data/types';
import { personaRoute, upgradeRoute } from '@/navigation/app-routes';
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
    .flatMap((category) => category.subcategories.map((persona) => ({ category, persona })))
    .sort((left, right) => (getPersonaPresentation(left.persona.name)?.number ?? 999) - (getPersonaPresentation(right.persona.name)?.number ?? 999));
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
    <ScrollView horizontal testID="persona-category-filters" showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
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

export function PersonaCard({ entry, variant, gridColumns = 2 }: {
  entry: PersonaEntry;
  variant: 'rail' | 'grid';
  compact?: boolean;
  narrow?: boolean;
  showCategory?: boolean;
  gridColumns?: 2 | 3 | 4;
}) {
  const router = useRouter();
  const { isPaid } = useAccess();
  const { category, persona } = entry;
  const presentation = getPersonaPresentation(persona.name);
  const locked = !isPaid && !isFreePersona(persona.name);
  const number = presentation?.number ?? 0;
  // Leave enough room for the 12px grid gap even at a 320px viewport.
  const width = gridColumns === 4 ? '23.8%' : gridColumns === 3 ? '32%' : '47.5%';

  const open = () => {
    if (locked) {
      router.push(upgradeRoute('persona_card'));
      return;
    }
    router.push(personaRoute(category.key, persona.name));
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={locked ? `${persona.name}は完全版で利用できます` : `${persona.name}、${persona.items.length}処世術を開く`}
      onPress={open}
      style={({ pressed }) => [
        styles.personaCard,
        variant === 'rail' ? styles.personaCardRail : { width, flexBasis: width },
        pressed && styles.pressedCard,
      ]}
    >
      <PersonaImage name={persona.name} source={presentation?.image} />
      <View style={styles.cardBody}>
        <View style={styles.titleRow}>
          <AppText style={styles.number}>{number ? formatPersonaNumber(number) : '—'}</AppText>
          <AppText numberOfLines={2} style={styles.personaTitle}>{persona.name}</AppText>
        </View>
        <AppText numberOfLines={3} style={styles.subtitle}>{presentation?.subtitle ?? `${persona.items.length}の処世術から学ぶ方法`}</AppText>
        <AppText accessibilityElementsHidden style={styles.arrow}>›</AppText>
      </View>
      {locked ? <View pointerEvents="none" style={styles.lockedTint} /> : null}
      {locked ? (
        <View pointerEvents="none" style={styles.lockMessage}>
          <LockMark />
          <AppText style={styles.lockText}>無料プランでは{`\n`}ご利用いただけません</AppText>
        </View>
      ) : null}
    </Pressable>
  );
}

function PersonaImage({ name, source }: { name: string; source?: ImageSource }) {
  const hostRef = useRef<any>(null);
  const [visible, setVisible] = useState(Platform.OS !== 'web');

  useEffect(() => {
    if (Platform.OS !== 'web' || visible) return;
    const host = hostRef.current;
    if (!host || typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setVisible(true);
      observer.disconnect();
    }, { rootMargin: '360px 0px' });
    observer.observe(host);
    return () => observer.disconnect();
  }, [visible]);

  return (
    <View ref={hostRef} style={styles.imageFrame}>
      {visible && source ? (
        <Image
          source={source}
          accessibilityLabel={`${name}を象徴する写真`}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={140}
          recyclingKey={name}
          style={styles.image}
        />
      ) : <View style={styles.imageFallback} />}
    </View>
  );
}

function LockMark() {
  return (
    <View style={styles.lockMark} accessibilityElementsHidden>
      <View style={styles.lockShackle} />
      <View style={styles.lockBody}><View style={styles.lockKeyhole} /></View>
    </View>
  );
}

const styles = StyleSheet.create({
  filterRow: { minWidth: '100%', justifyContent: 'center', gap: 8, paddingHorizontal: 1, paddingVertical: 2 },
  filterButton: { minWidth: 78, flexGrow: 1, minHeight: 48, paddingHorizontal: spacing.sm, borderWidth: 1, borderColor: 'transparent', borderRadius: radius.sm, backgroundColor: '#F3EFE7', alignItems: 'center', justifyContent: 'center' },
  filterButtonActive: { backgroundColor: colors.gold },
  filterText: { color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '600', letterSpacing: 0.5 },
  filterTextActive: { color: colors.surface, fontWeight: '700' },
  personaCard: { position: 'relative', minWidth: 0, overflow: 'hidden', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface, ...shadow.card },
  personaCardRail: { width: 260, flexBasis: 260, flexShrink: 0 },
  pressedCard: { opacity: 0.84, transform: [{ translateY: 1 }] },
  imageFrame: { width: '100%', aspectRatio: 1.55, overflow: 'hidden', backgroundColor: colors.paperDeep },
  image: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, backgroundColor: colors.paperDeep },
  cardBody: { position: 'relative', minHeight: 132, paddingLeft: 11, paddingTop: 12, paddingRight: 28, paddingBottom: 13 },
  titleRow: { flexDirection: 'row', alignItems: 'baseline', gap: 7 },
  number: { flexShrink: 0, color: colors.gold, fontFamily: fonts.serif, fontSize: 17, lineHeight: 23, fontWeight: '600', letterSpacing: 0.3 },
  personaTitle: { flex: 1, minWidth: 0, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 21, fontWeight: '700', letterSpacing: 0.1 },
  subtitle: { marginTop: 8, color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  arrow: { position: 'absolute', right: 9, top: 48, color: colors.gold, fontFamily: fonts.serif, fontSize: 27, lineHeight: 30 },
  lockedTint: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(22, 19, 15, 0.30)' },
  lockMessage: { position: 'absolute', top: 0, left: 0, right: 0, aspectRatio: 1.55, alignItems: 'center', justifyContent: 'center', gap: 7 },
  lockText: { color: '#FFF8E9', fontSize: 11, lineHeight: 18, fontWeight: '700', textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  lockMark: { width: 27, height: 31, alignItems: 'center' },
  lockShackle: { width: 17, height: 15, borderWidth: 3, borderBottomWidth: 0, borderColor: '#F4D99D', borderTopLeftRadius: 9, borderTopRightRadius: 9 },
  lockBody: { width: 25, height: 19, borderRadius: 4, backgroundColor: '#F4D99D', alignItems: 'center', justifyContent: 'center' },
  lockKeyhole: { width: 4, height: 7, borderRadius: 2, backgroundColor: '#3A3024' },
  pressed: { opacity: 0.72 },
});
