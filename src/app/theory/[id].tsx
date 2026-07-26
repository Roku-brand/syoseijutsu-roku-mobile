import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
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

  return (
    <Screen>
      <DetailHeader title={theory.tagId} />
      <Pill active>{theory.categoryTitle}</Pill>
      <AppText variant="title" style={styles.title}>
        {theory.title}
      </AppText>
      {theory.summary ? (
        <AppText style={styles.summary}>{theory.summary}</AppText>
      ) : (
        <AppText style={styles.summaryFallback}>
          {theory.discipline}に属する{theory.conceptType}
        </AppText>
      )}

      <SectionHeader title="出自" />
      <View style={styles.origin}>
        <OriginRow label="領域" value={theory.sourceType} />
        <OriginRow label="専門分野" value={theory.discipline} />
        <OriginRow label="形式" value={theory.conceptType} />
        <OriginRow label="出典" value={theory.sourceName} />
        <OriginRow label="所在・由来" value={theory.sourceDetail} />
        <OriginRow label="確認状態" value={theory.reliability} />
      </View>

      <TheoryList title="判断原則" items={theory.principles} tone="action" />
      <TheoryList
        title="使える場面"
        items={theory.domains}
        tone="default"
      />

      {theory.notes && (
        <>
          <SectionHeader title="注記" />
          <View style={styles.note}>
            <AppText>{theory.notes}</AppText>
          </View>
        </>
      )}

      <SectionHeader title="この理論に関連する処世術" count={related.length} />
      {related.map((card) => (
        <TechniqueRow key={card.id} card={card} />
      ))}
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
  title: { marginTop: spacing.lg },
  summary: { color: colors.inkSoft, fontSize: 17, lineHeight: 30, marginTop: spacing.md },
  summaryFallback: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 25,
    marginTop: spacing.md,
  },
  origin: {
    backgroundColor: colors.ink,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 14,
  },
  originRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  originLabel: {
    color: colors.goldLight,
    width: 72,
    paddingTop: 2,
  },
  originValue: {
    color: colors.paper,
    flex: 1,
  },
  note: {
    backgroundColor: '#EFE3DD',
    borderRadius: radius.md,
    padding: spacing.lg,
  },
  list: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    padding: spacing.md,
    gap: 14,
  },
  listCaution: { backgroundColor: '#EFE3DD' },
  listAction: { backgroundColor: '#E2E8DF' },
  listRow: { flexDirection: 'row', gap: spacing.md },
  listIndex: { color: colors.gold, width: 26, paddingTop: 2 },
  listText: { flex: 1 },
});
