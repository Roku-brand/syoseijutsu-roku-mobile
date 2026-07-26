import { Link, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  Share,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  getRelatedCards,
  techniqueById,
  theoryById,
} from '@/data/catalog';
import { practiceGuidance } from '@/data/search';
import { useAppState } from '@/state/app-state';

export function generateStaticParams() {
  return Array.from(techniqueById.keys()).map((id) => ({ id }));
}

export default function CardDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const card = techniqueById.get(id);
  const {
    savedIds,
    notes,
    collections,
    toggleSaved,
    addHistory,
    saveNote,
    toggleCollectionCard,
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
  const guidance = practiceGuidance[card.categoryKey];
  const relatedTheories = (card.theoryTagIds ?? [])
    .map((theoryId) => theoryById.get(theoryId))
    .filter(Boolean);

  return (
    <Screen>
      <DetailHeader />
      <View style={styles.readingColumn}>
        <View style={styles.eyebrow}>
          <AppText variant="caption" style={styles.breadcrumb}>
            処世術　/　{card.categoryName}　/　{card.subcategory}
          </AppText>
          <AppText variant="label" style={styles.cardId}>
            {card.id}
          </AppText>
        </View>

        <View style={styles.hero}>
          <View style={styles.heroMeta}>
            <AppText variant="label" style={styles.categoryLabel}>
              {card.categoryName}
            </AppText>
            <AppText variant="caption" style={styles.metaDivider}>
              /
            </AppText>
            <AppText variant="caption" style={styles.subcategoryLabel}>
              {card.subcategory}
            </AppText>
          </View>
          <AppText style={styles.title}>{card.title}</AppText>
          {card.subtitle && (
            <AppText style={styles.heroLead}>{card.subtitle}</AppText>
          )}
          <View style={styles.heroActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isSaved ? 'マイOSから削除' : 'マイOSに保存'}
              onPress={() => toggleSaved(card.id)}
              style={({ pressed }) => [
                styles.actionButton,
                isSaved && styles.actionButtonActive,
                pressed && styles.pressed,
              ]}
            >
              <AppText style={[styles.actionIcon, isSaved && styles.actionTextActive]}>
                {isSaved ? '◆' : '◇'}
              </AppText>
              <AppText
                variant="label"
                style={[styles.actionText, isSaved && styles.actionTextActive]}
              >
                {isSaved ? '保存済み' : 'マイOSに保存'}
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
                styles.actionButton,
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

        {card.explanation && (
          <>
            <SectionHeader title="解説" />
            <Explanation value={card.explanation} />
          </>
        )}

        <SectionHeader title="実践の視点" />
        <AppText style={styles.intro}>
          この処世術を、そのまま正解として当てはめない。まずは次の順序で、
          今の状況に合うかを確かめます。
        </AppText>
        <NumberedList items={guidance.actions} />

        <SectionHeader title="注意点" />
        <View style={styles.caution}>
          {guidance.cautions.map((item) => (
            <View key={item} style={styles.bulletRow}>
              <AppText style={styles.cautionBullet}>—</AppText>
              <AppText style={styles.cautionText}>{item}</AppText>
            </View>
          ))}
        </View>

        {(card.tags?.length ?? 0) > 0 && (
          <>
            <SectionHeader title="タグ" />
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

        {relatedTheories.length > 0 && (
          <>
            <SectionHeader title="理論的背景" count={relatedTheories.length} />
            {relatedTheories.map((theory) =>
              theory ? (
                <Link
                  key={theory.tagId}
                  href={{ pathname: '/theory/[id]', params: { id: theory.tagId } }}
                  asChild
                >
                  <Pressable style={styles.theory}>
                    <View style={styles.theoryTag}>
                      <AppText variant="label" style={styles.theoryTagText}>
                        {theory.tagId}
                      </AppText>
                    </View>
                    <View style={styles.theoryCopy}>
                      <AppText variant="serif" style={styles.theoryTitle}>
                        {theory.title}
                      </AppText>
                      <AppText variant="caption" numberOfLines={2}>
                        {theory.summary ??
                          `${theory.discipline}に属する${theory.conceptType}`}
                      </AppText>
                    </View>
                    <AppText style={styles.chevron}>›</AppText>
                  </Pressable>
                </Link>
              ) : null,
            )}
          </>
        )}

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

        {related.length > 0 && (
          <>
            <SectionHeader title="次に読む" count={related.length} />
            {related.map((relatedCard) => (
              <TechniqueRow key={relatedCard.id} card={relatedCard} />
            ))}
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
    marginBottom: spacing.xl,
  },
  breadcrumb: { color: colors.muted, flexShrink: 1 },
  cardId: {
    color: colors.gold,
    borderWidth: 1,
    borderColor: colors.goldLight,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    overflow: 'hidden',
  },
  hero: {
    backgroundColor: colors.white,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.gold,
    padding: spacing.lg,
    shadowColor: '#2B241A',
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 7 },
    elevation: 2,
  },
  heroMeta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  categoryLabel: { color: colors.gold },
  metaDivider: { color: colors.goldLight },
  subcategoryLabel: { color: colors.muted },
  title: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontWeight: '700',
    fontSize: 34,
    lineHeight: 49,
    marginTop: spacing.lg,
  },
  heroLead: {
    color: colors.inkSoft,
    fontSize: 17,
    lineHeight: 29,
    marginTop: spacing.md,
    maxWidth: 700,
  },
  heroActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  actionButton: {
    minHeight: 42,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.goldLight,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 15,
  },
  actionButtonActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  actionIcon: { color: colors.gold, fontSize: 17, lineHeight: 21 },
  actionText: { color: colors.inkSoft },
  actionTextActive: { color: colors.white },
  pressed: { opacity: 0.65 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    borderWidth: 1,
    borderColor: colors.goldLight,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  tagText: { color: colors.gold, fontSize: 11 },
  explanation: {
    backgroundColor: colors.surface,
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    borderRadius: radius.sm,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  explanationText: { color: colors.inkSoft, fontSize: 16, lineHeight: 29 },
  explanationStrong: { color: colors.ink, fontWeight: '700' },
  explanationConclusion: {
    color: colors.ink,
    fontFamily: fonts.serif,
    fontWeight: '700',
  },
  intro: { color: colors.muted, marginBottom: spacing.lg },
  numberedList: { gap: 12 },
  numberedRow: {
    minHeight: 72,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
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
  caution: {
    backgroundColor: '#EDE2D9',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: 10,
  },
  bulletRow: { flexDirection: 'row', gap: 10 },
  cautionBullet: { color: colors.danger },
  cautionText: { flex: 1, color: colors.inkSoft },
  theory: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: colors.gold,
    padding: spacing.lg,
    marginBottom: 14,
    shadowColor: '#2B241A',
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  theoryTag: {
    minWidth: 54,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.ink,
    alignItems: 'center',
    justifyContent: 'center',
  },
  theoryTagText: { color: colors.goldLight, fontSize: 10 },
  theoryCopy: { flex: 1 },
  theoryTitle: { fontSize: 16, lineHeight: 23, marginBottom: 4 },
  chevron: { color: colors.gold, fontSize: 25, lineHeight: 28 },
  noteInput: {
    minHeight: 140,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 15,
    lineHeight: 25,
    padding: spacing.md,
  },
  noteCaption: { marginTop: spacing.sm },
  collections: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
});
