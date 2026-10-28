import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useAccess } from '@/access/access-state';
import { canReadTheory } from '@/access/access-config';
import { catalogTheme, fonts } from '@/constants/theme';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';
import { getRelatedTheories, theoryById } from '@/data/catalog';
import { relationLabel } from '@/data/theory-knowledge';
import { theoryNetworkPoints } from '@/data/theory-network-layout';
import type { TheoryCard, TheoryRelation } from '@/data/types';
import { bundledTheoryRelations, fetchTheoryRelations } from '@/lib/theory-network';
import { AppText, SecondaryButton } from './ui';
import { RelatedContentSection } from './related-content-list';

export function TheoryNetwork({ theory }: { theory: TheoryCard }) {
  const router = useRouter();
  const graphScrollRef = useRef<ScrollView>(null);
  const { width: windowWidth } = useHydratedWindowDimensions();
  const compact = windowWidth < 700;
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
  const graphHeight = visible.length <= 3 ? 360 : 440;
  const centerY = graphHeight / 2;
  const positions = theoryNetworkPoints(graphWidth, visible.length).map(point => ({ ...point, y: centerY + (point.y - 250) * ((graphHeight - 110) / 360) }));
  const points = visible.map((entry,index) => ({ ...entry,...positions[index] }));
  const picked = entries.find(entry => entry.id === selected);
  const pickedTheory = picked ? theoryById.get(picked.id) : undefined;
  const close = () => setOpen(false);
  const selectKnowledge = (id: string) => { setSelected(id); if (compact) graphScrollRef.current?.scrollTo({ y: 0, animated: true }); };
  const selection = picked && pickedTheory ? <View testID="knowledge-graph-selection" style={styles.selection}>
            <AppText style={styles.label}>{relationLabel(picked.relation, theory.tagId)}</AppText><AppText style={styles.rowTitle}>{pickedTheory.title}</AppText>
            {picked.relation.reviewStatus === 'confirmed' && picked.relation.rationale ? <AppText style={styles.explanation}>{picked.relation.rationale}</AppText> : <AppText style={styles.note}>あわせて読む知識です。関係の種別は未確認です。</AppText>}
            <SecondaryButton tone="theory" onPress={() => { close(); router.push({ pathname: '/theory/[id]', params: { id: picked.id } }); }}>{canReadTheory(effectiveAccess, picked.id) ? 'この知識を読む' : '完全版の案内を見る'}</SecondaryButton>
          </View> : null;
  return <View style={styles.section}>
    <RelatedContentSection tone="theory" title="関連する知識" testID="theory-related-theories" items={entries.map(entry => ({
      key: entry.id, title: theoryById.get(entry.id)!.title,
      supportingText: relationLabel(entry.relation, theory.tagId),
      detailText: entry.relation.reviewStatus === 'confirmed' ? entry.relation.rationale : undefined,
      accessibilityLabel: [
        `${relationLabel(entry.relation, theory.tagId)}：${theoryById.get(entry.id)!.title}`,
        entry.relation.reviewStatus === 'confirmed' ? entry.relation.rationale : '',
      ].filter(Boolean).join('。'),
      href: { pathname: '/theory/[id]', params: { id: entry.id } },
    }))} />
    <SecondaryButton tone="theory" onPress={() => { setSelected(visible[0]?.id ?? null); setOpen(true); }}>知識のつながりを見る</SecondaryButton>
    {offline ? <AppText style={styles.note}>オフラインでは端末にある関連知識を表示します。</AppText> : null}
    <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
      <View style={styles.backdrop}><View role="dialog" aria-modal accessibilityLabel="知識のつながり" style={styles.dialog}>
        <View style={styles.dialogHeading}><AppText accessibilityRole="header" style={styles.heading}>知識のつながり</AppText><SecondaryButton tone="theory" onPress={close}>閉じる</SecondaryButton></View>
        <ScrollView ref={graphScrollRef} contentContainerStyle={styles.graphBody} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
          <AppText style={styles.note}>直接つながる知識を{visible.length}件表示。言葉や思想は実証的な証拠を意味しません。</AppText>
          {compact ? selection : null}
          {compact ? <View testID="knowledge-connections" style={styles.mobileConnections}>{visible.map(entry => <Pressable key={entry.id} accessibilityRole="button" accessibilityLabel={`関連知識を選択：${theoryById.get(entry.id)!.title}`} accessibilityState={{ selected: entry.id === selected }} onPress={() => selectKnowledge(entry.id)} style={[styles.connection, entry.id === selected && styles.selected]}><AppText style={styles.label}>{relationLabel(entry.relation, theory.tagId)}</AppText><AppText style={styles.rowTitle}>{theoryById.get(entry.id)!.title}</AppText></Pressable>)}</View> : <View testID="knowledge-graph" style={{ width: graphWidth, height: graphHeight, alignSelf: 'center' }}>
            {points.map(p => { const dx=p.x-graphWidth/2,dy=p.y-centerY; const length=Math.hypot(dx,dy);return <View key={p.id} accessible={false} style={{ position:'absolute',left:(p.x+graphWidth/2)/2-length/2,top:(p.y+centerY)/2,width:length,height:p.id === selected?2:1,backgroundColor:p.id === selected?blue.ink:blue.border,transform:[{rotate:Math.atan2(dy,dx)+'rad'}] }} />;})}
            <View testID="knowledge-graph-current" style={[styles.node, styles.currentNode, { left: graphWidth / 2 - 60, top: centerY - 45, width: 120, height: 90 }]}><AppText style={styles.currentLabel}>いま読んでいる知識</AppText><AppText numberOfLines={3} style={styles.nodeTitle}>{theory.title}</AppText></View>
            {points.map(p => <Pressable key={p.id} accessibilityRole="button" accessibilityLabel={`関連知識を選択：${theoryById.get(p.id)!.title}`} accessibilityState={{ selected: p.id === selected }} onPress={() => setSelected(p.id)} style={[styles.node, p.id === selected && styles.selected, { left: p.x - 58, top: p.y - 44, width: 116, height: 88 }]}>
              <AppText numberOfLines={1} style={styles.nodeLabel}>{relationLabel(p.relation, theory.tagId)}</AppText><AppText numberOfLines={2} style={styles.nodeTitle}>{theoryById.get(p.id)!.title}</AppText>
            </Pressable>)}
          </View>}
          {!compact ? selection : null}
          {entries.length > 6 ? <AppText style={styles.note}>ほか{entries.length - 6}件は詳細画面の一覧から読めます。</AppText> : null}
        </ScrollView>
      </View></View>
    </Modal>
  </View>;
}
const blue = catalogTheme.theory;
const styles = StyleSheet.create({
  mobileConnections: { gap: 8, marginVertical: 12 },
  connection: { padding: 12, minHeight: 72, borderWidth: 1, borderColor: blue.border, borderRadius: 10, backgroundColor: blue.surface, gap: 4 },
  section: { gap: 10, width: '100%' },
  heading: { color: blue.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 30, fontWeight: '700' },
  row: { minHeight: 64, paddingVertical: 12, paddingHorizontal: 14, borderBottomWidth: 1, borderColor: blue.border, gap: 4 },
  label: { color: blue.ink, fontSize: 12, lineHeight: 18 }, rowTitle: { color: blue.ink, fontFamily: fonts.serif, fontSize: 16, lineHeight: 25 },
  note: { fontSize: 12, lineHeight: 21, color: blue.text }, explanation: { color: blue.text, fontSize: 15, lineHeight: 27 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', padding: 12 },
  dialog: { width: '100%', maxWidth: 680, maxHeight: '92%', borderRadius: 14, padding: 12, backgroundColor: blue.surface },
  dialogHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8, paddingBottom: 8 },
  graphBody: { paddingBottom: 20 }, node: { position: 'absolute', padding: 6, justifyContent: 'center', borderWidth: 1, borderColor: blue.border, borderRadius: 10, backgroundColor: blue.surface },
  selected: { borderColor: blue.ink, borderWidth: 2 }, currentNode: { backgroundColor: blue.inactive, borderColor: blue.border },
  currentLabel: { fontSize: 12, lineHeight: 18, color: blue.text }, nodeLabel: { color: blue.ink, fontSize: 12, lineHeight: 18 }, nodeTitle: { color: blue.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 22 },
  selection: { padding: 14, gap: 10, borderWidth: 1, borderColor: blue.border, borderRadius: 10 },
});
