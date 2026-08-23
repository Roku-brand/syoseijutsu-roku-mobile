import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';
import { useAccess } from '@/access/access-state';
import { LockedPreview } from '@/components/locked-preview';
import { isFreePersona } from '@/access/access-config';
import { getTechniqueCount } from '@/data/technique-counts';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

const stageLabels = [
  { label: 'STEP 1', title: 'まずここから' },
  { label: 'STEP 2', title: '土台をつくる' },
  { label: 'STEP 3', title: '場面で使う' },
  { label: 'STEP 4', title: '自分の型にする' },
] as const;

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((persona) => ({ category: category.key, name: persona.name })));
}

function splitIntoStages<T>(items: T[]): T[][] {
  const stageCount = Math.min(stageLabels.length, items.length);
  const baseSize = Math.floor(items.length / stageCount);
  const remainder = items.length % stageCount;
  const stages: T[][] = [];
  let offset = 0;

  for (let index = 0; index < stageCount; index += 1) {
    const size = baseSize + (index < remainder ? 1 : 0);
    stages.push(items.slice(offset, offset + size));
    offset += size;
  }

  return stages;
}

export default function PersonaScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
  const router = useRouter();
  const { isPaid } = useAccess();
  const { width } = useResponsiveLayout();
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);

  if (!category || !persona) {
    return <Screen><EmptyState title="人物像が見つかりません" description="前の画面へ戻って、人物像を選び直してください。" /></Screen>;
  }

  const techniqueCount = getTechniqueCount(category.key, persona.name, persona.items.length);

  if (!isPaid && !isFreePersona(persona.name)) {
    return <Screen><LockedPreview title={persona.name} description="この人物像の処世術は完全版に収録されています。" count={techniqueCount} source="discover_technique" /></Screen>;
  }

  const compact = width < 760;
  const stages = splitIntoStages(persona.items);
  let itemOffset = 0;
  return (
    <Screen scroll={false} contentContainerStyle={[styles.content, compact && styles.contentCompact]}>
      <View style={[styles.page, compact && styles.pageCompact]}>
        <View style={[styles.curriculum, compact && styles.curriculumCompact]}>
          {stages.map((stage, stageIndex) => {
            const stageStart = itemOffset + 1;
            const stageEnd = itemOffset + stage.length;
            itemOffset = stageEnd;
            return (
              <View key={stageLabels[stageIndex].label} style={[styles.stage, compact && styles.stageCompact]}>
                <View style={[styles.stageGuide, compact && styles.stageGuideCompact]}>
                  <AppText style={[styles.stageEyebrow, compact && styles.stageEyebrowCompact]}>{stageLabels[stageIndex].label}</AppText>
                  <AppText variant="serif" style={[styles.stageTitle, compact && styles.stageTitleCompact]}>{stageLabels[stageIndex].title}</AppText>
                  <AppText style={[styles.stageRange, compact && styles.stageRangeCompact]}>
                    {String(stageStart).padStart(2, '0')}—{String(stageEnd).padStart(2, '0')}
                  </AppText>
                </View>
                <View style={styles.stageTrack}>
                  {stage.map((item, index) => {
                    const itemNumber = stageStart + index;
                    return (
                      <Pressable
                        key={item.id}
                        accessibilityRole="link"
                        accessibilityLabel={`${String(itemNumber).padStart(2, '0')} ${item.title}を開く`}
                        onPress={() => router.push({ pathname: '/card/[id]', params: { id: item.id } })}
                        style={({ pressed }) => [
                          styles.techniqueStep,
                          index > 0 && styles.techniqueStepDivided,
                          compact && styles.techniqueStepCompact,
                          pressed && styles.pressed,
                        ]}
                      >
                        <View style={[styles.stepHeader, compact && styles.stepHeaderCompact]}>
                          <View style={[styles.numberBadge, compact && styles.numberBadgeCompact]}>
                            <AppText style={[styles.number, compact && styles.numberCompact]}>{String(itemNumber).padStart(2, '0')}</AppText>
                          </View>
                          {index < stage.length - 1 ? <AppText style={[styles.flowMark, compact && styles.flowMarkCompact]}>→</AppText> : null}
                        </View>
                        <AppText
                          variant="serif"
                          numberOfLines={compact ? 4 : 3}
                          ellipsizeMode="clip"
                          adjustsFontSizeToFit
                          minimumFontScale={compact ? 0.72 : 0.8}
                          style={[styles.rowTitle, compact && styles.rowTitleCompact]}
                        >
                          {item.title}
                        </AppText>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', flexGrow: 1 },
  contentCompact: { paddingBottom: 0 },
  page: { width: '100%', maxWidth: 1440, alignSelf: 'center', flex: 1, minHeight: 0, paddingTop: spacing.sm, paddingBottom: spacing.md },
  pageCompact: { paddingHorizontal: 5, paddingTop: 5, paddingBottom: 6 },
  curriculum: { width: '100%', flex: 1, minHeight: 0, gap: 9 },
  curriculumCompact: { gap: 5 },
  stage: { flex: 1, minHeight: 0, flexDirection: 'row', gap: 10 },
  stageCompact: { gap: 5 },
  stageGuide: {
    width: 132,
    paddingHorizontal: 14,
    paddingVertical: 10,
    justifyContent: 'center',
    borderLeftWidth: 4,
    borderLeftColor: colors.gold,
    borderRadius: radius.sm,
    backgroundColor: colors.paperDeep,
  },
  stageGuideCompact: { width: 58, paddingHorizontal: 5, paddingVertical: 4, borderLeftWidth: 3, borderRadius: 7 },
  stageEyebrow: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 0.8 },
  stageEyebrowCompact: { fontSize: 7, lineHeight: 9, letterSpacing: 0.2 },
  stageTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 21, fontWeight: '700', marginTop: 3 },
  stageTitleCompact: { fontSize: 9, lineHeight: 11, marginTop: 1 },
  stageRange: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10, lineHeight: 14, fontWeight: '700', marginTop: 5 },
  stageRangeCompact: { fontSize: 7, lineHeight: 9, marginTop: 2 },
  stageTrack: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#ddc9a9',
    borderRadius: radius.md,
    backgroundColor: '#fffdf9',
    overflow: 'hidden',
  },
  techniqueStep: { flex: 1, minWidth: 0, paddingHorizontal: 14, paddingVertical: 10, justifyContent: 'center' },
  techniqueStepDivided: { borderLeftWidth: 1, borderLeftColor: colors.line },
  techniqueStepCompact: { paddingHorizontal: 5, paddingVertical: 4 },
  stepHeader: { height: 26, marginBottom: 7, flexDirection: 'row', alignItems: 'center' },
  stepHeaderCompact: { height: 15, marginBottom: 2 },
  numberBadge: { minWidth: 34, height: 24, paddingHorizontal: 8, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.charcoal, flexShrink: 0 },
  numberBadgeCompact: { minWidth: 22, height: 14, paddingHorizontal: 3, borderRadius: 7 },
  number: { color: colors.gold, fontFamily: fonts.sans, fontSize: 10, lineHeight: 13, fontWeight: '800', letterSpacing: 0.6 },
  numberCompact: { fontSize: 7, lineHeight: 8, letterSpacing: 0.1 },
  flowMark: { flex: 1, color: '#c6aa79', textAlign: 'right', fontFamily: fonts.sans, fontSize: 14, lineHeight: 18, fontWeight: '700' },
  flowMarkCompact: { fontSize: 8, lineHeight: 10 },
  rowTitle: { color: colors.ink, fontFamily: fonts.serif, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  rowTitleCompact: { fontSize: 9, lineHeight: 11, letterSpacing: -0.2 },
  pressed: { backgroundColor: '#fff4df' },
});
