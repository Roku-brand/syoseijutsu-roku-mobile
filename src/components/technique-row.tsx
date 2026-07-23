import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { AppText, IconButton } from './ui';

export function TechniqueRow({
  card,
  showCategory = true,
}: {
  card: TechniqueCard;
  showCategory?: boolean;
}) {
  const { savedIds, toggleSaved } = useAppState();
  const isSaved = savedIds.includes(card.id);

  return (
    <Link href={{ pathname: '/card/[id]', params: { id: card.id } }} asChild>
      <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <View style={styles.copy}>
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
        <IconButton
          label={isSaved ? '保存を解除' : '保存'}
          icon={isSaved ? '◆' : '◇'}
          active={isSaved}
          onPress={(event) => {
            event.stopPropagation();
            toggleSaved(card.id);
          }}
        />
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
  meta: { color: colors.gold, marginBottom: 6 },
  title: {
    fontFamily: fonts.serif,
    fontWeight: '600',
    fontSize: 17,
    lineHeight: 27,
  },
  subtitle: { marginTop: 8, lineHeight: 19 },
});
