import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  categoryPalette,
  colors,
  fonts,
  radius,
  spacing,
} from '@/constants/theme';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { AppText, IconButton } from './ui';

export function TechniqueRow({
  card,
  showCategory = true,
  sequence,
  sequenceTotal,
  accentColor,
  tintColor,
}: {
  card: TechniqueCard;
  showCategory?: boolean;
  sequence?: number;
  sequenceTotal?: number;
  accentColor?: string;
  tintColor?: string;
}) {
  const router = useRouter();
  const { savedIds, toggleSaved } = useAppState();
  const isSaved = savedIds.includes(card.id);
  const hasSequence = sequence !== undefined;
  const palette = categoryPalette[card.categoryKey];
  const resolvedAccent = accentColor ?? palette.accent;
  const resolvedTint = tintColor ?? palette.tint;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title}を開く`}
      onPress={() =>
        router.push({ pathname: '/card/[id]', params: { id: card.id } })
      }
      style={({ pressed }) => [
        styles.row,
        { borderColor: resolvedAccent },
        pressed && styles.pressed,
      ]}
    >
        <View style={styles.copy}>
          {hasSequence && (
            <AppText variant="label" style={styles.sequence}>
              {String(sequence).padStart(2, '0')} / {String(sequenceTotal ?? 0).padStart(2, '0')}
            </AppText>
          )}
          {showCategory && (
            <AppText variant="label" style={[styles.meta, { color: resolvedAccent }]}>
              {card.categoryName} · {card.subcategory}
            </AppText>
          )}
          <AppText style={styles.title}>{card.title}</AppText>
          {card.subtitle && (
            <AppText variant="caption" style={styles.subtitle} numberOfLines={2}>
              {card.subtitle}
            </AppText>
          )}
          {!hasSequence && (card.tags?.length ?? 0) > 0 && (
            <View style={styles.tags}>
              {card.tags!.slice(0, 2).map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: resolvedTint }]}>
                  <AppText variant="caption" style={[styles.tagText, { color: resolvedAccent }]}>
                    #{tag}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </View>
        <View style={styles.actions}>
          <IconButton
            label={isSaved ? '保存を解除' : '保存'}
            icon={isSaved ? '◆' : '◇'}
            active={isSaved}
            onPress={(event) => {
              event.stopPropagation();
              toggleSaved(card.id);
            }}
          />
          <AppText style={styles.chevron}>›</AppText>
        </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 148,
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    shadowColor: '#2B241A',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  pressed: { opacity: 0.68 },
  copy: { flex: 1 },
  timelineRow: {
    minHeight: 164,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderColor: colors.gold,
  },
  sequence: { color: colors.gold, marginBottom: spacing.md, letterSpacing: 0.8 },
  meta: { color: colors.gold, marginBottom: 6 },
  title: {
    fontFamily: fonts.serif,
    fontWeight: '600',
    fontSize: 20,
    lineHeight: 30,
  },
  subtitle: { marginTop: 8, lineHeight: 19 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  tag: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: colors.paper,
  },
  tagText: { color: colors.gold, fontSize: 10, lineHeight: 14 },
  actions: { alignItems: 'center', gap: spacing.md },
  chevron: { color: colors.gold, fontSize: 30, lineHeight: 34, marginRight: -6 },
});
