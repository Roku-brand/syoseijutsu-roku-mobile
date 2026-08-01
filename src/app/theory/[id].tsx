import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getTheoryDisplayId,
  techniqueCards,
  theories,
  theoryById,
} from '@/data/catalog';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { DetailSwipe } from '@/components/detail-swipe';

export function generateStaticParams() {
  return Array.from(theoryById.keys()).map((id) => ({ id }));
}

export default function TheoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theory = theoryById.get(id);
  const { width } = useHydratedWindowDimensions();
  const compact = width < 620;

  if (!theory) {
    return (
      <Screen>
        <DetailHeader title="理論辞典" />
        <EmptyState
          title="理論が見つかりません"
          description="前の画面へ戻り、別の理論を選んでください。"
        />
      </Screen>
    );
  }

  const related = techniqueCards
    .filter((card) => card.theoryTagIds?.includes(theory.tagId))
    .slice(0, 12);
  const explanation =
    theory.summary ??
    theory.definition ??
    `${theory.discipline}に属する${theory.conceptType}です。`;
  const navigateTheory = (offset: -1 | 1) => {
    const currentIndex = theories.findIndex((item) => item.tagId === theory.tagId);
    const next = theories[(currentIndex + offset + theories.length) % theories.length];
    router.replace({ pathname: '/theory/[id]', params: { id: next.tagId } });
  };

  return (
    <Screen contentContainerStyle={styles.screenContent}>
      <DetailHeader title="理論辞典" />
      <DetailSwipe style={styles.readingColumn} onPrevious={() => navigateTheory(-1)} onNext={() => navigateTheory(1)}>
        <View style={[styles.archiveHero, compact && styles.archiveHeroCompact]}>
          <View style={[styles.archiveSpine, compact && styles.archiveSpineCompact]}>
            <AppText style={styles.archiveBook}>冊</AppText>
            <AppText style={styles.archiveLabel}>理{'\n'}論</AppText>
          </View>
          <View style={[styles.archiveCopy, compact && styles.archiveCopyCompact]}>
            <View style={styles.archiveMeta}>
              <AppText variant="label" style={styles.tagId}>
                {getTheoryDisplayId(theory)}
              </AppText>
              <View style={styles.categoryPill}>
                <AppText variant="caption" style={styles.categoryText}>
                  {theory.categoryTitle}
                </AppText>
              </View>
            </View>
            <AppText variant="title" style={styles.title}>
              {theory.title}
            </AppText>
            <View style={styles.archiveRule} />
            <AppText style={styles.summary}>{explanation}</AppText>
          </View>
        </View>

        <TheoryList title="要点" items={theory.keyPoints} tone="default" />
        <TheoryList title="判断原則" items={theory.principles} tone="action" />
        <TheoryList
          title="実践のヒント"
          items={theory.strategies}
          tone="action"
        />
        <TheoryList
          title="適用条件"
          items={theory.applicationConditions}
          tone="default"
        />
        <TheoryList title="注意点" items={theory.pitfalls} tone="caution" />

        {!!theory.domains?.length && (
          <>
            <SectionHeader title="関連領域" />
            <View style={styles.chips}>
              {theory.domains.map((domain) => (
                <View key={domain} style={styles.chip}>
                  <AppText variant="caption" style={styles.chipText}>
                    {domain}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        )}

        {related.length > 0 && (
          <>
            <SectionHeader title="関連する処世術" count={related.length} />
            {related.map((card) => (
              <TechniqueRow key={card.id} card={card} />
            ))}
          </>
        )}

        <SectionHeader title="出自" />
        <View style={styles.origin}>
          <OriginRow label="分類" value={theory.sourceType} />
          <OriginRow label="専門分野" value={theory.discipline} />
          <OriginRow label="形式" value={theory.conceptType} />
          <OriginRow label="出典" value={theory.sourceName} />
          <OriginRow label="所在・由来" value={theory.sourceDetail} />
        </View>

        {theory.notes ? (
          <>
            <SectionHeader title="注記" />
            <View style={styles.note}>
              <AppText>{theory.notes}</AppText>
            </View>
          </>
        ) : null}
      </DetailSwipe>
    </Screen>
  );
}

function OriginRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <View style={styles.originRow}>
      <AppText variant="caption" style={styles.originLabel}>
        {label}
      </AppText>
      <AppText style={styles.originValue}>{value}</AppText>
    </View>
  );
}

function TheoryList({
  title,
  items,
  tone,
}: {
  title: string;
  items?: string[];
  tone: 'default' | 'caution' | 'action';
}) {
  if (!items?.length) return null;
  return (
    <>
      <SectionHeader title={title} />
      <View
        style={[
          styles.list,
          tone === 'caution' && styles.listCaution,
          tone === 'action' && styles.listAction,
        ]}
      >
        {items.map((item, index) => (
          <View key={`${item}-${index}`} style={styles.listRow}>
            <AppText variant="label" style={styles.listIndex}>
              {String(index + 1).padStart(2, '0')}
            </AppText>
            <AppText style={styles.listText}>{item}</AppText>
          </View>
        ))}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  screenContent: { maxWidth: 1180 },
  readingColumn: {
    width: '100%',
    maxWidth: 980,
    alignSelf: 'center',
  },
  archiveHero: {
    minHeight: 260,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderColor: '#4E6276',
    borderRadius: radius.lg,
    backgroundColor: '#EEF0ED',
    overflow: 'hidden',
    shadowColor: '#263544',
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 9 },
    elevation: 4,
  },
  archiveHeroCompact: { minHeight: 236 },
  archiveSpine: {
    width: 94,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 13,
    backgroundColor: '#263544',
    borderRightWidth: 1,
    borderRightColor: colors.gold,
  },
  archiveSpineCompact: { width: 62, gap: 8 },
  archiveBook: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 27,
    lineHeight: 34,
  },
  archiveLabel: {
    color: colors.goldLight,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 2,
  },
  archiveCopy: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xl,
  },
  archiveCopyCompact: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  archiveMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tagId: { color: '#5F6970', fontSize: 10, letterSpacing: 1.1 },
  categoryPill: {
    borderWidth: 1,
    borderColor: '#526577',
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.46)',
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  categoryText: { color: '#34495C', fontSize: 10, lineHeight: 14 },
  title: {
    marginTop: spacing.md,
    color: colors.ink,
    fontSize: 36,
    lineHeight: 49,
  },
  archiveRule: {
    width: 62,
    height: 1,
    marginTop: spacing.md,
    backgroundColor: colors.gold,
  },
  summary: {
    maxWidth: 760,
    marginTop: spacing.md,
    color: '#4F585A',
    fontSize: 17,
    lineHeight: 30,
  },
  origin: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#6C7B88',
    backgroundColor: '#EEF0ED',
    padding: spacing.lg,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(78,98,118,0.18)',
  },
  originLabel: { width: 86, paddingTop: 2, color: '#526577' },
  originValue: { flex: 1, color: colors.inkSoft },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: '#6C7B88',
    borderRadius: radius.pill,
    backgroundColor: '#EEF0ED',
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: { color: '#34495C' },
  note: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: '#EFE3DD',
    padding: spacing.lg,
  },
  list: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#8996A1',
    backgroundColor: '#F4F5F2',
    padding: spacing.lg,
    gap: spacing.md,
  },
  listCaution: { backgroundColor: '#EFE3DD', borderColor: colors.line },
  listAction: { backgroundColor: '#EEF2EE' },
  listRow: { flexDirection: 'row', gap: spacing.md },
  listIndex: { width: 26, paddingTop: 2, color: '#526577' },
  listText: { flex: 1 },
});
