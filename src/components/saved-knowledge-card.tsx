import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTechnique, canReadTheory } from '@/access/access-config';
import { techniqueById, theoryById } from '@/data/catalog';
import { isRetiredTheoryId } from '@/data/theory-knowledge';
import { featureCover } from '@/data/feature-covers';
import { featureCategoryId, featureCategoryLabel } from '@/data/feature-categories';
import { featureRoute } from '@/navigation/app-routes';
import { colors, fonts } from '@/constants/theme';
import { AppText } from './ui';
import { CatalogIndexCard } from './catalog-index-card';
import { featureImage } from './feature-article';
import { KnowledgeFavoriteButton } from './knowledge-favorite-button';
import { ShoseijutsuListCard } from './shoseijutsu-card';
import { TheoryListCard } from './theory-card';
import type { PersonalContentRow } from './personal-content-card';

/** Saved IDs keep their existing storage model; the library presents them by content type. */
export function SavedKnowledgeCard({ row, onPress }: { row: PersonalContentRow; onPress: () => void }) {
  'use no memo';
  const { isPaid } = useAccess();
  const effectiveAccess = isPaid ? 'paid' : 'guest';
  const saveButton = <KnowledgeFavoriteButton kind={row.kind} id={row.id} title={row.title} />;
  if (row.kind === 'feature') {
    const source = row.article ? featureCover(row.article)?.compactSource ?? featureImage(row.article.image_path) : featureImage(null);
    const category = featureCategoryId(row.article?.category_id);
    return <CatalogIndexCard kind="feature" title={row.title} classification={category ? featureCategoryLabel(category) : undefined}
      lead={row.description} testID="saved-feature-row"
      href={featureRoute(row.article?.slug ?? row.id)} label={`${row.title}を開く`} onOpen={onPress} action={saveButton}
      cover={<Image source={source} contentFit="cover" accessible={false} cachePolicy="memory-disk" style={StyleSheet.absoluteFill} />} />;
  }
  const technique = row.kind === 'technique' ? techniqueById.get(row.id) : undefined;
  const theory = row.kind === 'theory' && !isRetiredTheoryId(row.id) ? theoryById.get(row.id) : undefined;
  return <View testID={`personal-content-${row.kind}`} style={styles.entry}>
    {technique ? <ShoseijutsuListCard card={technique} readable={canReadTechnique(effectiveAccess, technique.id) && technique.status !== 'locked'}
      onOpen={onPress} openLabel={`${row.title}を開く`} testID="saved-technique-row" />
      : theory ? <TheoryListCard theory={theory} readable={canReadTheory(effectiveAccess, theory.tagId)}
        onOpen={onPress} testID="saved-theory-row" />
        : <View testID="saved-content-unavailable" style={styles.unavailable}>
          <Pressable accessibilityRole="button" accessibilityLabel={`${row.title}を開く`} onPress={onPress}><AppText style={styles.title}>{row.title}</AppText><AppText style={styles.note}>{row.description || '保存の記録は保持されています。'}</AppText></Pressable>
          <View style={styles.actions}>{saveButton}</View>
        </View>}
  </View>;
}
const styles = StyleSheet.create({
  entry: { width: '100%', minWidth: 0 },
  unavailable: { padding: 18, borderWidth: 1, borderColor: colors.line, borderRadius: 12, backgroundColor: colors.surface },
  title: { fontFamily: fonts.serif, fontSize: 18, lineHeight: 28 }, note: { marginTop: 6, color: colors.muted, fontSize: 12, lineHeight: 20 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 8 },
});
