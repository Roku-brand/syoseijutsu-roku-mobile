import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { DetailSwipe } from '@/components/detail-swipe';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getRelatedTheories,
  getTechniquesForTheory,
  getTheoryDisplayId,
  theories,
  theoryById,
} from '@/data/catalog';
import type { TheoryCard } from '@/data/types';
import { getTheoryProvenance } from '@/data/theory-sources';
import { getTheoryCategoryLabel, normalizeDisplayText } from '@/data/theory-display';

export function generateStaticParams() {
  return Array.from(theoryById.keys()).map((id) => ({ id }));
}

export default function TheoryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theory = theoryById.get(id);
  const [informationOpen, setInformationOpen] = useState(false);

  if (!theory) {
    return (
      <Screen contentContainerStyle={styles.screenContent}>
        <EmptyState
          title="理論が見つかりません"
          description="前の画面へ戻り、別の理論を選んでください。"
        />
      </Screen>
    );
  }

  const related = getTechniquesForTheory(theory);
  const relatedTheories = getRelatedTheories(theory);
  const titleLength = [...theory.title.replace(/\s/g, '')].length;
  const titleFontSize = titleLength <= 12 ? 28 : titleLength <= 18 ? 24 : 21;
  const summary = normalizeDisplayText(theory.summary);
  const navigateTheory = (offset: -1 | 1) => {
    const currentIndex = theories.findIndex((item) => item.tagId === theory.tagId);
    const next = theories[(currentIndex + offset + theories.length) % theories.length];
    router.replace({ pathname: '/theory/[id]', params: { id: next.tagId } });
  };

  return (
    <Screen style={styles.screen} contentContainerStyle={styles.screenContent}>
      <DetailSwipe
        style={styles.article}
        onPrevious={() => navigateTheory(-1)}
        onNext={() => navigateTheory(1)}
      >
        <View style={styles.hero}>
          <View testID="theory-meta" style={styles.metaRow}>
            <AppText style={styles.number}>{getTheoryDisplayId(theory)}</AppText>
            <View style={styles.categoryTag}>
              <AppText style={styles.categoryTagText}>
                {getTheoryCategoryLabel(theory)}
              </AppText>
            </View>
          </View>
          <AppText
            testID="theory-title"
            variant="serif"
            style={[styles.title, { fontSize: titleFontSize, lineHeight: Math.round(titleFontSize * 1.43) }]}
          >
            {normalizeDisplayText(theory.title)}
          </AppText>
          <AppText variant="label" style={styles.summaryLabel}>概要</AppText>
          <AppText style={styles.explanation}>{summary}</AppText>
        </View>

        {related.length > 0 && (
          <DetailSection title="関連する処世術" count={related.length}>
            <View style={styles.relatedList}>
              {related.map((card) => (
                <Pressable
                  key={card.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${card.title}を開く`}
                  onPress={() =>
                    router.push({ pathname: '/card/[id]', params: { id: card.id } })
                  }
                  style={({ pressed }) => [styles.relatedRow, pressed && styles.pressed]}
                >
                  <AppText variant="serif" style={styles.relatedTitle}>
                    {card.title}
                  </AppText>
                  <AppText style={styles.chevron}>›</AppText>
                </Pressable>
              ))}
            </View>
          </DetailSection>
        )}

        {relatedTheories.length > 0 && (
          <DetailSection title="関連する理論" count={relatedTheories.length}>
            <View style={styles.relatedList}>
              {relatedTheories.map((relatedTheory) => (
                <Pressable
                  key={relatedTheory.tagId}
                  accessibilityRole="button"
                  accessibilityLabel={`${relatedTheory.title}を開く`}
                  onPress={() =>
                    router.push({
                      pathname: '/theory/[id]',
                      params: { id: relatedTheory.tagId },
                    })
                  }
                  style={({ pressed }) => [styles.relatedRow, pressed && styles.pressed]}
                >
                  <AppText variant="serif" style={styles.relatedTitle}>
                    {relatedTheory.title}
                  </AppText>
                  <AppText style={styles.chevron}>›</AppText>
                </Pressable>
              ))}
            </View>
          </DetailSection>
        )}

        <View style={styles.informationSection}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={informationOpen ? '理論情報を閉じる' : '理論情報を開く'}
            accessibilityState={{ expanded: informationOpen }}
            onPress={() => setInformationOpen((open) => !open)}
            style={({ pressed }) => [styles.informationToggle, pressed && styles.pressed]}
          >
            <AppText variant="serif" style={styles.informationTitle}>理論情報</AppText>
            <AppText style={styles.informationSymbol}>{informationOpen ? '−' : '＋'}</AppText>
          </Pressable>
          {informationOpen ? <TheoryInformation theory={theory} /> : null}
        </View>
      </DetailSwipe>
    </Screen>
  );
}

function DetailSection({
  title,
  count,
  children,
}: {
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <AppText variant="serif" style={styles.sectionTitle}>{title}</AppText>
        {typeof count === 'number' ? (
          <View style={styles.countBadge}>
            <AppText style={styles.countText}>{count}</AppText>
          </View>
        ) : null}
      </View>
      {children}
    </View>
  );
}

function TheoryInformation({ theory }: { theory: TheoryCard }) {
  const provenance = getTheoryProvenance(theory);
  const rows = [
    ['出典状態', provenance.status],
    ['提唱者・研究者', provenance.attribution],
    ['著作・研究', provenance.works?.join('\n')],
    ['注記', provenance.note],
  ].filter(([, value]) => Boolean(value));

  return (
    <View style={styles.informationBody}>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.informationRow}>
          <AppText style={styles.informationLabel}>{label}</AppText>
          <AppText style={styles.informationValue}>{value}</AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: '#FBF8F2' },
  screenContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 132,
  },
  article: { width: '100%', maxWidth: 980, alignSelf: 'center' },
  hero: { paddingTop: 2 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  number: {
    color: '#8D887F',
    fontFamily: fonts.serif,
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.8,
  },
  title: {
    marginTop: 8,
    color: '#111311',
    fontFamily: fonts.serif,
    fontSize: 28,
    lineHeight: 40,
    fontWeight: '700',
    letterSpacing: 0.35,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#CFC4B4',
    borderRadius: radius.pill,
    backgroundColor: '#F2EEE6',
  },
  categoryTagText: {
    color: '#504B43',
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600',
  },
  explanation: {
    marginTop: 29,
    color: '#252925',
    fontSize: 17,
    lineHeight: 31,
    letterSpacing: 0.15,
  },
  summaryLabel: { marginTop: 26, color: colors.gold, fontSize: 11, lineHeight: 16, letterSpacing: 1.2 },
  section: { marginTop: 36 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionTitle: { color: '#24251F', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  countBadge: {
    minWidth: 22,
    height: 22,
    paddingHorizontal: 7,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAE3D7',
  },
  countText: { color: '#625846', fontSize: 11, lineHeight: 14, fontWeight: '700' },
  relatedList: { borderTopWidth: 1, borderTopColor: '#DFD7CA' },
  relatedRow: {
    minHeight: 62,
    paddingVertical: 13,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#DFD7CA',
  },
  relatedTitle: { flex: 1, color: '#1D211E', fontSize: 18, lineHeight: 26, fontWeight: '600' },
  chevron: { color: colors.gold, fontSize: 26, lineHeight: 28 },
  informationSection: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#DFD7CA' },
  informationToggle: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  informationTitle: { color: '#24251F', fontSize: 18, lineHeight: 26, fontWeight: '700' },
  informationSymbol: { color: '#5E594F', fontSize: 22, lineHeight: 28 },
  informationBody: { paddingBottom: 12, borderTopWidth: 1, borderTopColor: '#E5DED3' },
  informationRow: {
    flexDirection: 'row',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5DED3',
  },
  informationLabel: { width: 82, color: '#746E64', fontSize: 12, lineHeight: 19 },
  informationValue: { flex: 1, color: '#292B27', fontSize: 14, lineHeight: 21 },
  pressed: { opacity: 0.56 },
});
