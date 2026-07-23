import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
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
import { techniqueById } from '@/data/catalog';
import { useAppState } from '@/state/app-state';

export default function CollectionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { collections, deleteCollection } = useAppState();
  const collection = collections.find((item) => item.id === id);

  if (!collection) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="コレクションが見つかりません"
          description="削除された可能性があります。"
        />
      </Screen>
    );
  }

  const cards = collection.cardIds
    .map((cardId) => techniqueById.get(cardId))
    .filter(Boolean);

  const confirmDelete = () =>
    Alert.alert(
      'コレクションを削除',
      `「${collection.name}」を削除します。保存した処世術自体は削除されません。`,
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除',
          style: 'destructive',
          onPress: () => {
            deleteCollection(collection.id);
            router.back();
          },
        },
      ],
    );

  return (
    <Screen>
      <DetailHeader
        title="コレクション"
        right={
          <Pressable onPress={confirmDelete}>
            <AppText variant="label" style={styles.delete}>
              削除
            </AppText>
          </Pressable>
        }
      />
      <View style={styles.hero}>
        <Pill active>私の処世術禄</Pill>
        <AppText variant="title" style={styles.title}>
          {collection.name}
        </AppText>
        <AppText variant="caption">{cards.length}件の処世術</AppText>
      </View>
      <SectionHeader title="収録した処世術" count={cards.length} />
      {cards.length ? (
        cards.map((card) =>
          card ? <TechniqueRow key={card.id} card={card} /> : null,
        )
      ) : (
        <EmptyState
          mark="冊"
          title="このコレクションは空です"
          description="処世術の詳細画面から、このコレクションへ追加できます。"
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  delete: { color: colors.danger },
  hero: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: { marginVertical: spacing.lg },
});
