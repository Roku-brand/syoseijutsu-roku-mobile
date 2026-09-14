import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { categories } from '@/data/catalog';
import type { CategoryKey } from '@/data/types';

const copy: Record<CategoryKey, { title: string; lead: string; description: string }> = {
  interpersonal: {
    title: '対人術',
    lead: '人との関係を築き、守り、無用に消耗しないための知恵。',
    description: '会話、印象、信頼、距離感、集団での立ち回りまで、人間関係の場面で使う処世術を人物像からたどれます。',
  },
  work: {
    title: '仕事術',
    lead: '仕事を進め、評価と合意を成果へつなげるための知恵。',
    description: '段取り、交渉、評価、組織での立ち回りまで、仕事の場面で使う処世術を人物像からたどれます。',
  },
  life: {
    title: '人生術',
    lead: '自分の軸を持ち、不安やつまずきと向き合うための知恵。',
    description: '選択、習慣、不安、回復、人生設計まで、日々の判断を整える処世術を人物像からたどれます。',
  },
};

export function SeoCategoryScreen({ categoryKey }: { categoryKey: CategoryKey }) {
  const category = categories.find((item) => item.key === categoryKey);
  const content = copy[categoryKey];
  if (!category) return null;
  return (
    <BookScreen contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <AppText style={styles.kicker}>処世術の体系</AppText>
        <AppText accessibilityRole="header" aria-level={1} variant="serif" style={styles.title}>{content.title}</AppText>
        <AppText variant="serif" style={styles.lead}>{content.lead}</AppText>
        <AppText style={styles.description}>{content.description}</AppText>
      </View>
      <View style={styles.section}>
        <AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.sectionTitle}>人物像から探す</AppText>
        <View style={styles.grid}>
          {category.subcategories.map((persona) => (
            <Link key={persona.name} href={{ pathname: '/subcategory/[category]/[name]', params: { category: categoryKey, name: persona.name } }} asChild>
              <Pressable accessibilityRole="link" style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
                <AppText variant="serif" style={styles.cardTitle}>{persona.articleTitle ?? persona.name}</AppText>
                <AppText style={styles.cardText}>{persona.items.filter((item) => item.status !== 'locked' && item.explanation).length}件の無料公開処世術</AppText>
                <AppText style={styles.arrow}>›</AppText>
              </Pressable>
            </Link>
          ))}
        </View>
      </View>
      <View style={styles.footer}>
        <AppText variant="serif" style={styles.footerTitle}>理論から、なぜ有効なのかを知る</AppText>
        <AppText style={styles.footerText}>処世術禄では、人物像と個別処世術を、心理学・行動科学などの理論と結び付けて整理しています。</AppText>
        <Link href="/theories" asChild><Pressable accessibilityRole="link" style={styles.outlineButton}><AppText style={styles.outlineText}>理論一覧を見る</AppText></Pressable></Link>
      </View>
    </BookScreen>
  );
}

const styles = StyleSheet.create({
  content: { maxWidth: 1080, paddingBottom: spacing.xl * 2 }, hero: { maxWidth: 740, alignSelf: 'center', paddingVertical: 36, alignItems: 'center' },
  kicker: { color: colors.gold, fontSize: 11, letterSpacing: 2, fontWeight: '700' }, title: { marginTop: 14, color: colors.ink, fontSize: 36, lineHeight: 50, letterSpacing: 3, fontWeight: '700' },
  lead: { marginTop: 22, color: colors.ink, fontSize: 19, lineHeight: 31, textAlign: 'center' }, description: { marginTop: 16, color: colors.inkSoft, fontSize: 14, lineHeight: 25, textAlign: 'center' },
  section: { marginTop: 12, borderTopWidth: 1, borderTopColor: colors.line, paddingTop: 28 }, sectionTitle: { color: colors.ink, fontSize: 23, lineHeight: 34 },
  grid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { width: '31%', flexGrow: 1, minWidth: 230, minHeight: 132, padding: 20, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface },
  cardTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' }, cardText: { marginTop: 10, color: colors.muted, fontSize: 11, lineHeight: 18 }, arrow: { position: 'absolute', right: 18, bottom: 14, color: colors.gold, fontSize: 24 },
  footer: { marginTop: 42, padding: 28, borderRadius: radius.md, backgroundColor: colors.charcoal, alignItems: 'center' }, footerTitle: { color: colors.goldLight, fontSize: 20, lineHeight: 30, textAlign: 'center' }, footerText: { maxWidth: 620, marginTop: 12, color: '#E8E1D1', fontSize: 13, lineHeight: 22, textAlign: 'center' },
  outlineButton: { minHeight: 44, marginTop: 20, paddingHorizontal: 22, borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill, justifyContent: 'center' }, outlineText: { color: colors.goldLight, fontSize: 12, fontWeight: '700' }, pressed: { opacity: 0.7 },
});
