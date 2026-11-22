import { Link, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import { PageScroll } from '@/components/page-scroll';

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
  const column = [styles.column, compact && styles.compactColumn];
  const presentation = getPersonaPresentation(persona.name);

  return (
    <BookScreen scroll={false} contentContainerStyle={styles.content}>
      <ScrollView
        key={persona.name}
        style={styles.fixedIntro}
        contentContainerStyle={column}
        showsVerticalScrollIndicator={false}
        bounces={false}
        overScrollMode="never"
      >
        <View testID="persona-page-intro" style={[styles.intro, compact && styles.introCompact]}>
          <View style={styles.introCopy}>
            <AppText testID="persona-page-title" accessibilityRole="header" aria-level={1} style={[styles.title, compact && styles.titleCompact]}>{persona.name}</AppText>
            <AppText style={styles.subtitle}>{presentation?.subtitle ?? persona.articleTitle ?? persona.name}</AppText>
            <AppText style={styles.count}>{techniqueCount}の処世術</AppText>
          </View>
          {presentation ? (
            <Image
              testID="persona-page-intro-photo"
              source={presentation.image}
              accessibilityLabel={`${persona.name}を象徴する写真`}
              contentFit="cover"
              cachePolicy="memory-disk"
              style={styles.introImage}
            />
          ) : null}
        </View>
      </ScrollView>
      <View style={[...column, styles.dividerArea]}>
        <View style={styles.divider} />
      </View>

      <PageScroll
        rememberOnTabSwitch
        key={`${category.key}-${persona.name}`}
        testID="persona-technique-scroll"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
      >
        <View key={`${clientReady ? 'live' : 'prerender'}-${catalogRevision}`} testID="persona-technique-list" style={column}>
          {clientReady ? persona.items.map((item, index) => (
            <Link key={item.id} href={{ pathname: '/card/[id]', params: { id: item.id } }} asChild>
              <Pressable testID={`persona-technique-row-${index + 1}`} accessibilityRole="link" accessibilityLabel={`${item.title}を開く`} style={styles.row}>
                <View aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.numberBadge}>
                  <AppText variant="serif" style={styles.number}>{String(index + 1).padStart(2, '0')}</AppText>
                </View>
                <TechniqueTitle testID={`persona-technique-title-${index + 1}`} title={item.title} style={[styles.rowTitle, compact && styles.rowTitleCompact]} />
                <AppText aria-hidden accessibilityElementsHidden style={styles.arrow}>›</AppText>
              </Pressable>
            </Link>
          )) : null}
        </View>
      </PageScroll>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: '100%', paddingHorizontal: 0, paddingTop: spacing.sm, paddingBottom: 0 },
  column: { width: '100%', maxWidth: 920, alignSelf: 'center', paddingHorizontal: spacing.lg },
  compactColumn: { paddingHorizontal: spacing.md },
  fixedIntro: { flexGrow: 0, flexShrink: 1, maxHeight: '74%' },
  intro: { width: '100%', padding: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.surface },
  introCompact: { padding: spacing.sm },
  introImage: { width: '29%', maxWidth: 132, aspectRatio: 1.5, flexShrink: 0, borderRadius: radius.sm, backgroundColor: colors.paperDeep },
  introCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 26, lineHeight: 35, fontWeight: '700', letterSpacing: 0.5 },
  titleCompact: { fontSize: 22, lineHeight: 29 },
  subtitle: { maxWidth: 460, marginTop: 3, color: colors.inkSoft, fontSize: 13, lineHeight: 19 },
  count: { marginTop: 4, color: colors.gold, fontFamily: fonts.serif, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  dividerArea: { marginTop: spacing.md },
  divider: { height: 1, backgroundColor: colors.line },
  list: { flex: 1, minHeight: 0, width: '100%' },
  listContent: { paddingBottom: spacing.xl },
  row: { minHeight: 48, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.line },
  numberBadge: { minWidth: 32, minHeight: 26, paddingHorizontal: 4, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, backgroundColor: colors.paperDeep },
  number: { color: colors.goldDeep, fontSize: 14, lineHeight: 18, fontStyle: 'italic', fontWeight: '700', fontVariant: ['tabular-nums'] },
  rowTitle: { flex: 1, minWidth: 0, alignSelf: 'center', color: colors.ink, fontFamily: fonts.serif, fontSize: 19, lineHeight: 27, fontWeight: '700' },
  rowTitleCompact: { fontSize: 16, lineHeight: 23 },
  arrow: { flexShrink: 0, color: colors.gold, fontFamily: fonts.serif, fontSize: 23, lineHeight: 27 },
});
