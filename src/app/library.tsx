import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { BookScreen, BookTitle, OrnamentHeading } from '@/components/book-ui';
import { TechniqueRow } from '@/components/technique-row';
import { AppText, DetailHeader } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function LibraryScreen() {
  const { savedIds } = useAppState();
  const savedCards = useMemo(
    () => savedIds.map((id) => techniqueById.get(id)).filter(Boolean),
    [savedIds],
  );

  return (
    <BookScreen>
      <DetailHeader title="マイOS" />
      <BookTitle
        title="蔵書"
        subtitle="手元に残した処世術を、必要なときに読み返す。"
      />

      {savedCards.length ? (
        <>
          <OrnamentHeading>保存した処世術　{savedCards.length}</OrnamentHeading>
          {savedCards.map((card) =>
            card ? <TechniqueRow key={card.id} card={card} /> : null,
          )}
        </>
      ) : (
        <View style={styles.emptyLibrary}>
          <View style={styles.emptyMark}>
            <AppText style={styles.emptyMarkText}>冊</AppText>
          </View>
          <AppText style={styles.emptyTitle}>蔵書はまだ空です</AppText>
          <AppText style={styles.emptyBody}>
            リールや処世術カードの「蔵書に保存」から、知恵を一冊ずつ集められます。
          </AppText>
        </View>
      )}
    </BookScreen>
  );
}

const styles = StyleSheet.create({
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
