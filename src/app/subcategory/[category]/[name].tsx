import { useLocalSearchParams } from 'expo-router';
import { TechniqueRow } from '@/components/technique-row';
import {
  AppText,
  DetailHeader,
  EmptyState,
  Pill,
  Screen,
  SectionHeader,
} from '@/components/ui';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

export default function SubcategoryScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{
    category: CategoryKey;
    name: string;
  }>();
  const category = categories.find((item) => item.key === categoryKey);
  const subcategory = category?.subcategories.find((item) => item.name === name);

  if (!category || !subcategory) {
    return (
      <Screen>
        <DetailHeader />
        <EmptyState
          title="テーマが見つかりません"
          description="前の画面へ戻ってください。"
        />
      </Screen>
    );
  }

  const cards = subcategory.items.map((item) => ({
    ...item,
    categoryKey: category.key,
    categoryName: category.name,
    subcategory: subcategory.name,
    articleTitle: subcategory.articleTitle ?? subcategory.name,
  }));

  return (
    <Screen>
      <DetailHeader title={category.name} />
      <Pill active>{category.name}</Pill>
      <AppText variant="title" style={{ marginTop: 20 }}>
        {subcategory.name}
      </AppText>
      <AppText style={{ marginTop: 8, opacity: 0.6 }}>
        {subcategory.articleTitle}
      </AppText>
      <SectionHeader title="処世術" count={cards.length} />
      {cards.map((card) => (
        <TechniqueRow key={card.id} card={card} showCategory={false} />
      ))}
    </Screen>
  );
}
