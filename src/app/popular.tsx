import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { FREE_TECHNIQUE_IDS, FREE_THEORY_ID_SET } from '../access/access-config';
import { useAccess } from '../access/access-state';
import { BookScreen } from '../components/book-ui';
import { categoryMeta, techniqueById, theoryById } from '../data/catalog';
import { isLockedTheoryShell } from '../data/theory-display';
import { colors, fonts } from '../constants/theme';
import { loadTrendingContent, type TrendingContent } from '../lib/content-events';
import { APP_ROUTES, techniqueRoute, theoryRoute } from '../navigation/app-routes';

export default function PopularScreen() {
  const router = useRouter();
  const { accessState, catalogRevision } = useAccess();
  const [trending, setTrending] = useState<TrendingContent[] | null>(null);

  useEffect(() => {
    let active = true;
    loadTrendingContent(20).then((items) => { if (active) setTrending(items ?? []); }).catch(() => { if (active) setTrending([]); });
    return () => { active = false; };
  }, []);

  const entries = useMemo(() => (trending ?? []).flatMap((item) => {
    if (item.contentType === 'technique') {
      const card = techniqueById.get(item.contentId);
      return card && (accessState === 'paid' || FREE_TECHNIQUE_IDS.has(card.id))
        ? [{ id: card.id, title: card.title, category: categoryMeta[card.categoryKey].label, route: techniqueRoute(card.id) }]
        : [];
    }
    const card = theoryById.get(item.contentId);
    return card && !isLockedTheoryShell(card) && (accessState === 'paid' || FREE_THEORY_ID_SET.has(card.tagId))
      ? [{ id: card.tagId, title: card.title, category: '理論', route: theoryRoute(card.tagId) }]
      : [];
  }), [accessState, catalogRevision, trending]);

  return <BookScreen>
    <Text style={styles.heading}>人気の知恵</Text>
    <Text style={styles.intro}>最近よく読まれている処世術と理論</Text>
    {entries.length ? <View style={styles.list}>{entries.map((item, index) => <Pressable key={item.id} accessibilityRole="link" accessibilityLabel={`${item.title}を読む`} onPress={() => router.push(item.route)} style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
      <View style={styles.copy}><Text style={styles.category}>{item.category}</Text><Text style={styles.title}>{item.title}</Text></View>
      <Text style={styles.arrow}>›</Text>
    </Pressable>)}</View> : <Pressable accessibilityRole="link" accessibilityLabel="処世術を探す" onPress={() => router.push(APP_ROUTES.discover)} style={styles.empty}>
      <Text style={styles.emptyText}>{trending === null ? '人気の記事を読み込んでいます。' : '人気の記事は集計中です。気になる知恵を探してみましょう。'}</Text>
      <Text style={styles.emptyLink}>処世術を探す →</Text>
    </Pressable>}
  </BookScreen>;
}

const styles = StyleSheet.create({
  heading: { color: colors.ink, fontFamily: fonts.serif, fontSize: 28, fontWeight: '700', lineHeight: 40 },
  intro: { color: colors.muted, fontFamily: fonts.serif, fontSize: 13, lineHeight: 21, marginBottom: 18 },
  list: { borderTopWidth: 1, borderColor: colors.line },
  row: { minHeight: 83, flexDirection: 'row', alignItems: 'center', gap: 13, borderBottomWidth: 1, borderColor: colors.line },
  rank: { color: colors.gold, fontFamily: fonts.serif, fontSize: 18, width: 30 },
  copy: { flex: 1 },
  category: { color: '#9B6E27', fontFamily: fonts.serif, fontSize: 11 },
  title: { color: colors.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 24, marginTop: 3 },
  arrow: { color: colors.gold, fontSize: 26 },
  empty: { backgroundColor: colors.surface, borderColor: colors.line, borderWidth: 1, borderRadius: 15, padding: 18 },
  emptyText: { color: colors.inkSoft, fontFamily: fonts.serif, fontSize: 14, lineHeight: 23 },
  emptyLink: { color: colors.gold, fontFamily: fonts.serif, fontSize: 13, alignSelf: 'flex-end', marginTop: 10 },
  pressed: { opacity: 0.7 },
});
