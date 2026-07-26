import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText } from '@/components/ui';
import { BookScreen, OrnamentHeading, bookCardShadow } from '@/components/book-ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueCards } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

const today = techniqueCards.find((card) => card.id === 'tech_001') ?? techniqueCards[0];

export default function MainScreen() {
  const router = useRouter();
  const { savedIds, toggleSaved } = useAppState();
  const saved = savedIds.includes(today.id);

  const openCategory = (key: 'interpersonal' | 'work') => {
    void Haptics.selectionAsync().catch(() => undefined);
    router.push({ pathname: '/category/[key]', params: { key } });
  };

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.todayHeading}>
        <AppText style={styles.todayHeadingText}>今日の処世術</AppText>
        <View style={styles.headingOrnament}>
          <View style={styles.headingLine} />
          <View style={styles.headingDiamond} />
          <View style={styles.headingLine} />
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${today.title}を詳しく読む`}
        onPress={() =>
          router.push({ pathname: '/card/[id]', params: { id: today.id } })
        }
        style={({ pressed }) => [
          styles.todayCard,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={styles.todayTitle}>{today.title}</AppText>
        <View style={styles.cardOrnament}>
          <View style={styles.cardLine} />
          <View style={styles.cardDiamond} />
          <View style={styles.cardLine} />
        </View>
        <AppText style={styles.todaySubtitle}>{today.subtitle}</AppText>
        <View style={styles.categoryChip}>
          <AppText style={styles.categoryChipText}>
            {today.categoryName}・{today.subcategory}
          </AppText>
        </View>
      </Pressable>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={saved ? '蔵書から外す' : '蔵書に保存'}
        onPress={() => toggleSaved(today.id)}
        style={({ pressed }) => [
          styles.saveButton,
          saved && styles.saveButtonSaved,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={[styles.bookmark, saved && styles.saveTextSaved]}>
          {saved ? '◆' : '▯'}
        </AppText>
        <AppText style={[styles.saveText, saved && styles.saveTextSaved]}>
          {saved ? '蔵書に保存済み' : '蔵書に保存'}
        </AppText>
      </Pressable>

      <OrnamentHeading centered>いまのあなたに</OrnamentHeading>
      <View style={styles.suggestionRow}>
        <Pressable
          onPress={() => openCategory('interpersonal')}
          style={({ pressed }) => [
            styles.suggestionCard,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.suggestionMark}>対</AppText>
          <AppText style={styles.suggestionTitle}>対人術</AppText>
        </Pressable>
        <Pressable
          onPress={() => openCategory('work')}
          style={({ pressed }) => [
            styles.suggestionCard,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.suggestionMark}>仕</AppText>
          <AppText style={styles.suggestionTitle}>仕事術</AppText>
        </Pressable>
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { paddingTop: spacing.xl, paddingBottom: spacing.xl },
  todayHeading: { alignItems: 'center', marginBottom: spacing.lg },
  todayHeadingText: {
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 34,
    fontWeight: '600',
    letterSpacing: 2.5,
  },
  headingOrnament: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  headingLine: { width: 34, height: 1, backgroundColor: colors.goldLight },
  headingDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  todayCard: {
    width: '100%',
    maxWidth: 680,
    alignSelf: 'center',
    minHeight: 430,
    paddingHorizontal: spacing.xl,
    paddingVertical: 46,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...bookCardShadow,
  },
  todayTitle: {
    fontFamily: fonts.serif,
    fontSize: 34,
    lineHeight: 56,
    fontWeight: '600',
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.ink,
  },
  cardOrnament: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '76%',
    gap: 8,
    marginVertical: spacing.xl,
  },
  cardLine: { flex: 1, height: 1, backgroundColor: colors.goldLight },
  cardDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  todaySubtitle: {
    maxWidth: 520,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 34,
    letterSpacing: 1.2,
    textAlign: 'center',
    color: colors.inkSoft,
  },
  categoryChip: {
    marginTop: spacing.xl,
    minHeight: 38,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: colors.sage,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryChipText: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 20,
    letterSpacing: 1.2,
    color: colors.inkSoft,
  },
  saveButton: {
    alignSelf: 'center',
    minWidth: 230,
    minHeight: 58,
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: colors.surface,
  },
  saveButtonSaved: { backgroundColor: colors.charcoal },
  bookmark: { color: colors.gold, fontSize: 24, lineHeight: 28 },
  saveText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 1.5,
  },
  saveTextSaved: { color: colors.goldLight },
  suggestionRow: { flexDirection: 'row', gap: spacing.md },
  suggestionCard: {
    flex: 1,
    minHeight: 150,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.52)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  suggestionMark: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.gold,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 46,
    textAlign: 'center',
  },
  suggestionTitle: {
    fontFamily: fonts.serif,
    fontSize: 21,
    lineHeight: 28,
    fontWeight: '600',
    letterSpacing: 2,
  },
  pressed: { opacity: 0.68, transform: [{ scale: 0.994 }] },
});
