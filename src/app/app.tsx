import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { BookScreen } from '@/components/book-ui';
import { AppText } from '@/components/ui';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { COMPLETE_LEARNING_CASE_COUNT, FREE_REEL_TECHNIQUE_IDS, FREE_THEORY_IDS } from '@/access/access-config';
import { techniqueCards, theories } from '@/data/catalog';

const appStoreUrl = 'https://apps.apple.com/app/id6810376658';

export default function AppIntroductionScreen() {
  return <BookScreen contentContainerStyle={styles.content}>
    <View style={styles.hero}>
      <AppText style={styles.kicker}>iOSアプリ</AppText>
      <AppText accessibilityRole="header" aria-level={1} variant="serif" style={styles.title}>処世術禄アプリ</AppText>
      <AppText variant="serif" style={styles.lead}>知識を、迷ったときに使える判断へ。</AppText>
      <AppText style={styles.description}>Webで見つけた知恵を、保存・学習・ケース問題を通して自分の判断にしていくためのiOSアプリです。</AppText>
      <Pressable accessibilityRole="link" accessibilityLabel="App Storeで処世術禄を開く" onPress={() => void Linking.openURL(appStoreUrl)} style={styles.storeButton}><AppText style={styles.storeButtonText}>App Storeで見る</AppText></Pressable>
    </View>
    <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.sectionTitle}>Webで知り、アプリで身につける</AppText>
      <View style={styles.grid}>{[
        ['体系から探す', `処世術${techniqueCards.length}件・理論${theories.length}件を、人物像や場面からたどれます。`],
        ['保存して戻る', 'そのとき必要だった知恵を保存し、迷ったときに何度でも読み返せます。'],
        ['ケースで考える', `${COMPLETE_LEARNING_CASE_COUNT}のケース問題で、知識を状況に応じた判断へつなげます。`],
      ].map(([title, text]) => <View key={title} style={styles.card}><AppText variant="serif" style={styles.cardTitle}>{title}</AppText><AppText style={styles.cardText}>{text}</AppText></View>)}</View>
    </View>
    <View style={styles.section}><AppText accessibilityRole="header" aria-level={2} variant="serif" style={styles.sectionTitle}>無料版と完全版</AppText><View style={styles.editions}><View style={styles.edition}><AppText variant="serif" style={styles.editionTitle}>無料版</AppText><AppText style={styles.editionText}>処世術{FREE_REEL_TECHNIQUE_IDS.length}件・理論{FREE_THEORY_IDS.length}件を公開。まずは体系の一部から、自分に合う知恵を探せます。</AppText></View><View style={[styles.edition, styles.complete]}><AppText variant="serif" style={styles.completeTitle}>完全版</AppText><AppText style={styles.completeText}>処世術{techniqueCards.length}件・理論{theories.length}件と全ケース問題にアクセスできます。価格・利用条件はアプリ内の完全版画面で確認できます。</AppText></View></View></View>
    <View style={styles.notice}><AppText style={styles.noticeText}>本アプリは一般的な情報と判断の視点を提供するもので、医療・法律・金融その他の専門的助言を代替しません。</AppText></View>
  </BookScreen>;
}

const styles = StyleSheet.create({ content: { maxWidth: 920, paddingBottom: spacing.xl * 2 }, hero: { paddingVertical: 44, alignItems: 'center' }, kicker: { color: colors.gold, fontSize: 11, fontWeight: '700', letterSpacing: 2 }, title: { marginTop: 15, color: colors.ink, fontSize: 36, lineHeight: 50, fontWeight: '700' }, lead: { marginTop: 22, color: colors.ink, fontSize: 20, lineHeight: 31, textAlign: 'center' }, description: { maxWidth: 650, marginTop: 15, color: colors.inkSoft, fontSize: 14, lineHeight: 24, textAlign: 'center' }, storeButton: { minHeight: 52, marginTop: 26, paddingHorizontal: 28, borderRadius: radius.pill, backgroundColor: colors.charcoal, justifyContent: 'center' }, storeButtonText: { color: colors.goldLight, fontSize: 14, fontWeight: '700' }, section: { marginTop: 24, paddingTop: 30, borderTopWidth: 1, borderTopColor: colors.line }, sectionTitle: { color: colors.ink, fontSize: 23, lineHeight: 34 }, grid: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, card: { flex: 1, minWidth: 220, minHeight: 152, padding: 20, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md, backgroundColor: colors.surface }, cardTitle: { color: colors.ink, fontSize: 18, lineHeight: 27, fontWeight: '700' }, cardText: { marginTop: 11, color: colors.inkSoft, fontSize: 13, lineHeight: 22 }, editions: { marginTop: 18, flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, edition: { flex: 1, minWidth: 280, padding: 22, borderWidth: 1, borderColor: colors.line, borderRadius: radius.md }, complete: { borderColor: colors.gold, backgroundColor: colors.charcoal }, editionTitle: { color: colors.ink, fontSize: 20, lineHeight: 30, fontWeight: '700' }, completeTitle: { color: colors.goldLight, fontSize: 20, lineHeight: 30, fontWeight: '700' }, editionText: { marginTop: 10, color: colors.inkSoft, fontSize: 13, lineHeight: 22 }, completeText: { marginTop: 10, color: '#E8E1D1', fontSize: 13, lineHeight: 22 }, notice: { marginTop: 34, padding: 18, borderRadius: radius.md, backgroundColor: colors.paperDeep }, noticeText: { color: colors.muted, fontSize: 12, lineHeight: 20 }, });
