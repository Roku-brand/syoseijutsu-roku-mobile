import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import {
  colors,
  fonts,
  radius,
  spacing,
} from '@/constants/theme';
import {
  getRelatedCards,
  getTechniqueDisplayId,
  getTheoryDisplayId,
  techniqueById,
  theoryById,
} from '@/data/catalog';
import { practiceGuidance } from '@/data/search';
import { useAppState } from '@/state/app-state';
import { useAppToast } from '@/components/app-toast';

export function generateStaticParams() {
  return Array.from(techniqueById.keys()).map((id) => ({ id }));
}

export default function CardDetailScreen() {
  const showToast = useAppToast();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { width } = useWindowDimensions();
  const isCompact = width < 720;
  const card = techniqueById.get(id);
  const {
    savedIds,
    notes,
    collections,
    practiceRecords,
    toggleSaved,
    addHistory,
    saveNote,
    toggleCollectionCard,
    planPractice,
    completePractice,
  } = useAppState();
  const [note, setNote] = useState(notes[id] ?? '');

  useEffect(() => {
    if (id) addHistory(id);
  }, [addHistory, id]);

  useEffect(() => setNote(notes[id] ?? ''), [id, notes]);

  const related = useMemo(() => (card ? getRelatedCards(card) : []), [card]);

  if (!card) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="処世術が見つかりません"
          description="コンテンツが更新された可能性があります。前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  const isSaved = savedIds.includes(card.id);
  const practiceRecord = practiceRecords[card.id];
  const guidance = practiceGuidance[card.categoryKey];
  const relatedTheories = (card.theoryTagIds ?? [])
    .map((theoryId) => theoryById.get(theoryId))
    .filter(Boolean);

  return (
    <Screen
      style={styles.detailScreen}
      contentContainerStyle={styles.screenContent}
    >
      <View style={styles.readingColumn}>
        <DetailHeader />

        <View style={styles.eyebrow}>
          <AppText variant="caption" style={styles.breadcrumb}>
            処世術　/　{card.categoryName}　/　{card.subcategory}
          </AppText>
          <View style={styles.serial}>
            <View style={styles.serialMark}>
              <AppText style={styles.serialMarkText}>禄</AppText>
            </View>
            <AppText variant="label" style={styles.cardId}>
              {getTechniqueDisplayId(card)}
            </AppText>
          </View>
        </View>

        <View style={styles.heroShell}>
          <View style={styles.hero}>
            <View style={styles.heroMeta}>
              <AppText variant="label" style={styles.categoryLabel}>
                {card.categoryName}
              </AppText>
              <View style={styles.metaDivider} />
              <AppText variant="caption" style={styles.subcategoryLabel}>
                {card.subcategory}
              </AppText>
            </View>

            <View style={styles.heroCopy}>
              <AppText style={[styles.title, isCompact && styles.titleCompact]}>
                {card.title}
              </AppText>
              <View style={styles.ornament}>
                <View style={styles.ornamentLine} />
                <View style={styles.ornamentDiamond} />
                <View style={styles.ornamentLine} />
              </View>
              {card.subtitle && (
                <AppText style={styles.heroLead}>{card.subtitle}</AppText>
              )}
            </View>

            <View style={styles.heroActions}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isSaved ? '蔵書から削除' : '蔵書に保存'}
                onPress={() => {
                  toggleSaved(card.id);
                  showToast(
                    isSaved ? '蔵書から外しました' : '蔵書に保存しました',
                  );
                }}
                style={({ pressed }) => [
                  styles.actionButton,
                  styles.saveButton,
                  isSaved && styles.actionButtonActive,
                  pressed && styles.pressed,
                ]}
              >
                <AppText
                  style={[
                    styles.actionIcon,
                    styles.saveActionText,
                    isSaved && styles.actionTextActive,
                  ]}
                >
                  {isSaved ? '◆' : '◇'}
                </AppText>
                <AppText
                  variant="label"
                  style={[
                    styles.actionText,
                    styles.saveActionText,
                    isSaved && styles.actionTextActive,
                  ]}
                >
                  {isSaved ? '蔵書に保存済み' : '蔵書に保存'}
                </AppText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="共有"
                onPress={() =>
                  void Share.share({
                    title: '処世術禄',
                    message: `${card.title}\n\n${card.subtitle ?? ''}\n\n処世術禄`,
                  })
                }
                style={({ pressed }) => [
                  styles.shareButton,
                  pressed && styles.pressed,
                ]}
              >
                <AppText style={styles.actionIcon}>↗</AppText>
                <AppText variant="label" style={styles.actionText}>
                  共有
                </AppText>
              </Pressable>
            </View>
          </View>
        </View>

        {card.explanation && (
          <>
            <EditorialHeading title="解説" />
            <Explanation value={card.explanation} />
          </>
        )}

        {(related.length > 0 || relatedTheories.length > 0) && (
          <View style={[styles.relatedGrid, isCompact && styles.relatedGridCompact]}>
            {related.length > 0 && (
              <RelatedPanel
                title="関連する処世術"
                mark="縁"
                compact={isCompact}
              >
                {related.slice(0, 3).map((relatedCard) => (
                  <Pressable
                    key={relatedCard.id}
                    accessibilityRole="button"
                    accessibilityLabel={`${relatedCard.title}を開く`}
                    onPress={() =>
                      router.push({
                        pathname: '/card/[id]',
                        params: { id: relatedCard.id },
                      })
                    }
                    style={({ pressed }) => [
                      styles.relatedRow,
                      pressed && styles.pressed,
                    ]}
                  >
                    <View style={styles.relatedCopy}>
                      <AppText variant="label" style={styles.relatedId}>
                        {getTechniqueDisplayId(relatedCard)}
                      </AppText>
                      <AppText
                        variant="serif"
                        style={styles.relatedTitle}
                        numberOfLines={2}
                      >
                        {relatedCard.title}
                      </AppText>
                    </View>
                    <AppText style={styles.relatedChevron}>›</AppText>
                  </Pressable>
                ))}
              </RelatedPanel>
            )}

            {relatedTheories.length > 0 && (
              <RelatedPanel
                title="関連する理論"
                mark="理"
                compact={isCompact}
              >
                {relatedTheories.slice(0, 3).map((theory) =>
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
                      style={({ pressed }) => [
                        styles.relatedRow,
                        pressed && styles.pressed,
                      ]}
                    >
                      <View style={styles.relatedCopy}>
                        <AppText variant="label" style={styles.relatedId}>
                          {getTheoryDisplayId(theory)}
                        </AppText>
                        <AppText
                          variant="serif"
                          style={styles.relatedTitle}
                          numberOfLines={2}
                        >
                          {theory.title}
                        </AppText>
                      </View>
                      <AppText style={styles.relatedChevron}>›</AppText>
                    </Pressable>
                  ) : null,
                )}
              </RelatedPanel>
            )}
          </View>
        )}

        <SectionHeader title="実践の視点" />
        <AppText style={styles.intro}>
          この処世術を、そのまま正解として当てはめない。まずは次の順序で、
          今の状況に合うかを確かめます。
        </AppText>
        <NumberedList items={guidance.actions} />

        <View style={styles.practiceCard}>
          <View style={styles.practiceCopy}>
            <AppText variant="serif" style={styles.practiceTitle}>
              {practiceRecord?.status === 'tried'
                ? 'この処世術は実践済みです'
                : practiceRecord
                  ? '試す処世術に入っています'
                  : '知ったことを、現場の一手へ'}
            </AppText>
            <AppText style={styles.practiceDescription}>
              {practiceRecord?.status === 'tried'
                ? '下のメモに、効いたことと次に変えることを残せます。'
                : '小さく試し、結果をメモすると自分の判断軸になります。'}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              practiceRecord?.status === 'tried'
                ? '実践済み'
                : practiceRecord
                  ? '試したとして記録'
                  : 'この処世術を試す'
            }
            disabled={practiceRecord?.status === 'tried'}
            onPress={() =>
              practiceRecord
                ? completePractice(card.id)
                : planPractice(card.id)
            }
            style={({ pressed }) => [
              styles.practiceButton,
              practiceRecord?.status === 'tried' &&
                styles.practiceButtonComplete,
              pressed && styles.pressed,
            ]}
          >
            <AppText style={styles.practiceButtonText}>
              {practiceRecord?.status === 'tried'
                ? '✓ 実践済み'
                : practiceRecord
                  ? '試したとして記録'
                  : '今日、試してみる'}
            </AppText>
          </Pressable>
        </View>

        <SectionHeader title="注意点" />
        <View style={styles.caution}>
          {guidance.cautions.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <AppText style={styles.cautionBullet}>—</AppText>
              <AppText style={styles.cautionText}>{item}</AppText>
            </View>
          ))}
        </View>

        <SectionHeader title="自分のメモ" />
        <TextInput
          accessibilityLabel="この処世術へのメモ"
          multiline
          maxLength={500}
          placeholder="この知恵を、どんな場面で使うか。"
          placeholderTextColor={colors.muted}
          value={note}
          onChangeText={setNote}
          onBlur={() => saveNote(card.id, note.trim())}
          style={styles.noteInput}
          textAlignVertical="top"
        />
        <AppText variant="caption" style={styles.noteCaption}>
          入力内容はこの端末だけに保存されます。
        </AppText>

        {collections.length > 0 && (
          <>
            <SectionHeader title="コレクションに追加" />
            <View style={styles.collections}>
              {collections.map((collection) => (
                <Pill
                  key={collection.id}
                  active={collection.cardIds.includes(card.id)}
                  onPress={() => toggleCollectionCard(collection.id, card.id)}
                >
                  {collection.name}
                </Pill>
              ))}
            </View>
          </>
        )}

        {(card.tags?.length ?? 0) > 0 && (
          <>
            <EditorialHeading title="関連タグ" />
            <View style={styles.tags}>
              {card.tags!.map((tag) => (
                <View key={tag} style={styles.tag}>
                  <AppText variant="label" style={styles.tagText}>
                    #{tag}
                  </AppText>
                </View>
              ))}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function NumberedList({ items }: { items: string[] }) {
  return (
    <View style={styles.numberedList}>
      {items.map((item, index) => (
        <View key={item} style={styles.numberedRow}>
          <View style={styles.number}>
            <AppText variant="label" style={styles.numberText}>
              {String(index + 1).padStart(2, '0')}
            </AppText>
          </View>
          <AppText style={styles.numberedText}>{item}</AppText>
        </View>
      ))}
    </View>
  );
}

function Explanation({ value }: { value: string }) {
  const paragraphs = value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return (
    <View style={styles.explanation}>
      {paragraphs.map((paragraph, paragraphIndex) => (
        <AppText
          key={`${paragraph.slice(0, 24)}-${paragraphIndex}`}
          style={[
            styles.explanationText,
            paragraphIndex === paragraphs.length - 1 &&
              styles.explanationConclusion,
          ]}
        >
          {paragraph.split(/(\*\*.*?\*\*)/g).map((part, partIndex) =>
            part.startsWith('**') && part.endsWith('**') ? (
              <AppText
                key={`${partIndex}-${part}`}
                style={styles.explanationStrong}
              >
                {part.slice(2, -2)}
              </AppText>
            ) : (
              part
            ),
          )}
        </AppText>
      ))}
    </View>
  );
}

function EditorialHeading({ title }: { title: string }) {
  return (
    <View style={styles.editorialHeading}>
      <View style={styles.headingDiamond} />
      <AppText variant="serif" style={styles.editorialHeadingText}>
        {title}
      </AppText>
    </View>
  );
}

function RelatedPanel({
  title,
  mark,
  compact,
  children,
}: {
  title: string;
  mark: string;
  compact: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.relatedPanel, compact && styles.relatedPanelCompact]}>
      <View style={styles.relatedPanelHeader}>
        <View style={styles.relatedPanelMark}>
          <AppText style={styles.relatedPanelMarkText}>{mark}</AppText>
        </View>
        <AppText variant="serif" style={styles.relatedPanelTitle}>
          {title}
        </AppText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  detailScreen: {
    backgroundColor: '#E9E1D3',
  },
  screenContent: {
    maxWidth: 1280,
    paddingTop: spacing.lg,
  },
  readingColumn: {
    width: '100%',
    maxWidth: 1180,
    alignSelf: 'center',
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  breadcrumb: { color: colors.muted, flexShrink: 1 },
  serial: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: 6,
    backgroundColor: 'rgba(252,250,245,0.76)',
    overflow: 'hidden',
  },
  serialMark: {
    width: 32,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: colors.goldLight,
  },
  serialMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 12,
    fontWeight: '700',
  },
  cardId: {
    color: colors.gold,
    paddingHorizontal: 12,
    letterSpacing: 1.2,
  },
  heroShell: {
    borderRadius: 28,
    borderWidth: 3,
    borderColor: '#4A3828',
    padding: 5,
    backgroundColor: '#A7833D',
    shadowColor: '#2A2119',
    shadowOpacity: 0.2,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  hero: {
    backgroundColor: '#FFFDF8',
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: '#5A4634',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  categoryLabel: { color: colors.gold, fontFamily: fonts.serif },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: colors.goldLight,
    transform: [{ rotate: '18deg' }],
  },
  subcategoryLabel: { color: '#4D514D' },
  heroCopy: {
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
  title: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontWeight: '600',
    fontSize: 38,
    lineHeight: 54,
    letterSpacing: 1.2,
    textAlign: 'center',
  },
  titleCompact: {
    fontSize: 27,
    lineHeight: 40,
    letterSpacing: 0.4,
  },
  ornament: {
    width: '62%',
    maxWidth: 560,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: spacing.lg,
  },
  ornamentLine: { height: 1, flex: 1, backgroundColor: colors.goldLight },
  ornamentDiamond: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  heroLead: {
    color: '#424844',
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 27,
    letterSpacing: 0.7,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#C8BDAA',
  },
  actionButton: {
    minHeight: 44,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: '#4A3828',
    backgroundColor: '#FFFDF8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 18,
  },
  saveButton: {
    minWidth: 174,
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: '#273126',
    shadowColor: '#1B211A',
    shadowOpacity: 0.18,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  shareButton: {
    minHeight: 44,
    minWidth: 96,
    borderRadius: radius.pill,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  actionButtonActive: {
    backgroundColor: '#4D3A24',
    borderColor: colors.goldLight,
  },
  actionIcon: { color: colors.gold, fontSize: 17, lineHeight: 21 },
  actionText: { color: colors.inkSoft },
  saveActionText: { color: '#FFF9EB' },
  actionTextActive: { color: colors.white },
  pressed: { opacity: 0.65 },
  editorialHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  headingDiamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  editorialHeadingText: {
    color: colors.ink,
    fontSize: 22,
    lineHeight: 31,
    letterSpacing: 1.2,
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingBottom: spacing.xl,
  },
  tag: {
    borderWidth: 1,
    borderColor: colors.goldLight,
    backgroundColor: 'rgba(255,255,255,0.62)',
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  tagText: { color: colors.gold, fontSize: 11, letterSpacing: 0.6 },
  explanation: {
    backgroundColor: '#EEF1E8',
    borderWidth: 1.5,
    borderColor: '#52604C',
    borderLeftWidth: 5,
    borderLeftColor: '#31402F',
    borderRadius: radius.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    gap: spacing.lg,
    shadowColor: '#33402F',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 1,
  },
  explanationText: {
    color: '#303631',
    fontSize: 16,
    lineHeight: 31,
    letterSpacing: 0.25,
    fontWeight: '500',
  },
  explanationStrong: { color: colors.ink, fontWeight: '700' },
  explanationConclusion: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontWeight: '700',
  },
  relatedGrid: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  relatedGridCompact: { flexDirection: 'column' },
  relatedPanel: {
    flex: 1,
    minWidth: 0,
    borderWidth: 1,
    borderColor: '#89745B',
    borderRadius: radius.md,
    backgroundColor: '#FFFDF8',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
  },
  relatedPanelCompact: { width: '100%' },
  relatedPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 11,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  relatedPanelMark: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  relatedPanelMarkText: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  relatedPanelTitle: {
    color: colors.ink,
    fontSize: 17,
    lineHeight: 24,
    letterSpacing: 0.6,
  },
  relatedRow: {
    minHeight: 67,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
    paddingVertical: 10,
  },
  relatedCopy: { flex: 1 },
  relatedId: {
    color: colors.gold,
    fontSize: 9,
    lineHeight: 13,
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  relatedTitle: {
    color: colors.inkSoft,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  relatedChevron: {
    color: colors.gold,
    fontSize: 23,
    lineHeight: 26,
  },
  intro: { color: colors.muted, marginBottom: spacing.lg },
  numberedList: { gap: 12 },
  numberedRow: {
    minHeight: 72,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#89745B',
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
  },
  number: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.paperDeep,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: colors.gold },
  numberedText: { flex: 1 },
  practiceCard: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.lg,
    borderWidth: 1,
    borderColor: '#52604C',
    borderRadius: radius.md,
    backgroundColor: '#EEF1E8',
  },
  practiceCopy: { flex: 1, minWidth: 240 },
  practiceTitle: {
    color: '#263327',
    fontSize: 18,
    lineHeight: 27,
  },
  practiceDescription: {
    marginTop: 5,
    color: '#535C54',
    fontSize: 14,
    lineHeight: 23,
  },
  practiceButton: {
    minHeight: 48,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.pill,
    backgroundColor: '#273126',
    alignItems: 'center',
    justifyContent: 'center',
  },
  practiceButtonComplete: { backgroundColor: '#667064' },
  practiceButtonText: {
    color: '#FFF9EB',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '700',
  },
  caution: {
    backgroundColor: '#EDE2D9',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 10,
  },
  bulletRow: { flexDirection: 'row', gap: 10 },
  cautionBullet: { color: colors.danger },
  cautionText: { flex: 1, color: colors.inkSoft },
  noteInput: {
    minHeight: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: '#89745B',
    backgroundColor: '#FFFDF8',
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 25,
    padding: spacing.md,
  },
  noteCaption: { marginTop: spacing.sm },
  collections: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
