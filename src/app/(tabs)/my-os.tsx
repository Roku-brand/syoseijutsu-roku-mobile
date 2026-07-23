import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  ChoiceCard,
  EmptyState,
  Header,
  Pill,
  PrimaryButton,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import {
  categoryMeta,
  categoryOrder,
  techniqueById,
} from '@/data/catalog';
import { useAppState } from '@/state/app-state';

type Section = 'saved' | 'collections' | 'history';

export default function MyOsScreen() {
  const router = useRouter();
  const {
    savedIds,
    historyIds,
    collections,
    interests,
    createCollection,
    toggleInterest,
  } = useAppState();
  const [section, setSection] = useState<Section>('saved');
  const [modalVisible, setModalVisible] = useState(false);
  const [collectionName, setCollectionName] = useState('');

  const savedCards = useMemo(
    () => savedIds.map((id) => techniqueById.get(id)).filter(Boolean),
    [savedIds],
  );
  const historyCards = useMemo(
    () =>
      historyIds
        .map((id) => techniqueById.get(id))
        .filter(Boolean)
        .slice(0, 30),
    [historyIds],
  );

  return (
    <Screen>
      <Header
        eyebrow="自分の判断原則"
        title="マイOS"
        description="残したい知恵を、自分のための一冊に。"
        right={
          <Link href="/settings" asChild>
            <Pressable style={styles.settingsButton}>
              <AppText style={styles.settingsIcon}>⚙</AppText>
            </Pressable>
          </Link>
        }
      />

      <View style={styles.stats}>
        <View style={styles.stat}>
          <AppText variant="display" style={styles.statNumber}>
            {savedIds.length}
          </AppText>
          <AppText variant="caption">保存した処世術</AppText>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.stat}>
          <AppText variant="display" style={styles.statNumber}>
            {collections.length}
          </AppText>
          <AppText variant="caption">コレクション</AppText>
        </View>
      </View>

      <View style={styles.tabs}>
        {[
          ['saved', '保存'],
          ['collections', 'コレクション'],
          ['history', '履歴'],
        ].map(([key, label]) => (
          <Pill
            key={key}
            active={section === key}
            onPress={() => setSection(key as Section)}
          >
            {label}
          </Pill>
        ))}
      </View>

      {section === 'saved' && (
        <>
          <SectionHeader title="保存した処世術" count={savedCards.length} />
          {savedCards.length ? (
            savedCards.map((card) =>
              card ? <TechniqueRow key={card.id} card={card} /> : null,
            )
          ) : (
            <EmptyState
              mark="禄"
              title="まだ何も保存されていません"
              description="メインの◇を押すと、ここに自分の判断原則が集まります。"
            />
          )}
        </>
      )}

      {section === 'collections' && (
        <>
          <SectionHeader title="コレクション" count={collections.length} />
          {collections.map((collection) => (
            <ChoiceCard
              key={collection.id}
              title={collection.name}
              description={`${collection.cardIds.length}件の処世術`}
              mark="冊"
              onPress={() =>
                router.push({
                  pathname: '/collection/[id]',
                  params: { id: collection.id },
                })
              }
            />
          ))}
          <Pressable
            style={({ pressed }) => [
              styles.addCollection,
              pressed && styles.pressed,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <AppText style={styles.addIcon}>＋</AppText>
            <AppText variant="label" style={styles.addLabel}>
              新しいコレクション
            </AppText>
          </Pressable>
        </>
      )}

      {section === 'history' && (
        <>
          <SectionHeader title="最近読んだ処世術" count={historyCards.length} />
          {historyCards.length ? (
            historyCards.map((card) =>
              card ? <TechniqueRow key={card.id} card={card} /> : null,
            )
          ) : (
            <EmptyState
              mark="時"
              title="閲覧履歴はまだありません"
              description="処世術の詳細を読むと、ここから振り返れます。"
            />
          )}
        </>
      )}

      <SectionHeader title="関心カテゴリ" />
      <View style={styles.interests}>
        {categoryOrder.map((category) => (
          <Pill
            key={category}
            active={interests.includes(category)}
            onPress={() => toggleInterest(category)}
          >
            {categoryMeta[category].label}
          </Pill>
        ))}
      </View>

      <Modal
        transparent
        animationType="fade"
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <AppText variant="serif" style={styles.modalTitle}>
              コレクションを作る
            </AppText>
            <TextInput
              accessibilityLabel="コレクション名"
              autoFocus
              maxLength={30}
              value={collectionName}
              onChangeText={setCollectionName}
              placeholder="例：今の自分に必要"
              placeholderTextColor={colors.muted}
              style={styles.input}
            />
            <View style={styles.modalActions}>
              <Pressable
                onPress={() => {
                  setModalVisible(false);
                  setCollectionName('');
                }}
                style={styles.cancel}
              >
                <AppText variant="label">キャンセル</AppText>
              </Pressable>
              <View style={styles.createButton}>
                <PrimaryButton
                  disabled={!collectionName.trim()}
                  onPress={() => {
                    createCollection(collectionName);
                    setCollectionName('');
                    setModalVisible(false);
                  }}
                >
                  作成する
                </PrimaryButton>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  settingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.line,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsIcon: { fontSize: 19, lineHeight: 23 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  stat: { flex: 1, alignItems: 'center' },
  statNumber: { color: colors.goldLight, fontSize: 34, lineHeight: 44 },
  statDivider: { width: 1, height: 48, backgroundColor: '#45483F' },
  tabs: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  addCollection: {
    minHeight: 56,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.gold,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addIcon: { color: colors.gold, fontSize: 21, lineHeight: 24 },
  addLabel: { color: colors.gold },
  pressed: { opacity: 0.65 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,17,15,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  modalTitle: { fontSize: 22, lineHeight: 30 },
  input: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.line,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.md,
    color: colors.ink,
    fontFamily: fonts.sans,
    fontSize: 16,
    backgroundColor: colors.white,
  },
  modalActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  cancel: { padding: spacing.md },
  createButton: { flex: 1 },
});
