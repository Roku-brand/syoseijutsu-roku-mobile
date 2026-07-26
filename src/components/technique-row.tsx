import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { AppText, IconButton } from './ui';

export function TechniqueRow({
  card,
  showCategory = true,
  sequence,
  sequenceTotal,
}: {
  card: TechniqueCard;
  showCategory?: boolean;
  sequence?: number;
  sequenceTotal?: number;
}) {
  const { savedIds, toggleSaved } = useAppState();
  const isSaved = savedIds.includes(card.id);
  const hasSequence = sequence !== undefined;

  return (
    <Link href={{ pathname: '/card/[id]', params: { id: card.id } }} asChild>
      <Pressable
        style={({ pressed }) => [
          styles.row,
          hasSequence && styles.timelineRow,
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
            <AppText variant="label" style={styles.meta}>
              {card.categoryName} · {card.subcategory}
            </AppText>
          )}
          <AppText style={styles.title}>{card.title}</AppText>
          {card.subtitle && (
            <AppText variant="caption" style={styles.subtitle} numberOfLines={2}>
              {card.subtitle}
            </AppText>
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
          {hasSequence && <AppText style={styles.chevron}>›</AppText>}
        </View>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    marginBottom: 12,
  },
  pressed: { opacity: 0.68 },
  copy: { flex: 1 },
  timelineRow: {
    minHeight: 164,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderColor: '#C69B4C',
    shadowColor: '#2B241A',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  sequence: { color: colors.gold, marginBottom: spacing.md, letterSpacing: 0.8 },
  meta: { color: colors.gold, marginBottom: 6 },
  title: {
    fontFamily: fonts.serif,
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 27,
  },
  subtitle: { marginTop: 8, lineHeight: 19 },
  actions: { alignItems: 'center', gap: spacing.md },
  chevron: { color: colors.gold, fontSize: 34, lineHeight: 34, marginRight: -4 },
});
