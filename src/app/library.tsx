import { useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen, BookTitle, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, DetailHeader } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, theoryById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function LibraryScreen() {
  const router = useRouter();
  const { savedIds, savedTheoryIds } = useAppState();
  const savedCards = useMemo(
    () => savedIds.map((id) => techniqueById.get(id)).filter(Boolean),
    [savedIds],
  );
  const savedTheories = useMemo(
    () => savedTheoryIds.map((id) => theoryById.get(id)).filter(Boolean),
    [savedTheoryIds],
  );

  return (
    <BookScreen>
      <DetailHeader title="マイOS" />
      <BookTitle
        title="蔵書"
        subtitle="手元に残した処世術を、必要なときに読み返す。"
      />

      {savedCards.length || savedTheories.length ? (
        <>
          {savedCards.length ? (
            <>
              <OrnamentHeading>保存した処世術　{savedCards.length}</OrnamentHeading>
              {savedCards.map((card) =>
                card ? <TechniqueRow key={card.id} card={card} /> : null,
              )}
            </>
          ) : null}
          {savedTheories.length ? (
            <View style={savedCards.length ? styles.theorySection : undefined}>
              <OrnamentHeading>保存した理論　{savedTheories.length}</OrnamentHeading>
              <View style={styles.theoryList}>
                {savedTheories.map((theory) =>
                  theory ? (
                    <Pressable
                      key={theory.tagId}
                      accessibilityRole="button"
                      accessibilityLabel={`${theory.title}を開く`}
                      onPress={() =>
                        router.push({
                          pathname: '/theory/[id]',
                          params: { id: theory.tagId },
                        })
                      }
                      style={({ pressed }) => [styles.theoryRow, pressed && styles.pressed]}
                    >
                      <AppText variant="serif" numberOfLines={2} style={styles.theoryTitle}>
                        {theory.title}
                      </AppText>
                      <AppText style={styles.theoryChevron}>›</AppText>
                    </Pressable>
                  ) : null,
                )}
              </View>
            </View>
          ) : null}
        </>
      ) : (
        <View style={styles.emptyLibrary}>
          <View style={styles.emptyMark}>
            <AppText style={styles.emptyMarkText}>冊</AppText>
          </View>
          <AppText style={styles.emptyTitle}>蔵書はまだ空です</AppText>
          <AppText style={styles.emptyBody}>
            処世術カードや理論カードの「保存」から、知恵を一冊ずつ集められます。
          </AppText>
        </View>
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  theorySection: { marginTop: spacing.xl },
  theoryList: { borderTopWidth: 1, borderTopColor: colors.line },
  theoryRow: {
    minHeight: 62,
    paddingVertical: 13,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  theoryTitle: { flex: 1, color: colors.ink, fontSize: 18, lineHeight: 26, fontWeight: '600' },
  theoryChevron: { color: colors.gold, fontSize: 26, lineHeight: 28 },
  pressed: { opacity: 0.58 },
  emptyLibrary: {
    minHeight: 280,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyMark: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  emptyMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 28,
  },
  emptyTitle: {
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 28,
    fontWeight: '600',
  },
  emptyBody: {
    maxWidth: 420,
    marginTop: spacing.sm,
    color: colors.muted,
    textAlign: 'center',
  },
});
