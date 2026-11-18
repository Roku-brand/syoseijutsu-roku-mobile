import { Link, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { isFreePersona } from '@/access/access-config';
import { BookScreen } from '@/components/book-ui';
import { LockedPreview } from '@/components/locked-preview';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import { getPersonaPresentation } from '@/data/persona-presentation';
import { getTechniqueCount } from '@/data/technique-counts';
import type { CategoryKey } from '@/data/types';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { TechniqueTitle } from '@/components/technique-title';

export function generateStaticParams() {
  return categories.flatMap((category) => category.subcategories.map((persona) => ({ category: category.key, name: persona.name })));
}

export default function PersonaScreen() {
  const { category: categoryKey, name } = useLocalSearchParams<{ category: CategoryKey; name: string }>();
  const { isPaid, catalogRevision } = useAccess();
  const [clientReady, setClientReady] = useState(false);
  useEffect(() => { setClientReady(true); }, []);
  const { width } = useResponsiveLayout();
  const category = categories.find((item) => item.key === categoryKey);
  const persona = category?.subcategories.find((item) => item.name === name);

  if (!category || !persona) {
    return <Screen><EmptyState title="人物像が見つかりません" description="前の画面へ戻って、人物像を選び直してください。" /></Screen>;
  }

  const techniqueCount = getTechniqueCount(category.key, persona.name, persona.items.length);
  if (!isPaid && !isFreePersona(persona.name)) {
    return <Screen><LockedPreview title={persona.name} description="この人物像の処世術は完全版に収録されています。" count={techniqueCount} source="discover_technique" /></Screen>;
  }

  const compact = width < 700;
  const presentation = getPersonaPresentation(persona.name);

  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View testID="persona-page-intro" style={[styles.intro, compact && styles.introCompact]}>
        {presentation ? (
          <Image
            source={presentation.image}
            accessibilityLabel={`${persona.name}を象徴する写真`}
            contentFit="cover"
            cachePolicy="memory-disk"
            style={[styles.introImage, compact && styles.introImageCompact]}
          />
        ) : null}
        <View style={styles.introCopy}>
          <AppText testID="persona-page-title" accessibilityRole="header" aria-level={1} style={[styles.title, compact && styles.titleCompact]}>{persona.name}</AppText>
          <AppText style={styles.subtitle}>{presentation?.subtitle ?? persona.articleTitle ?? persona.name}</AppText>
          <AppText style={styles.count}>{techniqueCount}の処世術</AppText>
        </View>
      </View>

      <View key={`${clientReady ? 'live' : 'prerender'}-${catalogRevision}`} testID="persona-technique-list" style={styles.list}>
        {clientReady ? persona.items.map((item, index) => (
          <Link key={item.id} href={{ pathname: '/card/[id]', params: { id: item.id } }} asChild>
            <Pressable testID={`persona-technique-row-${index + 1}`} accessibilityRole="link" accessibilityLabel={`${item.title}を開く`} style={styles.row}>
              <TechniqueTitle testID={`persona-technique-title-${index + 1}`} title={item.title} style={[styles.rowTitle, compact && styles.rowTitleCompact]} />
              <AppText aria-hidden accessibilityElementsHidden style={styles.arrow}>›</AppText>
            </Pressable>
          </Link>
        )) : null}
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingTop: spacing.sm, paddingBottom: spacing.xl * 3 },
  intro: { width: '100%', padding: spacing.md, flexDirection: 'row', alignItems: 'stretch', gap: spacing.xl, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  introCompact: { padding: spacing.sm, flexDirection: 'column', gap: spacing.md },
  introImage: { width: 290, aspectRatio: 1.65, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  introImageCompact: { width: '100%', aspectRatio: 2.2 },
  introCopy: { flex: 1, minWidth: 0, justifyContent: 'center', paddingRight: spacing.md },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 28, lineHeight: 39, fontWeight: '700', letterSpacing: 0.5 },
  titleCompact: { fontSize: 23, lineHeight: 33 },
  subtitle: { maxWidth: 460, marginTop: spacing.sm, color: colors.inkSoft, fontSize: 14, lineHeight: 23 },
  count: { marginTop: spacing.md, color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 20, fontWeight: '600' },
  list: { width: '100%', marginTop: spacing.xl, borderTopWidth: 1, borderTopColor: colors.line },
  row: { minHeight: 48, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  rowTitle: { flex: 1, minWidth: 0, alignSelf: 'center', color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, fontWeight: '700' },
  rowTitleCompact: { fontSize: 16, lineHeight: 23 },
  arrow: { flexShrink: 0, color: colors.gold, fontFamily: fonts.serif, fontSize: 23, lineHeight: 27 },
});
