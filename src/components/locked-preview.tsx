import { Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppText } from '@/components/ui';
import { COMPLETE_EDITION_PRICE_JPY } from '@/lib/purchase';
import { colors, fonts } from '@/constants/theme';

const sourceCopy = {
  reel: 'この一手の背景にある理論と、関連する処世術を読めます。',
  discover_technique: '同じ状況で使える一手と、その背景にある理論を体系的に読めます。',
  discover_theory: '理論の意味だけでなく、現実の場面でどう使うかまで読めます。',
  learning: '実例・ケースを通して、判断を自分のものにできます。',
  my_os: '知識を保存し、自分の判断基準として積み上げられます。',
} as const;

type Source = keyof typeof sourceCopy;

export function LockedPreview({
  source,
  title = 'この先に、さらに深い知識があります。',
  description,
  count,
}: {
  source: Source;
  title?: string;
  description?: string;
  count?: number;
}) {
  const router = useRouter();
  const goToUpgrade = () => router.push({ pathname: '/upgrade', params: { source } });

  return (
    <View style={styles.wrapper}>
      <View style={styles.introduction}>
        <View style={styles.goldBar} />
        <View style={styles.introductionCopy}>
          <AppText variant="serif" style={styles.introductionTitle}>{title}</AppText>
          <AppText style={styles.introductionBody}>{description ?? sourceCopy[source]}</AppText>
        </View>
      </View>

      <View style={styles.benefits}>
        <Benefit icon="☝" lines={['同じ状況で使える', '一手を厳選']} />
        <Benefit icon="▤" lines={['心理学・行動科学・', '戦略論を整理']} divided />
        <Benefit icon="♧" lines={['実例・ケースで', '理解が深まる']} divided />
      </View>

      <View style={styles.lockedList}>
        <LockedRow badge="理論" first />
        <LockedRow badge="解説" />
        <LockedRow badge="ケース" />
        <View style={styles.lockedFoot}>
          <AppText style={styles.lockedFootIcon}>♙</AppText>
          <AppText style={styles.lockedFootText}>この先{typeof count === 'number' ? `${count}件` : ''}は「処世術禄 完全版」でご覧いただけます。</AppText>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="完全版の購入画面を開く"
        onPress={goToUpgrade}
        style={({ pressed }) => [styles.productCard, pressed && styles.pressed]}
      >
        <View style={styles.productTop}>
          <EditionCover />
          <View style={styles.productCopy}>
            <AppText variant="serif" style={styles.productTitle}>処世術禄 完全版</AppText>
            <View style={styles.priceLine}>
              <AppText variant="serif" style={styles.price}>¥{COMPLETE_EDITION_PRICE_JPY}</AppText>
              <View style={styles.buyout}><AppText style={styles.buyoutText}>買い切り・追加課金なし</AppText></View>
            </View>
            <AppText style={styles.productMeta}>♧　434の処世術・526の理論・全21ケース</AppText>
          </View>
        </View>
        <View style={styles.productCta}>
          <AppText variant="serif" style={styles.productCtaText}>この分類を解放する</AppText>
          <AppText style={styles.productCtaArrow}>›</AppText>
        </View>
        <View style={styles.reassurance}><AppText style={styles.reassuranceText}>♢　体系的に学び、どんな人間関係でもブレない自分になる。</AppText></View>
      </Pressable>
    </View>
  );
}

function Benefit({ icon, lines, divided = false }: { icon: string; lines: string[]; divided?: boolean }) {
  return (
    <View style={[styles.benefit, divided && styles.benefitDivided]}>
      <View style={styles.benefitIcon}><AppText style={styles.benefitIconText}>{icon}</AppText></View>
      <AppText style={styles.benefitText}>{lines.join('\n')}</AppText>
    </View>
  );
}

function LockedRow({ badge, first = false }: { badge: string; first?: boolean }) {
  return (
    <View style={[styles.lockedRow, first && styles.lockedRowFirst]}>
      <View style={styles.lockSeal}><AppText style={styles.lockSealText}>▣</AppText></View>
      <View style={styles.blurredCopy}>
        <View style={[styles.blurLine, styles.blurStrong]} />
        <View style={styles.blurLine} />
      </View>
      <View style={styles.badge}><AppText style={styles.badgeText}>{badge}</AppText></View>
      <AppText style={styles.rowChevron}>›</AppText>
    </View>
  );
}

export function EditionCover({ small = false }: { small?: boolean }) {
  return (
    <View style={[styles.cover, small && styles.coverSmall]}>
      <View style={styles.coverGlow} />
      <AppText variant="serif" style={[styles.coverName, small && styles.coverNameSmall]}>処世術{`\n`}禄</AppText>
      <View style={styles.coverEdition}><AppText style={styles.coverEditionText}>完全版</AppText></View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { width: '100%', maxWidth: 680, alignSelf: 'center', marginTop: 28 },
  introduction: { flexDirection: 'row', gap: 18, paddingHorizontal: 4 },
  goldBar: { width: 5, minHeight: 105, backgroundColor: '#B58732' },
  introductionCopy: { flex: 1, paddingRight: 2 },
  introductionTitle: { color: '#171713', fontSize: 25, lineHeight: 37, fontWeight: '700', letterSpacing: 0.5 },
  introductionBody: { marginTop: 12, color: '#33342F', fontSize: 14, lineHeight: 24 },
  benefits: { flexDirection: 'row', marginTop: 26, paddingHorizontal: 2 },
  benefit: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  benefitDivided: { borderLeftWidth: 1, borderLeftColor: '#D9D0C0' },
  benefitIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F1EBE0', alignItems: 'center', justifyContent: 'center' },
  benefitIconText: { color: '#201F1A', fontSize: 21, lineHeight: 24 },
  benefitText: { flex: 1, color: '#3D3D38', fontSize: 11, lineHeight: 18, fontWeight: '600' },
  lockedList: { marginTop: 24, overflow: 'hidden', borderWidth: 1, borderColor: '#D7CEC0', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.38)' },
  lockedRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 14, borderTopWidth: 1, borderColor: '#E0D8CC' },
  lockedRowFirst: { borderTopWidth: 0 },
  lockSeal: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: '#D8C8AA', alignItems: 'center', justifyContent: 'center' },
  lockSealText: { color: '#B58C3D', fontSize: 18 },
  blurredCopy: { flex: 1, gap: 8 },
  blurLine: { width: '72%', height: 8, borderRadius: 6, backgroundColor: '#D9D7D1' },
  blurStrong: { width: '88%', height: 12, backgroundColor: '#C2C0BA' },
  badge: { paddingHorizontal: 11, paddingVertical: 6, borderRadius: 18, backgroundColor: '#F1ECE4' },
  badgeText: { color: '#4F4C45', fontSize: 11, fontWeight: '600' },
  rowChevron: { color: '#64625C', fontSize: 33, lineHeight: 34, fontWeight: '300' },
  lockedFoot: { minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderTopWidth: 1, borderColor: '#D9D0C3' },
  lockedFootIcon: { color: '#777671', fontSize: 17 },
  lockedFootText: { color: '#686863', fontSize: 11, lineHeight: 17 },
  productCard: { marginTop: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#D7CEC0', borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.38)' },
  productTop: { flexDirection: 'row', alignItems: 'center', gap: 20, padding: 12 },
  cover: { position: 'relative', width: 142, height: 142, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#1B1D1B' },
  coverSmall: { width: 128, height: 128 },
  coverGlow: { position: 'absolute', width: 170, height: 170, borderRadius: 85, backgroundColor: 'rgba(178,132,45,0.10)', transform: [{ scaleX: 0.6 }] },
  coverName: { color: '#CFAB56', fontSize: 25, lineHeight: 38, textAlign: 'center', fontWeight: '700' },
  coverNameSmall: { fontSize: 23, lineHeight: 35 },
  coverEdition: { position: 'absolute', bottom: 15, borderWidth: 1, borderColor: '#C49A41', borderRadius: 4, paddingHorizontal: 12, paddingVertical: 3 },
  coverEditionText: { color: '#D2B36E', fontFamily: fonts.serif, fontSize: 10, lineHeight: 15, letterSpacing: 2 },
  productCopy: { flex: 1, minWidth: 0 },
  productTitle: { color: '#1B1B18', fontSize: 22, lineHeight: 31, fontWeight: '700' },
  priceLine: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginTop: 6 },
  price: { color: '#F04A17', fontSize: 40, lineHeight: 48, fontWeight: '700' },
  buyout: { borderWidth: 1, borderColor: '#D8CFC1', borderRadius: 6, paddingHorizontal: 9, paddingVertical: 5 },
  buyoutText: { color: '#876832', fontSize: 10, fontWeight: '600' },
  productMeta: { marginTop: 6, color: '#53524C', fontSize: 11, lineHeight: 17 },
  productCta: { minHeight: 62, margin: 12, marginTop: 4, paddingHorizontal: 22, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', borderRadius: 8, backgroundColor: '#F24A17' },
  productCtaText: { color: '#FFFDF8', fontSize: 22, lineHeight: 30, fontWeight: '700' },
  productCtaArrow: { position: 'absolute', right: 22, color: '#FFFDF8', fontSize: 38, lineHeight: 38, fontWeight: '300' },
  reassurance: { minHeight: 46, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14 },
  reassuranceText: { color: '#74736D', fontSize: 11, lineHeight: 18, textAlign: 'center' },
  pressed: { opacity: 0.72 },
});
