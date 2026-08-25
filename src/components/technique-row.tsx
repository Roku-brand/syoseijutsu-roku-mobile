import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  categoryPalette,
  colors,
  fonts,
  radius,
  spacing,
} from '@/constants/theme';
import { getTechniqueDisplayId } from '@/data/catalog';
import type { TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';
import { AppText, IconButton } from './ui';
import { useAppToast } from './app-toast';

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
  const showToast = useAppToast();
  const { savedIds, toggleSaved } = useAppState();
  const isSaved = savedIds.includes(card.id);
  const hasSequence = sequence !== undefined;
  const palette = categoryPalette[card.categoryKey];
  const resolvedAccent = accentColor ?? palette.accent;
  const resolvedTint = tintColor ?? palette.tint;
  const openCard = () =>
    router.push({ pathname: '/card/[id]', params: { id: card.id } });

  return (
    <View style={[styles.row, { borderColor: resolvedAccent }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${card.title}を開く`}
        onPress={openCard}
        style={({ pressed }) => [styles.openArea, pressed && styles.pressed]}
      >
        <View style={styles.copy}>
          <View style={styles.metaRow}>
            <AppText variant="label" style={styles.displayId}>
              {getTechniqueDisplayId(card)}
            </AppText>
            {showCategory && (
              <AppText
                variant="label"
                style={[styles.meta, { color: resolvedAccent }]}
              >
                {card.categoryName} · {card.subcategory}
              </AppText>
            )}
          </View>
          {hasSequence && (
            <AppText variant="label" style={styles.sequence}>
              {String(sequence).padStart(2, '0')} / {String(sequenceTotal ?? 0).padStart(2, '0')}
            </AppText>
          )}
          {card.importance ? (
            <AppText variant="label" style={styles.importance}>
              {'★'.repeat(card.importance)}
            </AppText>
          ) : null}
          <AppText style={styles.title}>{card.title}</AppText>
          {card.subtitle && (
            <AppText variant="caption" style={styles.subtitle}>
              {card.subtitle}
            </AppText>
          )}
          {!hasSequence && (card.tags?.length ?? 0) > 0 && (
            <View style={styles.tags}>
              {card.tags!.slice(0, 3).map((tag) => (
                <View key={tag} style={[styles.tag, { backgroundColor: resolvedTint }]}>
                  <AppText variant="caption" style={[styles.tagText, { color: resolvedAccent }]}>
                    #{tag}
                  </AppText>
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
        <View style={styles.actions}>
          <IconButton
            label={isSaved ? '保存を解除' : '保存'}
            icon={isSaved ? '◆' : '◇'}
            active={isSaved}
            onPress={(event) => {
              event.stopPropagation();
              toggleSaved(card.id);
              showToast(isSaved ? '蔵書から外しました' : '蔵書に保存しました');
            }}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${card.title}を開く`}
            onPress={openCard}
            hitSlop={10}
          >
            <AppText style={styles.chevron}>›</AppText>
          </Pressable>
        </View>
    </View>
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
  openArea: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  copy: { flex: 1 },
  timelineRow: {
    minHeight: 164,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderColor: colors.gold,
  },
  sequence: { color: colors.gold, marginBottom: spacing.md, letterSpacing: 0.8 },
  importance: { color: colors.gold, marginBottom: 4, letterSpacing: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 6,
  },
  displayId: {
    color: colors.gold,
    fontSize: 10,
    letterSpacing: 1,
  },
  meta: { color: colors.gold },
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
