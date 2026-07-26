import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, BrandMark, Pill } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import { categoryMeta, categoryOrder, techniqueCards } from '@/data/catalog';
import type { CategoryKey, TechniqueCard } from '@/data/types';
import { useAppState } from '@/state/app-state';

const principles = [
  {
    number: '01',
    title: '処世術は好かれない',
    note: 'メタ発言抑制',
    body: '処世術は“使うもの”であって、“語るもの”ではない。',
  },
  {
    number: '02',
    title: '処世術は万能ではない',
    note: 'コンテクスト依存性',
    body: '同じ戦術でも人・場・力関係・時間軸が変われば結果は反転する。',
  },
  {
    number: '03',
    title: '処世術は人格の代替ではない',
    note: '行動分離原則',
    body: '処世術は人格を作るものではない。人格を守るための道具である。',
  },
  {
    number: '04',
    title: '処世術は知識ではない',
    note: '実践優先',
    body: '知っているだけでは意味がない。現場で使えて初めて“術”になる。',
  },
  {
    number: '05',
    title: '処世術は目的ではない',
    note: '手段従属',
    body: '処世術は手段であって目的ではない。目的がないと空回りする。',
  },
];

export default function MainScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { savedIds, toggleSaved } = useAppState();
  const reelRef = useRef<FlatList<TechniqueCard>>(null);
  const cardWidth = Math.max(280, Math.min(760, width - spacing.lg * 2));
  const reelCards = useMemo(
    () =>
      [...techniqueCards].sort(
        (a, b) =>
          categoryOrder.indexOf(a.categoryKey) - categoryOrder.indexOf(b.categoryKey) ||
          a.id.localeCompare(b.id),
      ),
    [],
  );

  const jumpTo = (category: CategoryKey) => {
    const index = reelCards.findIndex((card) => card.categoryKey === category);
    if (index < 0) return;
    void Haptics.selectionAsync();
    reelRef.current?.scrollToIndex({ index, animated: true });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
            <View style={styles.header}>
              <BrandMark compact />
              <AppText variant="caption" style={styles.headerLabel}>
                MAIN OS
              </AppText>
            </View>

            <View style={styles.intro}>
              <AppText variant="label" style={styles.eyebrow}>
                基本原則
              </AppText>
              <AppText variant="title">処世術の五原則</AppText>
            </View>

            <View style={styles.principles}>
              {principles.map((principle) => (
                <View key={principle.number} style={styles.principle}>
                  <AppText variant="label" style={styles.principleNumber}>
                    {principle.number}
                  </AppText>
                  <View style={styles.principleCopy}>
                    <AppText variant="serif" style={styles.principleTitle}>
                      {principle.title}
                    </AppText>
                    <AppText variant="caption" style={styles.principleNote}>
                      {principle.note}
                    </AppText>
                    <AppText style={styles.principleBody}>{principle.body}</AppText>
                  </View>
                </View>
              ))}
            </View>

            <View style={styles.mantra}>
              <AppText variant="label" style={styles.mantraText}>
                語るな（可視化の抑制）／信じるな（万能化の抑制）／同一化するな（人格侵食の抑制）／運用せよ（実践優先）／目的に従え（手段従属）
              </AppText>
            </View>

            <View style={styles.reelHeading}>
              <View>
                <AppText variant="label" style={styles.eyebrow}>
                  CARD REEL
                </AppText>
                <AppText variant="title">今日の処世術</AppText>
              </View>
            </View>
            <View style={styles.skipRow}>
              {categoryOrder.map((key) => (
                <Pressable
                  key={key}
                  accessibilityRole="button"
                  accessibilityLabel={`${categoryMeta[key].label}のカードへ移動`}
                  onPress={() => jumpTo(key)}
                  style={({ pressed }) => [styles.skipButton, pressed && styles.pressed]}
                >
                  <AppText variant="label" style={styles.skipText}>
                    {categoryMeta[key].label}
                  </AppText>
                </Pressable>
              ))}
            </View>
            <FlatList
              ref={reelRef}
              horizontal
              data={reelCards}
              keyExtractor={(card) => card.id}
              showsHorizontalScrollIndicator={false}
              snapToInterval={cardWidth + 12}
              decelerationRate="fast"
              contentContainerStyle={styles.reel}
              renderItem={({ item }) => {
                const saved = savedIds.includes(item.id);
                return (
                  <View style={[styles.reelCard, { width: cardWidth }]}>
                    <Pill>{item.categoryName} · {item.subcategory}</Pill>
                    <View>
                      <AppText variant="serif" style={styles.reelTitle}>
                        {item.title}
                      </AppText>
                      <AppText style={styles.reelBody}>{item.subtitle}</AppText>
                    </View>
                    <View style={styles.reelActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={saved ? '保存を解除' : 'マイOSへ保存'}
                        onPress={() => toggleSaved(item.id)}
                        style={({ pressed }) => [styles.saveButton, saved && styles.saveButtonActive, pressed && styles.pressed]}
                      >
                        <AppText variant="label" style={[styles.saveText, saved && styles.saveTextActive]}>
                          {saved ? '保存済み' : '保存'}
                        </AppText>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${item.title}を詳しく読む`}
                        onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                        style={({ pressed }) => [styles.readButton, pressed && styles.pressed]}
                      >
                        <AppText variant="label" style={styles.readText}>詳しく読む ›</AppText>
                      </Pressable>
                    </View>
                  </View>
                );
              }}
            />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.paper },
  content: { paddingBottom: spacing.xl },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLabel: { letterSpacing: 1.8 },
  intro: { paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  eyebrow: { color: colors.gold, marginBottom: spacing.xs },
  principles: { marginTop: spacing.lg, paddingHorizontal: spacing.lg, gap: 10 },
  principle: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  principleNumber: { color: colors.gold, width: 24 },
  principleCopy: { flex: 1 },
  principleTitle: { fontSize: 17, lineHeight: 24 },
  principleNote: { marginTop: 2, color: colors.gold },
  principleBody: { marginTop: spacing.sm, color: colors.inkSoft },
  mantra: {
    margin: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.ink,
  },
  mantraText: { color: colors.goldLight, textAlign: 'center', lineHeight: 22 },
  reelHeading: { paddingHorizontal: spacing.lg, marginTop: spacing.sm },
  skipRow: { flexDirection: 'row', gap: 8, paddingHorizontal: spacing.lg, marginTop: spacing.md },
  skipButton: {
    flex: 1,
    minHeight: 38,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  skipText: { color: colors.inkSoft, fontSize: 10 },
  reel: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: 12 },
  reelCard: {
    minHeight: 332,
    borderRadius: radius.lg,
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: spacing.lg,
    justifyContent: 'space-between',
    shadowColor: '#2B241A',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  reelTitle: { marginTop: spacing.xl, fontSize: 25, lineHeight: 40 },
  reelBody: { marginTop: spacing.md, color: colors.inkSoft },
  reelActions: { flexDirection: 'row', gap: 10 },
  saveButton: {
    minHeight: 44,
    borderRadius: radius.pill,
    paddingHorizontal: 16,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.ink,
  },
  saveButtonActive: { backgroundColor: colors.ink },
  saveText: { color: colors.ink },
  saveTextActive: { color: colors.paper },
  readButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readText: { color: colors.paper },
  pressed: { opacity: 0.65, transform: [{ scale: 0.99 }] },
});
