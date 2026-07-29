import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { BookScreen, BookTitle, OrnamentHeading, bookCardShadow } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { techniqueById, techniqueCards } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function MyOsScreen() {
  const router = useRouter();
  const {
    savedIds,
    historyIds,
    personalPrinciple,
    updatePersonalPrinciple,
  } = useAppState();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(personalPrinciple);
  const recentCard =
    techniqueById.get(historyIds[0] ?? '') ??
    techniqueById.get(savedIds[0] ?? '') ??
    techniqueCards[0];

  const openEditor = () => {
    void Haptics.selectionAsync().catch(() => undefined);
    setDraft(personalPrinciple);
    setEditing(true);
  };

  return (
    <BookScreen>
      <BookTitle title="マイOS" subtitle="自分の判断軸を、少しずつ育てる。" />

      <View style={styles.principleCard}>
        <View style={styles.principleLabelRow}>
          <View style={styles.diamond} />
          <AppText style={styles.principleLabel}>いまの判断原則</AppText>
        </View>
        <AppText style={styles.principle}>{personalPrinciple}</AppText>
        <View style={styles.rule} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="判断原則を編集"
          onPress={openEditor}
          style={({ pressed }) => [
            styles.editPrinciple,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.editIcon}>✎</AppText>
          <AppText style={styles.editText}>原則を整える</AppText>
          <AppText style={styles.chevron}>›</AppText>
        </Pressable>
      </View>

      <View style={styles.osActions}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="蔵書を開く"
          onPress={() => router.push('/library')}
          style={({ pressed }) => [
            styles.osActionCard,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.actionMark}>冊</AppText>
          <AppText style={styles.actionTitle}>蔵書</AppText>
          <AppText style={styles.savedCount}>{savedIds.length}</AppText>
          <AppText style={styles.actionSubtitle}>保存した処世術</AppText>
        </Pressable>
        <Pressable
          onPress={openEditor}
          style={({ pressed }) => [
            styles.osActionCard,
            pressed && styles.pressed,
          ]}
        >
          <AppText style={styles.actionMark}>記</AppText>
          <AppText style={styles.actionTitle}>書き留める</AppText>
          <View style={styles.shortRule} />
          <AppText style={styles.actionSubtitle}>自分の言葉にする</AppText>
        </Pressable>
      </View>

      <OrnamentHeading>最近の振り返り</OrnamentHeading>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${recentCard.title}を開く`}
        onPress={() =>
          router.push({ pathname: '/card/[id]', params: { id: recentCard.id } })
        }
        style={({ pressed }) => [
          styles.recentCard,
          pressed && styles.pressed,
        ]}
      >
        <AppText style={styles.recentTitle}>{recentCard.title}</AppText>
        <AppText style={styles.recentDate}>
          {new Intl.DateTimeFormat('ja-JP', {
            month: 'numeric',
            day: 'numeric',
          }).format(new Date())}
        </AppText>
        <AppText style={styles.chevron}>›</AppText>
      </Pressable>

      <Modal
        transparent
        visible={editing}
        animationType="fade"
        onRequestClose={() => setEditing(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText style={styles.modalTitle}>判断原則を整える</AppText>
            <AppText style={styles.modalLead}>
              いまの自分が、迷ったときに戻れる一文を書き留めます。
            </AppText>
            <TextInput
              autoFocus
              multiline
              maxLength={100}
              value={draft}
              onChangeText={setDraft}
              accessibilityLabel="判断原則"
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setEditing(false)} style={styles.cancel}>
                <AppText style={styles.cancelText}>閉じる</AppText>
              </Pressable>
              <Pressable
                onPress={() => {
                  updatePersonalPrinciple(draft);
                  setEditing(false);
                }}
                style={styles.save}
              >
                <AppText style={styles.saveText}>保存する</AppText>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  principleCard: {
    minHeight: 270,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    ...bookCardShadow,
  },
  principleLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  diamond: {
    width: 9,
    height: 9,
    backgroundColor: colors.gold,
    transform: [{ rotate: '45deg' }],
  },
  principleLabel: {
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  principle: {
    marginTop: spacing.xl,
    fontFamily: fonts.serif,
    fontSize: 29,
    lineHeight: 50,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  rule: {
    height: 1,
    backgroundColor: colors.line,
    marginTop: spacing.xl,
  },
  editPrinciple: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: spacing.md,
  },
  editIcon: { color: colors.gold, fontSize: 23, lineHeight: 28 },
  editText: {
    flex: 1,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  chevron: { color: colors.gold, fontSize: 31, lineHeight: 34 },
  osActions: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  osActionCard: {
    flex: 1,
    minHeight: 220,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.48)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionMark: {
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 20,
    lineHeight: 27,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: 22,
    width: 44,
    height: 44,
    textAlign: 'center',
    paddingTop: 8,
  },
  actionTitle: {
    marginTop: spacing.md,
    fontFamily: fonts.serif,
    fontSize: 19,
    lineHeight: 26,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  savedCount: {
    marginTop: spacing.sm,
    color: colors.gold,
    fontFamily: fonts.serif,
    fontSize: 42,
    lineHeight: 50,
  },
  shortRule: {
    width: '72%',
    height: 1,
    backgroundColor: colors.line,
    marginVertical: spacing.lg,
  },
  actionSubtitle: {
    fontFamily: fonts.serif,
    fontSize: 13,
    lineHeight: 20,
    color: colors.inkSoft,
  },
  recentCard: {
    minHeight: 76,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  recentTitle: {
    flex: 1,
    fontFamily: fonts.serif,
    fontSize: 16,
    lineHeight: 23,
    fontWeight: '600',
  },
  recentDate: {
    color: colors.inkSoft,
    fontFamily: fonts.serif,
    fontSize: 12,
  },
  modalBackdrop: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: 'rgba(17,18,17,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  modalTitle: {
    fontFamily: fonts.serif,
    fontSize: 23,
    lineHeight: 32,
    fontWeight: '600',
  },
  modalLead: { marginTop: spacing.sm, color: colors.muted },
  input: {
    minHeight: 130,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    color: colors.ink,
    fontFamily: fonts.serif,
    fontSize: 18,
    lineHeight: 30,
    textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancel: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: colors.muted, fontWeight: '700' },
  save: {
    flex: 1,
    minHeight: 50,
    borderRadius: radius.md,
    backgroundColor: colors.charcoal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: colors.goldLight, fontWeight: '700' },
  pressed: { opacity: 0.68, transform: [{ scale: 0.992 }] },
});
