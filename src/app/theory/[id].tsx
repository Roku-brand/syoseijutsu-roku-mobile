import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, radius, spacing } from '@/constants/theme';
import { techniqueCards, theoryById } from '@/data/catalog';

export function generateStaticParams() {
  return Array.from(theoryById.keys()).map((id) => ({ id }));
}

export default function TheoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theory = theoryById.get(id);

  if (!theory) {
    return (
      <Screen>
        <DetailHeader />
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

  return (
    <Screen>
      <DetailHeader />
      <View style={styles.readingColumn}>
        <View style={styles.eyebrow}>
          <AppText variant="caption" style={styles.breadcrumb}>
            理論辞典　/　{theory.categoryTitle}
          </AppText>
          <AppText variant="label" style={styles.tagId}>
            {theory.tagId}
          </AppText>
        </View>

        <AppText variant="title" style={styles.title}>
          {theory.title}
        </AppText>

        <View style={styles.explanation}>
          <AppText variant="label" style={styles.explanationLabel}>
            解説
          </AppText>
          <AppText style={styles.summary}>{explanation}</AppText>
        </View>

        <TheoryList title="要点" items={theory.keyPoints} tone="default" />
        <TheoryList title="判断原則" items={theory.principles} tone="action" />
        <TheoryList title="実践のヒント" items={theory.strategies} tone="action" />
        <TheoryList
          title="適用条件"
          items={theory.applicationConditions}
          tone="default"
        />
        <TheoryList title="注意点" items={theory.pitfalls} tone="caution" />

        {!!theory.domains?.length && (
          <>
            <SectionHeader title="使える場面" />
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
          <OriginRow label="確認状態" value={theory.reliability} />
        </View>

        {theory.notes && (
          <>
            <SectionHeader title="注記" />
            <View style={styles.note}>
              <AppText>{theory.notes}</AppText>
            </View>
          </>
        )}
      </View>
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
  readingColumn: {
    width: '100%',
    maxWidth: 900,
    alignSelf: 'center',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  breadcrumb: { color: colors.muted },
  tagId: {
    color: colors.gold,
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  title: { marginTop: spacing.xl, fontSize: 38, lineHeight: 52 },
  explanation: {
    marginTop: spacing.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  explanationLabel: {
    color: colors.gold,
    marginBottom: spacing.sm,
  },
  summary: { color: colors.inkSoft, fontSize: 18, lineHeight: 32 },
  origin: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
    padding: spacing.lg,
    gap: 0,
    shadowColor: '#2B241A',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  originLabel: {
    color: colors.gold,
    width: 86,
    paddingTop: 2,
  },
  originValue: {
    color: colors.inkSoft,
    flex: 1,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: radius.pill,
    backgroundColor: colors.white,
    paddingHorizontal: 13,
    paddingVertical: 7,
  },
  chipText: { color: colors.gold },
  note: {
    backgroundColor: '#EFE3DD',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.lg,
  },
  list: {
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.goldLight,
    padding: spacing.lg,
    gap: spacing.md,
  },
  listCaution: { backgroundColor: '#EFE3DD' },
  listAction: { backgroundColor: '#F4F6F1' },
  listRow: { flexDirection: 'row', gap: spacing.md },
  listIndex: { color: colors.gold, width: 26, paddingTop: 2 },
  listText: { flex: 1 },
});
