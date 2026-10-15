import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTheory } from '@/access/access-config';
import { colors, fonts } from '@/constants/theme';
import { getRelatedTheories, theoryById } from '@/data/catalog';
import { relationLabel } from '@/data/theory-knowledge';
import { theoryNetworkPoints } from '@/data/theory-network-layout';
import type { TheoryCard, TheoryRelation } from '@/data/types';
import { bundledTheoryRelations, fetchTheoryRelations } from '@/lib/theory-network';
import { AppText, SecondaryButton } from './ui';
import { RelatedContentSection } from './related-content-list';

export function TheoryNetwork({ theory }: { theory: TheoryCard }) {
  const router = useRouter();
  const { accessState, catalogRevision } = useAccess();
  const [relations, setRelations] = useState<TheoryRelation[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [width, setWidth] = useState(320);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    setRelations(bundledTheoryRelations(theory.tagId));
    setSelected(null); setOpen(false); setOffline(false);
  }, [theory.tagId]);
  useEffect(() => {
    let active = true;
    void fetchTheoryRelations(theory.tagId).then(rows => { if (active) setRelations(rows.filter(r => r.reviewStatus !== 'draft')); })
      .catch(() => { if (active) setOffline(true); });
    return () => { active = false; };
  }, [theory.tagId, accessState, catalogRevision]);
  const effectiveAccess = accessState === 'paid' ? 'paid' : accessState === 'free' ? 'free' : 'guest';
  // Recheck during render as well as fetching: an entitlement change must not
  // leave a protected rationale visible until the next effect runs.
  const explicit = relations.filter(r => canReadTheory(effectiveAccess, r.sourceId) && canReadTheory(effectiveAccess, r.targetId))
    .map(relation => ({ relation, id: relation.sourceId === theory.tagId ? relation.targetId : relation.sourceId }));
  const entries = [...explicit, ...getRelatedTheories(theory).filter(t => !explicit.some(r => r.id === t.tagId)).map(t => ({ id: t.tagId, relation: { sourceId: theory.tagId, targetId: t.tagId, type: 'related', reviewStatus: 'legacy', rationale: '', priority: 1000 } as TheoryRelation }))]
    .filter(r => theoryById.has(r.id)).sort((a, b) => a.relation.priority - b.relation.priority || a.id.localeCompare(b.id));
  if (!entries.length) return null;
  const visible = entries.slice(0, 6);
  const graphWidth = Math.min(width, 560);
  const positions = theoryNetworkPoints(graphWidth, visible.length);
  const points = visible.map((entry,index) => ({ ...entry,...positions[index] }));
  const picked = entries.find(entry => entry.id === selected);
  const pickedTheory = picked ? theoryById.get(picked.id) : undefined;
  const close = () => setOpen(false);
  return <View style={styles.section}>
    <RelatedContentSection title="関連する知識" testID="theory-related-theories" items={entries.map(entry => ({
      key: entry.id, title: theoryById.get(entry.id)!.title,
      supportingText: relationLabel(entry.relation, theory.tagId),
      accessibilityLabel: `${relationLabel(entry.relation, theory.tagId)}：${theoryById.get(entry.id)!.title}`,
      href: { pathname: '/theory/[id]', params: { id: entry.id } },
    }))} />
    <SecondaryButton onPress={() => { setSelected(visible[0]?.id ?? null); setOpen(true); }}>知識のつながりを見る</SecondaryButton>
    {offline ? <AppText style={styles.note}>オフラインでは端末にある関連知識を表示します。</AppText> : null}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}><View role="dialog" aria-modal accessibilityLabel="知識のつながり" style={styles.dialog}>
        <View style={styles.dialogHeading}><AppText accessibilityRole="header" style={styles.heading}>知識のつながり</AppText><SecondaryButton onPress={close}>閉じる</SecondaryButton></View>
        <ScrollView contentContainerStyle={styles.graphBody} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          <AppText style={styles.note}>直接つながる知識を{visible.length}件表示。言葉や思想は実証的な証拠を意味しません。</AppText>
          <View testID="knowledge-graph" style={{ width: graphWidth, height: 500, alignSelf: 'center' }}>
            {points.map(p => { const dx=p.x-graphWidth/2,dy=p.y-250; const length=Math.hypot(dx,dy);return <View key={p.id} accessible={false} style={{ position:'absolute',left:(p.x+graphWidth/2)/2-length/2,top:(p.y+250)/2,width:length,height:p.id === selected?2:1,backgroundColor:p.id === selected?colors.goldDeep:'#CBC3B5',transform:[{rotate:Math.atan2(dy,dx)+'rad'}] }} />;})}
            <View testID="knowledge-graph-current" style={[styles.node, styles.currentNode, { left: graphWidth / 2 - 55, top: 205, width: 110, height: 90 }]}><AppText style={styles.currentLabel}>いま読んでいる知識</AppText><AppText numberOfLines={3} style={styles.nodeTitle}>{theory.title}</AppText></View>
            {points.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`関連知識を選択：${theoryById.get(p.id)!.title}`} accessibilityState={{ selected: p.id === selected }} onPress={() => setSelected(p.id)} style={[styles.node, p.id === selected && styles.selected, { left: p.x - 50, top: p.y - 36, width: 100, height: 72 }]}>
              <AppText numberOfLines={1} style={styles.nodeLabel}>{relationLabel(p.relation, theory.tagId)}</AppText><AppText numberOfLines={2} style={styles.nodeTitle}>{theoryById.get(p.id)!.title}</AppText>
            </Pressable>)}
          </View>
          {picked && pickedTheory ? <View testID="knowledge-graph-selection" style={styles.selection}>
            <AppText style={styles.label}>{relationLabel(picked.relation, theory.tagId)}</AppText><AppText style={styles.rowTitle}>{pickedTheory.title}</AppText>
            {picked.relation.reviewStatus === 'confirmed' && picked.relation.rationale ? <AppText style={styles.explanation}>{picked.relation.rationale}</AppText> : <AppText style={styles.note}>あわせて読む知識です。関係の種別は未確認です。</AppText>}
            <SecondaryButton onPress={() => { close(); router.push({ pathname: '/theory/[id]', params: { id: picked.id } }); }}>{canReadTheory(effectiveAccess, picked.id) ? 'この知識を読む' : '完全版の案内を見る'}</SecondaryButton>
          </View> : null}
          {entries.length > 6 ? <AppText style={styles.note}>ほか{entries.length - 6}件は詳細画面の一覧から読めます。</AppText> : null}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const styles = StyleSheet.create({
  section: { gap: 10, width: '100%' },
  heading: { fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  row: { minHeight: 64, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: colors.line, gap: 4 },
  label: { color: colors.goldDeep, fontSize: 12, lineHeight: 18 }, rowTitle: { fontFamily: fonts.serif, fontSize: 16, lineHeight: 25 },
  note: { fontSize: 11, lineHeight: 18, color: colors.muted }, explanation: { fontSize: 13, lineHeight: 23 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  dialog: { width: '100%', maxWidth: 680, maxHeight: '92%', borderRadius: 14, padding: 12, backgroundColor: colors.paper },
  dialogHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingBottom: 8 },
  graphBody: { paddingBottom: 20 }, node: { position: 'absolute', padding: 6, justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: 10, backgroundColor: colors.paper },
  selected: { borderColor: colors.goldDeep, borderWidth: 2 }, currentNode: { backgroundColor: '#EEE7DA', borderColor: '#A99A83' },
  currentLabel: { fontSize: 9, lineHeight: 14, color: colors.muted }, nodeLabel: { color: colors.goldDeep, fontSize: 9, lineHeight: 14 }, nodeTitle: { fontFamily: fonts.serif, fontSize: 12, lineHeight: 18 },
  selection: { padding: 14, gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 10 },
});
