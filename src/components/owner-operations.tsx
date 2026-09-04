import { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAccess } from '@/access/access-state';
import { useAppToast } from '@/components/app-toast';
import { AppText, EmptyState, Screen } from '@/components/ui';
import { colors, fonts, radius, shadow, spacing } from '@/constants/theme';
import {
  BUNDLED_OPERATIONS,
  FAQ_STATUSES,
  INQUIRY_CATEGORIES,
  INQUIRY_STATUSES,
  INQUIRY_URGENCIES,
  SOCIAL_STATUSES,
  appendActivityLog,
  loadOperationsData,
  saveFaqCandidate,
  saveInquiry,
  saveSocialPost,
  type ActivityLog,
  type AiTask,
  type FaqCandidate,
  type Inquiry,
  type InquiryStatus,
  type OperationsData,
  type SocialPost,
  type SocialStatus,
} from '@/data/operations';
import { useHydratedWindowDimensions } from '@/hooks/use-hydrated-window-dimensions';

export type OperationsSection = 'dashboard' | 'inquiries' | 'social' | 'tasks' | 'faq' | 'logs';

const NAV_ITEMS: { key: OperationsSection; label: string; href: string }[] = [
  { key: 'dashboard', label: 'ダッシュボード', href: '/owner/operations' },
  { key: 'inquiries', label: '問い合わせ', href: '/owner/operations/inquiries' },
  { key: 'social', label: 'SNS', href: '/owner/operations/social' },
  { key: 'tasks', label: 'AIタスク', href: '/owner/operations/tasks' },
  { key: 'faq', label: 'FAQ候補', href: '/owner/operations/faq' },
  { key: 'logs', label: '運用ログ', href: '/owner/operations/logs' },
];

export function OwnerOperationsScreen({ section }: { section: OperationsSection }) {
  const { isOwner } = useAccess();
  const [data, setData] = useState<OperationsData>(BUNDLED_OPERATIONS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOwner) return;
    let active = true;
    setLoading(true);
    void loadOperationsData().then((nextData) => {
      if (active) setData(nextData);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [isOwner]);

  if (!isOwner) {
    return (
      <Screen>
        <EmptyState title="owner権限が必要です" description="運用管制塔はオーナーだけが確認できます。" />
      </Screen>
    );
  }

  const replaceInquiry = (next: Inquiry) => setData((current) => ({
    ...current,
    inquiries: current.inquiries.map((item) => item.id === next.id ? next : item),
  }));
  const replaceSocial = (next: SocialPost) => setData((current) => ({
    ...current,
    socialPosts: current.socialPosts.map((item) => item.id === next.id ? next : item),
  }));
  const replaceFaq = (next: FaqCandidate) => setData((current) => ({
    ...current,
    faqCandidates: current.faqCandidates.map((item) => item.id === next.id ? next : item),
  }));

  return (
    <Screen contentContainerStyle={styles.screenContent} testID="owner-operations-page">
      <OperationsHeader section={section} data={data} />
      {data.warning ? <View style={styles.warning}><AppText style={styles.warningText}>{data.warning}</AppText></View> : null}
      {loading ? <AppText style={styles.loading}>運用情報を更新しています…</AppText> : null}
      {section === 'dashboard' ? <Dashboard data={data} /> : null}
      {section === 'inquiries' ? <Inquiries data={data} onChange={replaceInquiry} /> : null}
      {section === 'social' ? <SocialPosts data={data} onChange={replaceSocial} /> : null}
      {section === 'tasks' ? <AiTasks tasks={data.aiTasks} /> : null}
      {section === 'faq' ? <FaqCandidates items={data.faqCandidates} onChange={replaceFaq} /> : null}
      {section === 'logs' ? <ActivityLogs items={data.activityLog} /> : null}
    </Screen>
  );
}

function OperationsHeader({ section, data }: { section: OperationsSection; data: OperationsData }) {
  const router = useRouter();
  const current = NAV_ITEMS.find((item) => item.key === section) ?? NAV_ITEMS[0];
  const failedTasks = data.aiTasks.filter((task) => task.status === 'failure').length;
  return (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <View style={styles.headerCopy}>
          <AppText variant="label" style={styles.eyebrow}>OWNER OPERATIONS</AppText>
          <AppText variant="serif" style={styles.headerTitle}>運用管制塔</AppText>
          <AppText style={styles.headerDescription}>判断が必要なものだけを、静かに浮かび上がらせます。</AppText>
        </View>
        <View style={[styles.systemState, failedTasks > 0 && styles.systemStateAlert]}>
          <AppText variant="label" style={styles.systemStateLabel}>AIタスク</AppText>
          <AppText style={[styles.systemStateValue, failedTasks > 0 && styles.systemStateValueAlert]}>{failedTasks ? `${failedTasks}件失敗` : 'すべて正常'}</AppText>
        </View>
      </View>
      <View accessibilityRole="tablist" style={styles.nav}>
        {NAV_ITEMS.map((item) => {
          const active = item.key === section;
          return (
            <Pressable
              key={item.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              onPress={() => router.push(item.href as never)}
              style={({ pressed }) => [styles.navItem, active && styles.navItemActive, pressed && styles.pressed]}
            >
              <AppText style={[styles.navText, active && styles.navTextActive]}>{item.label}</AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.locationLine}>
        <View style={styles.locationMark} />
        <AppText style={styles.locationText}>{current.label}</AppText>
        <AppText style={styles.sourceText}>{data.source === 'database' ? 'LIVE DATA' : 'SAMPLE / FALLBACK'}</AppText>
      </View>
    </View>
  );
}

function Dashboard({ data }: { data: OperationsData }) {
  const router = useRouter();
  const { width } = useHydratedWindowDimensions();
  const compact = width < 700;
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);
  const needsReply = data.inquiries.filter((item) => item.status === '要返信');
  const needsReview = data.inquiries.filter((item) => ['未確認', '要確認'].includes(item.status));
  const aiDrafts = data.inquiries.filter((item) => item.aiReplyDraft && !['対応済み', '対応不要'].includes(item.status));
  const awaitingApproval = data.socialPosts.filter((item) => item.status === '承認待ち');
  const scheduled = data.socialPosts.filter((item) => item.scheduledAt && new Date(item.scheduledAt) >= weekStart && new Date(item.scheduledAt) < weekEnd);
  const faqCandidates = data.faqCandidates.filter((item) => item.status === '候補');
  const failedTasks = data.aiTasks.filter((item) => item.status === 'failure');
  const handledThisWeek = data.inquiries.filter((item) => item.status === '対応済み' && new Date(item.updatedAt) >= weekStart).length;
  const completedTasks = data.aiTasks.filter((item) => new Date(item.lastRunAt) >= weekStart);
  const successRate = completedTasks.length ? Math.round(completedTasks.filter((item) => item.status === 'success').length / completedTasks.length * 100) : 100;
  const priorities = [
    ...needsReply.map((item) => ({ key: item.id, level: item.urgency === 'high' ? 'high' : 'medium', text: `${item.category}「${item.subject}」に返信が必要`, href: '/owner/operations/inquiries' })),
    ...(awaitingApproval.length ? [{ key: 'social', level: 'medium', text: `X投稿 ${awaitingApproval.length}件が未承認`, href: '/owner/operations/social' }] : []),
    ...(faqCandidates.length ? [{ key: 'faq', level: 'low', text: `FAQ候補 ${faqCandidates.length}件を確認`, href: '/owner/operations/faq' }] : []),
    ...failedTasks.map((task) => ({ key: task.id, level: 'high', text: `${task.name}が失敗。入力元の確認が必要`, href: '/owner/operations/tasks' })),
  ];
  const metrics = [
    { label: '要対応問い合わせ', value: needsReply.length + needsReview.length, emphasis: needsReply.length > 0 },
    { label: 'AI返信案あり', value: aiDrafts.length },
    { label: 'SNS承認待ち', value: awaitingApproval.length, emphasis: awaitingApproval.length > 0 },
    { label: '今週の予約投稿', value: scheduled.length },
    { label: 'FAQ候補', value: faqCandidates.length },
    { label: 'AIタスク異常', value: failedTasks.length, danger: failedTasks.length > 0 },
  ];

  return (
    <View testID="operations-dashboard">
      <SectionHeading eyebrow="TODAY" title="今日の運用状況" description="件数の多さではなく、判断の優先度順に並べています。" />
      <View style={[styles.todayPanel, compact && styles.todayPanelCompact]}>
        <View style={[styles.primaryMetric, compact && styles.primaryMetricCompact]}>
          <AppText variant="label" style={styles.primaryMetricLabel}>最優先</AppText>
          <AppText variant="serif" style={styles.primaryMetricValue}>{needsReply.length + failedTasks.length}</AppText>
          <AppText style={styles.primaryMetricTitle}>すぐに確認する項目</AppText>
          <AppText style={styles.primaryMetricDetail}>{needsReply.length ? '返信判断が必要な問い合わせがあります。' : failedTasks.length ? '停止したAIタスクがあります。' : '急ぎの対応はありません。'}</AppText>
        </View>
        <View style={[styles.metricList, compact && styles.metricListCompact]}>
          {metrics.map((metric) => (
            <View key={metric.label} style={[styles.metricRow, metric.emphasis && styles.metricRowEmphasis, metric.danger && styles.metricRowDanger]}>
              <AppText style={styles.metricLabel}>{metric.label}</AppText>
              <AppText style={[styles.metricValue, metric.danger && styles.dangerText]}>{metric.value}<AppText style={styles.metricUnit}> 件</AppText></AppText>
            </View>
          ))}
        </View>
      </View>

      <SectionHeading title="今日確認すること" />
      <View style={styles.actionList}>
        {priorities.length ? priorities.map((item, index) => (
          <Pressable key={item.key} onPress={() => router.push(item.href as never)} style={({ pressed }) => [styles.actionRow, item.level === 'high' && styles.actionRowHigh, pressed && styles.pressed]}>
            <AppText variant="label" style={[styles.actionIndex, item.level === 'high' && styles.actionIndexHigh]}>{String(index + 1).padStart(2, '0')}</AppText>
            <AppText style={styles.actionText}>{item.text}</AppText>
            <AppText style={styles.actionArrow}>›</AppText>
          </Pressable>
        )) : (
          <View style={styles.quietEmpty}><AppText variant="serif" style={styles.quietEmptyTitle}>現在、確認が必要な項目はありません</AppText><AppText style={styles.quietEmptyText}>次回の自動更新まで、この画面を閉じて大丈夫です。</AppText></View>
        )}
      </View>

      <SectionHeading eyebrow="RECENT" title="最近の運用" />
      <View style={styles.recentGrid}>
        <RecentBlock title="最新問い合わせ" value={data.inquiries[0]?.subject ?? '新着なし'} meta={data.inquiries[0] ? `${formatDate(data.inquiries[0].receivedAt)} · ${data.inquiries[0].status}` : ''} />
        <RecentBlock title="最新SNS投稿候補" value={excerpt(data.socialPosts[0]?.body ?? '候補なし', 52)} meta={data.socialPosts[0] ? `${data.socialPosts[0].format} · ${data.socialPosts[0].status}` : ''} />
        <RecentBlock title="最近完了したAIタスク" value={data.aiTasks.find((task) => task.status === 'success')?.name ?? '完了記録なし'} meta={data.aiTasks.find((task) => task.status === 'success')?.summary ?? ''} />
        <RecentBlock title="最近発生したエラー" value={failedTasks[0]?.name ?? 'エラーはありません'} meta={failedTasks[0]?.error ?? 'すべての処理が正常に完了しています。'} danger={Boolean(failedTasks[0])} />
      </View>

      <SectionHeading eyebrow="THIS WEEK" title="今週" />
      <View style={styles.weekStrip}>
        <WeekMetric label="投稿予定数" value={`${scheduled.length}件`} />
        <WeekMetric label="対応済み問い合わせ" value={`${handledThisWeek}件`} />
        <WeekMetric label="未対応問い合わせ" value={`${needsReply.length + needsReview.length}件`} />
        <WeekMetric label="AIタスク成功率" value={`${successRate}%`} />
      </View>
    </View>
  );
}

function Inquiries({ data, onChange }: { data: OperationsData; onChange: (item: Inquiry) => void }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 820;
  const [filter, setFilter] = useState<InquiryStatus | 'すべて'>('すべて');
  const filtered = filter === 'すべて' ? data.inquiries : data.inquiries.filter((item) => item.status === filter);
  const [selectedId, setSelectedId] = useState(data.inquiries[0]?.id ?? '');
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];

  return (
    <View testID="operations-inquiries">
      <SectionHeading eyebrow="INQUIRIES" title="問い合わせ" description="AIが整理した内容を確認し、返信判断と対応履歴を残します。ここからメールは送信しません。" />
      <FilterRail values={['すべて', ...INQUIRY_STATUSES]} value={filter} onChange={(value) => setFilter(value as InquiryStatus | 'すべて')} />
      <View style={[styles.masterDetail, compact && styles.masterDetailCompact]}>
        <View style={[styles.masterPane, compact && styles.masterPaneCompact]}>
          <AppText variant="label" style={styles.paneLabel}>一覧 {filtered.length}件</AppText>
          {filtered.length ? filtered.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={({ pressed }) => [styles.listRow, selected?.id === item.id && styles.listRowSelected, pressed && styles.pressed]}>
              <View style={styles.listMeta}><StatusLabel value={item.status} danger={item.urgency === 'high'} /><AppText style={styles.listDate}>{formatDate(item.receivedAt)}</AppText></View>
              <AppText style={styles.listTitle}>{item.subject}</AppText>
              <AppText numberOfLines={2} style={styles.listSummary}>{item.aiSummary}</AppText>
              <AppText style={styles.listFoot}>{item.category} · {urgencyLabel(item.urgency)}</AppText>
            </Pressable>
          )) : <CompactEmpty text="この条件の問い合わせはありません。" />}
        </View>
        <View style={[styles.detailPane, compact && styles.detailPaneCompact]}>
          {selected ? <InquiryDetail key={selected.id} item={selected} onChange={onChange} /> : <CompactEmpty text="問い合わせを選択してください。" />}
        </View>
      </View>
    </View>
  );
}

function InquiryDetail({ item, onChange }: { item: Inquiry; onChange: (item: Inquiry) => void }) {
  const showToast = useAppToast();
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);
  const save = async () => {
    setSaving(true);
    const next = { ...draft, updatedAt: new Date().toISOString() };
    try {
      await saveInquiry(next);
      await logOwnerAction('問い合わせを更新', item.id, `${next.status} · ${next.category}`).catch(() => undefined);
      onChange(next);
      showToast('問い合わせの整理内容を保存しました');
    } catch {
      showToast('保存できませんでした。接続を確認してください');
    } finally { setSaving(false); }
  };
  return (
    <View>
      <View style={styles.detailHeading}>
        <View style={styles.detailHeadingCopy}><AppText variant="label" style={styles.paneLabel}>{item.id}</AppText><AppText variant="serif" style={styles.detailTitle}>{item.subject}</AppText><AppText style={styles.detailMeta}>{item.sender}{'\n'}{formatDateTime(item.receivedAt)} · 更新 {formatDateTime(item.updatedAt)}</AppText></View>
        <StatusLabel value={draft.status} danger={draft.urgency === 'high'} />
      </View>
      <DetailSection label="元問い合わせ内容"><AppText style={styles.bodyCopy}>{item.originalBody || '本文は保存されていません。'}</AppText><AppText style={styles.reference}>参照: {item.sourceRef || 'なし'}</AppText></DetailSection>
      <DetailSection label="AI要約"><AppText style={styles.bodyCopy}>{item.aiSummary || '要約はありません。'}</AppText></DetailSection>
      <View style={styles.aiDraftSection}>
        <View style={styles.aiDraftHeader}><AppText variant="label" style={styles.aiDraftLabel}>AIによる返信案</AppText><CopyButton value={item.aiReplyDraft} /></View>
        <AppText style={styles.aiCaution}>内容を確認・修正してからお使いください。この画面からは送信されません。</AppText>
        <AppText style={styles.aiDraftBody}>{item.aiReplyDraft || '返信案はまだ生成されていません。'}</AppText>
      </View>
      <DetailSection label="分類と状態">
        <AppText style={styles.fieldCaption}>カテゴリ</AppText>
        <FilterRail values={INQUIRY_CATEGORIES} value={draft.category} onChange={(category) => setDraft((current) => ({ ...current, category: category as Inquiry['category'] }))} compact />
        <AppText style={styles.fieldCaption}>緊急度</AppText>
        <FilterRail values={INQUIRY_URGENCIES} value={draft.urgency} onChange={(urgency) => setDraft((current) => ({ ...current, urgency: urgency as Inquiry['urgency'] }))} compact labelFor={urgencyLabel} />
        <AppText style={styles.fieldCaption}>ステータス</AppText>
        <FilterRail values={INQUIRY_STATUSES} value={draft.status} onChange={(status) => setDraft((current) => ({ ...current, status: status as InquiryStatus }))} compact />
      </DetailSection>
      <Field label="オーナーメモ" value={draft.ownerMemo} onChangeText={(ownerMemo) => setDraft((current) => ({ ...current, ownerMemo }))} multiline placeholder="確認したこと、返信後の経過など" />
      <ActionButton label={saving ? '保存中…' : '整理内容を保存'} onPress={() => void save()} disabled={saving} />
    </View>
  );
}

function SocialPosts({ data, onChange }: { data: OperationsData; onChange: (item: SocialPost) => void }) {
  const { width } = useHydratedWindowDimensions();
  const compact = width < 820;
  const [filter, setFilter] = useState<SocialStatus | 'すべて'>('すべて');
  const filtered = filter === 'すべて' ? data.socialPosts : data.socialPosts.filter((item) => item.status === filter);
  const [selectedId, setSelectedId] = useState(data.socialPosts[0]?.id ?? '');
  const selected = filtered.find((item) => item.id === selectedId) ?? filtered[0];
  return (
    <View testID="operations-social">
      <SectionHeading eyebrow="SOCIAL" title="SNS投稿候補" description="AIが生成した候補を読み、承認後にX側で予約投稿するための確認面です。" />
      <FilterRail values={['すべて', ...SOCIAL_STATUSES]} value={filter} onChange={(value) => setFilter(value as SocialStatus | 'すべて')} />
      <View style={[styles.masterDetail, compact && styles.masterDetailCompact]}>
        <View style={[styles.masterPane, compact && styles.masterPaneCompact]}>
          <AppText variant="label" style={styles.paneLabel}>候補 {filtered.length}件</AppText>
          {filtered.length ? filtered.map((item) => (
            <Pressable key={item.id} onPress={() => setSelectedId(item.id)} style={({ pressed }) => [styles.listRow, selected?.id === item.id && styles.listRowSelected, pressed && styles.pressed]}>
              <View style={styles.listMeta}><StatusLabel value={item.status} /><AppText style={styles.listDate}>{item.scheduledAt ? formatDate(item.scheduledAt) : '日程未定'}</AppText></View>
              <AppText numberOfLines={3} style={styles.socialExcerpt}>{item.body}</AppText>
              <AppText style={styles.listFoot}>{item.format} · {sourceLabel(item)}</AppText>
            </Pressable>
          )) : <CompactEmpty text="この条件の投稿候補はありません。" />}
        </View>
        <View style={[styles.detailPane, compact && styles.detailPaneCompact]}>{selected ? <SocialDetail key={selected.id} item={selected} onChange={onChange} /> : <CompactEmpty text="投稿候補を選択してください。" />}</View>
      </View>
    </View>
  );
}

function SocialDetail({ item, onChange }: { item: SocialPost; onChange: (item: SocialPost) => void }) {
  const showToast = useAppToast();
  const [draft, setDraft] = useState(item);
  const [saving, setSaving] = useState(false);
  const persist = async (override?: Partial<SocialPost>, message = '投稿候補を保存しました') => {
    setSaving(true);
    const next = { ...draft, ...override, updatedAt: new Date().toISOString() };
    try {
      await saveSocialPost(next);
      await logOwnerAction('SNS投稿候補を更新', item.id, `${next.status} · ${next.scheduledAt ?? '日程未定'}`).catch(() => undefined);
      setDraft(next);
      onChange(next);
      showToast(message);
    } catch { showToast('保存できませんでした。接続を確認してください'); }
    finally { setSaving(false); }
  };
  return (
    <View>
      <View style={styles.detailHeading}><View style={styles.detailHeadingCopy}><AppText variant="label" style={styles.paneLabel}>{item.targetSns} · {item.format}</AppText><AppText style={styles.detailMeta}>生成 {formatDateTime(item.generatedAt)} · 類似度 {Math.round(item.similarity * 100)}%</AppText></View><StatusLabel value={draft.status} /></View>
      <Field label="投稿本文" value={draft.body} onChangeText={(body) => setDraft((current) => ({ ...current, body }))} multiline tall />
      <View style={styles.inlineActions}><CopyButton value={draft.body} prominent /><ActionButton label="承認" onPress={() => void persist({ status: '承認済み' }, '投稿候補を承認しました')} disabled={saving} compact /><QuietButton label="却下" onPress={() => void persist({ status: '却下' }, '投稿候補を却下しました')} danger /></View>
      <DetailSection label="生成の根拠"><AppText style={styles.bodyCopy}>{item.aiReason}</AppText><AppText style={styles.reference}>元コンテンツ: {sourceLabel(item)}</AppText></DetailSection>
      <Field label="投稿予定日時" value={draft.scheduledAt ?? ''} onChangeText={(scheduledAt) => setDraft((current) => ({ ...current, scheduledAt: scheduledAt.trim() || null }))} placeholder="例: 2026-09-08T20:00:00+09:00" />
      <AppText style={styles.fieldHint}>X側で設定した予約日時と同じ値を記録してください。</AppText>
      <AppText style={styles.fieldCaption}>ステータス</AppText>
      <FilterRail values={SOCIAL_STATUSES} value={draft.status} onChange={(status) => setDraft((current) => ({ ...current, status: status as SocialStatus }))} compact />
      <Field label="オーナーメモ" value={draft.ownerMemo} onChangeText={(ownerMemo) => setDraft((current) => ({ ...current, ownerMemo }))} multiline placeholder="表現の調整方針、X側の予約状況など" />
      {item.performance ? <DetailSection label="投稿後実績"><View style={styles.performanceRow}><WeekMetric label="表示" value={formatNumber(item.performance.impressions)} /><WeekMetric label="いいね" value={formatNumber(item.performance.likes)} /><WeekMetric label="再投稿" value={formatNumber(item.performance.reposts)} /><WeekMetric label="保存" value={formatNumber(item.performance.bookmarks)} /></View></DetailSection> : null}
      <ActionButton label={saving ? '保存中…' : '編集内容を保存'} onPress={() => void persist()} disabled={saving} />
    </View>
  );
}

function AiTasks({ tasks }: { tasks: AiTask[] }) {
  const failures = tasks.filter((task) => task.status === 'failure').length;
  return (
    <View testID="operations-tasks">
      <SectionHeading eyebrow="AI TASKS" title="AIタスク" description="Codex / ChatGPT等の定期処理が、何を更新し、どこで止まったかを確認します。" />
      <View style={[styles.taskSummary, failures > 0 && styles.taskSummaryAlert]}><AppText variant="serif" style={styles.taskSummaryTitle}>{failures ? `${failures}件失敗` : 'すべて正常'}</AppText><AppText style={styles.taskSummaryText}>{failures ? 'エラー内容と入力元を確認してください。自動化そのものの編集は各サービス側で行います。' : '直近の定期処理はすべて完了しています。'}</AppText></View>
      <View style={styles.taskList}>
        {tasks.length ? tasks.map((task) => (
          <View key={task.id} style={[styles.taskRow, task.status === 'failure' && styles.taskRowFailure]}>
            <View style={styles.taskHeader}><View style={styles.taskTitleCopy}><AppText variant="serif" style={styles.taskTitle}>{task.name}</AppText><AppText style={styles.taskTime}>最終実行 {formatDateTime(task.lastRunAt)}{task.nextRunAt ? `  ／  次回 ${formatDateTime(task.nextRunAt)}` : ''}</AppText></View><StatusLabel value={task.status === 'success' ? '成功' : '失敗'} danger={task.status === 'failure'} /></View>
            <AppText style={styles.taskDescription}>{task.summary}</AppText>
            <AppText style={styles.taskCount}>処理件数 {task.processedCount}件</AppText>
            {task.error ? <View style={styles.taskError}><AppText variant="label" style={styles.taskErrorLabel}>ERROR</AppText><AppText style={styles.taskErrorText}>{task.error}</AppText></View> : null}
            <AppText style={styles.outputs}>更新先  {task.outputs.length ? task.outputs.join('  ／  ') : '記録なし'}</AppText>
          </View>
        )) : <CompactEmpty text="AIタスクの実行記録はまだありません。" />}
      </View>
    </View>
  );
}

function FaqCandidates({ items, onChange }: { items: FaqCandidate[]; onChange: (item: FaqCandidate) => void }) {
  const showToast = useAppToast();
  const [filter, setFilter] = useState<FaqCandidate['status'] | 'すべて'>('すべて');
  const visible = filter === 'すべて' ? items : items.filter((item) => item.status === filter);
  const update = async (item: FaqCandidate, status: FaqCandidate['status']) => {
    const next = { ...item, status, updatedAt: new Date().toISOString() };
    try {
      await saveFaqCandidate(next);
      await logOwnerAction('FAQ候補を更新', item.id, status).catch(() => undefined);
      onChange(next);
      showToast(`FAQ候補を「${status}」にしました`);
    } catch { showToast('保存できませんでした。接続を確認してください'); }
  };
  return (
    <View testID="operations-faq">
      <SectionHeading eyebrow="FAQ CANDIDATES" title="FAQ候補" description="繰り返し届く質問を、既存FAQへ移しやすい形で確認します。" />
      <FilterRail values={['すべて', ...FAQ_STATUSES]} value={filter} onChange={(value) => setFilter(value as FaqCandidate['status'] | 'すべて')} />
      <View style={styles.faqList}>
        {visible.length ? visible.map((item) => (
          <View key={item.id} style={styles.faqCard}>
            <View style={styles.faqHeader}><View style={styles.faqHeadingCopy}><AppText style={styles.faqCount}>{item.occurrenceCount}件発生 · {item.category}</AppText><AppText variant="serif" style={styles.faqQuestion}>{item.question}</AppText></View><StatusLabel value={item.status} /></View>
            <View style={styles.faqAnswer}><AppText variant="label" style={styles.paneLabel}>想定回答</AppText><AppText style={styles.bodyCopy}>{item.proposedAnswer}</AppText></View>
            <DetailSection label="AIによる追加理由"><AppText style={styles.bodyCopy}>{item.aiReason}</AppText><AppText style={styles.reference}>元問い合わせ: {item.sourceInquiryIds.join(' ／ ') || '参照なし'}</AppText></DetailSection>
            <View style={styles.inlineActions}><ActionButton label="採用" onPress={() => void update(item, '採用')} compact /><QuietButton label="保留" onPress={() => void update(item, '保留')} /><QuietButton label="却下" onPress={() => void update(item, '却下')} danger /></View>
          </View>
        )) : <CompactEmpty text="この条件のFAQ候補はありません。" />}
      </View>
    </View>
  );
}

function ActivityLogs({ items }: { items: ActivityLog[] }) {
  return (
    <View testID="operations-logs">
      <SectionHeading eyebrow="AUDIT LOG" title="運用ログ" description="AIとオーナーが、いつ・何を・どこへ反映したかを時系列で残します。" />
      <View style={styles.logList}>
        {items.length ? items.map((item) => (
          <View key={item.id} style={[styles.logRow, item.status === 'failure' && styles.logRowFailure]}>
            <AppText style={styles.logTime}>{formatDateTime(item.occurredAt)}</AppText>
            <View style={styles.logCopy}><AppText style={styles.logAction}>{item.action}</AppText><AppText style={styles.logDetail}>{item.actor} · {item.detail}</AppText><AppText style={styles.logTarget}>{item.target}</AppText></View>
            <StatusLabel value={item.status === 'success' ? '完了' : '失敗'} danger={item.status === 'failure'} />
          </View>
        )) : <CompactEmpty text="運用ログはまだありません。" />}
      </View>
    </View>
  );
}

function SectionHeading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }) {
  return <View style={styles.sectionHeading}>{eyebrow ? <AppText variant="label" style={styles.sectionEyebrow}>{eyebrow}</AppText> : null}<AppText variant="serif" style={styles.sectionTitle}>{title}</AppText>{description ? <AppText style={styles.sectionDescription}>{description}</AppText> : null}</View>;
}

function RecentBlock({ title, value, meta, danger = false }: { title: string; value: string; meta: string; danger?: boolean }) {
  return <View style={[styles.recentBlock, danger && styles.recentBlockDanger]}><AppText variant="label" style={styles.recentLabel}>{title}</AppText><AppText style={styles.recentValue}>{value}</AppText><AppText numberOfLines={2} style={styles.recentMeta}>{meta}</AppText></View>;
}

function WeekMetric({ label, value }: { label: string; value: string }) {
  return <View style={styles.weekMetric}><AppText style={styles.weekLabel}>{label}</AppText><AppText variant="serif" style={styles.weekValue}>{value}</AppText></View>;
}

function DetailSection({ label, children }: { label: string; children: React.ReactNode }) {
  return <View style={styles.detailSection}><AppText variant="label" style={styles.detailLabel}>{label}</AppText>{children}</View>;
}

function Field({ label, tall = false, ...props }: React.ComponentProps<typeof TextInput> & { label: string; tall?: boolean }) {
  return <View style={styles.field}><AppText variant="label" style={styles.detailLabel}>{label}</AppText><TextInput {...props} placeholderTextColor="#908A81" multiline={props.multiline} textAlignVertical={props.multiline ? 'top' : 'center'} style={[styles.input, props.multiline && styles.multilineInput, tall && styles.tallInput, props.style]} /></View>;
}

function FilterRail({ values, value, onChange, compact = false, labelFor }: { values: readonly string[]; value: string; onChange: (value: string) => void; compact?: boolean; labelFor?: (value: string) => string }) {
  return <View style={[styles.filterRail, compact && styles.filterRailCompact]}>{values.map((item) => { const active = item === value; return <Pressable key={item} onPress={() => onChange(item)} style={({ pressed }) => [styles.filterItem, compact && styles.filterItemCompact, active && styles.filterItemActive, pressed && styles.pressed]}><AppText style={[styles.filterText, active && styles.filterTextActive]}>{labelFor ? labelFor(item) : item}</AppText></Pressable>; })}</View>;
}

function StatusLabel({ value, danger = false }: { value: string; danger?: boolean }) {
  return <View style={[styles.statusLabel, danger && styles.statusLabelDanger]}><AppText style={[styles.statusText, danger && styles.statusTextDanger]}>{value}</AppText></View>;
}

function ActionButton({ label, onPress, disabled = false, compact = false }: { label: string; onPress: () => void; disabled?: boolean; compact?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionButton, compact && styles.actionButtonCompact, disabled && styles.disabled, pressed && !disabled && styles.pressed]}><AppText style={styles.actionButtonText}>{label}</AppText></Pressable>;
}

function QuietButton({ label, onPress, danger = false }: { label: string; onPress: () => void; danger?: boolean }) {
  return <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.quietButton, danger && styles.quietButtonDanger, pressed && styles.pressed]}><AppText style={[styles.quietButtonText, danger && styles.quietButtonTextDanger]}>{label}</AppText></Pressable>;
}

function CopyButton({ value, prominent = false }: { value: string; prominent?: boolean }) {
  const showToast = useAppToast();
  const copy = async () => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard) await navigator.clipboard.writeText(value);
      else throw new Error('clipboard_unavailable');
      showToast('クリップボードにコピーしました');
    } catch { showToast('この端末ではコピーできませんでした'); }
  };
  return <Pressable accessibilityRole="button" disabled={!value} onPress={() => void copy()} style={({ pressed }) => [prominent ? styles.copyButtonProminent : styles.copyButton, !value && styles.disabled, pressed && styles.pressed]}><AppText style={prominent ? styles.copyButtonProminentText : styles.copyButtonText}>コピー</AppText></Pressable>;
}

function CompactEmpty({ text }: { text: string }) {
  return <View style={styles.compactEmpty}><AppText variant="serif" style={styles.compactEmptyText}>{text}</AppText></View>;
}

async function logOwnerAction(action: string, target: string, detail: string) {
  const timestamp = new Date().toISOString();
  await appendActivityLog({ id: `owner-${Date.now()}`, occurredAt: timestamp, actor: 'owner', action, target, status: 'success', detail, updatedAt: timestamp });
}

function excerpt(value: string, limit: number) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > limit ? `${normalized.slice(0, limit)}…` : normalized;
}

function formatDate(value: string | null) {
  if (!value) return '未設定';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '日時不明' : new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric' }).format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return '未設定';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '日時不明' : new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatNumber(value: number) { return new Intl.NumberFormat('ja-JP').format(value); }
function urgencyLabel(value: string) { return value === 'high' ? '高' : value === 'medium' ? '中' : '低'; }
function sourceLabel(post: SocialPost) { return [post.sourceTechniqueId, post.sourceTheoryId].filter(Boolean).join(' ／ ') || 'プロダクト全体'; }

const styles = StyleSheet.create({
  screenContent: { width: '100%', maxWidth: 1320, alignSelf: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.section * 2 },
  pressed: { opacity: 0.68 },
  disabled: { opacity: 0.45 },
  header: { overflow: 'hidden', borderRadius: radius.md, backgroundColor: colors.charcoal, ...shadow.card },
  headerTop: { padding: spacing.xl, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.lg },
  headerCopy: { flex: 1, minWidth: 0 },
  eyebrow: { color: colors.goldLight, fontSize: 10, letterSpacing: 2.2 },
  headerTitle: { marginTop: 5, color: colors.paper, fontSize: 30, lineHeight: 40, fontWeight: '700' },
  headerDescription: { marginTop: 5, color: '#C7BFAF', fontSize: 13, lineHeight: 20 },
  systemState: { minWidth: 120, paddingLeft: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.gold },
  systemStateAlert: { borderLeftColor: colors.danger },
  systemStateLabel: { color: '#AFA796', fontSize: 9 },
  systemStateValue: { marginTop: 4, color: colors.paper, fontSize: 15, lineHeight: 21, fontWeight: '700' },
  systemStateValueAlert: { color: '#E3AAA2' },
  nav: { paddingHorizontal: spacing.md, flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderTopColor: '#332F29' },
  navItem: { minHeight: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  navItemActive: { borderBottomColor: colors.goldLight },
  navText: { color: '#AAA293', fontSize: 12, lineHeight: 18, fontWeight: '600' },
  navTextActive: { color: colors.paper },
  locationLine: { minHeight: 36, paddingHorizontal: spacing.xl, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#11110F' },
  locationMark: { width: 18, height: 1, backgroundColor: colors.gold },
  locationText: { color: '#D7CEBE', fontSize: 10, lineHeight: 15, letterSpacing: 1 },
  sourceText: { marginLeft: 'auto', color: '#777064', fontSize: 9, lineHeight: 14, letterSpacing: 1 },
  warning: { marginTop: spacing.md, padding: spacing.md, borderLeftWidth: 3, borderLeftColor: colors.gold, backgroundColor: '#F3E8D2' },
  warningText: { color: colors.inkSoft, fontSize: 12, lineHeight: 19 },
  loading: { marginTop: spacing.sm, color: colors.muted, fontSize: 11 },
  sectionHeading: { marginTop: spacing.xxl, marginBottom: spacing.md },
  sectionEyebrow: { color: colors.gold, fontSize: 9, letterSpacing: 2 },
  sectionTitle: { marginTop: 3, color: colors.ink, fontSize: 22, lineHeight: 31, fontWeight: '700' },
  sectionDescription: { marginTop: 4, maxWidth: 720, color: colors.muted, fontSize: 13, lineHeight: 20 },
  todayPanel: { flexDirection: 'row', overflow: 'hidden', borderWidth: 1, borderColor: '#CDBB9E', backgroundColor: colors.surface },
  todayPanelCompact: { flexDirection: 'column' },
  primaryMetric: { width: '32%', minWidth: 220, padding: spacing.xl, justifyContent: 'center', backgroundColor: colors.charcoal },
  primaryMetricCompact: { width: '100%', minWidth: 0 },
  primaryMetricLabel: { color: colors.goldLight, fontSize: 10, letterSpacing: 1.8 },
  primaryMetricValue: { marginTop: 6, color: colors.paper, fontSize: 52, lineHeight: 58, fontWeight: '600' },
  primaryMetricTitle: { marginTop: 1, color: colors.paper, fontSize: 15, fontWeight: '700' },
  primaryMetricDetail: { marginTop: 8, color: '#BBB2A2', fontSize: 12, lineHeight: 18 },
  metricList: { flex: 1, minWidth: 0, paddingVertical: spacing.sm },
  metricListCompact: { width: '100%' },
  metricRow: { minHeight: 46, paddingHorizontal: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#ECE4D7' },
  metricRowEmphasis: { borderLeftWidth: 3, borderLeftColor: colors.gold },
  metricRowDanger: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  metricLabel: { color: colors.inkSoft, fontSize: 13 },
  metricValue: { color: colors.ink, fontFamily: fonts.serif, fontSize: 20, lineHeight: 26, fontWeight: '700' },
  metricUnit: { color: colors.muted, fontFamily: fonts.sans, fontSize: 10 },
  dangerText: { color: colors.danger },
  actionList: { borderTopWidth: 1, borderTopColor: colors.line },
  actionRow: { minHeight: 58, paddingVertical: 12, paddingHorizontal: spacing.md, flexDirection: 'row', alignItems: 'center', gap: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, borderLeftWidth: 3, borderLeftColor: '#B6AA97' },
  actionRowHigh: { borderLeftColor: colors.danger, backgroundColor: '#F8EFEB' },
  actionIndex: { width: 26, color: colors.gold, fontSize: 10 },
  actionIndexHigh: { color: colors.danger },
  actionText: { flex: 1, color: colors.ink, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  actionArrow: { color: colors.gold, fontSize: 24, lineHeight: 28 },
  quietEmpty: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.xl, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  quietEmptyTitle: { color: colors.inkSoft, fontSize: 17 },
  quietEmptyText: { marginTop: 5, color: colors.muted, fontSize: 12 },
  recentGrid: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderLeftWidth: 1, borderColor: colors.line },
  recentBlock: { width: '50%', minHeight: 138, padding: spacing.lg, borderRightWidth: 1, borderBottomWidth: 1, borderColor: colors.line, backgroundColor: 'rgba(255,253,248,0.55)' },
  recentBlockDanger: { borderLeftWidth: 3, borderLeftColor: colors.danger },
  recentLabel: { color: colors.gold, fontSize: 9, letterSpacing: 1.2 },
  recentValue: { marginTop: 9, color: colors.ink, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  recentMeta: { marginTop: 6, color: colors.muted, fontSize: 11, lineHeight: 17 },
  weekStrip: { flexDirection: 'row', flexWrap: 'wrap', borderTopWidth: 1, borderBottomWidth: 1, borderColor: colors.line },
  weekMetric: { flex: 1, minWidth: 150, paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderRightWidth: 1, borderRightColor: colors.line },
  weekLabel: { color: colors.muted, fontSize: 11, lineHeight: 16 },
  weekValue: { marginTop: 4, color: colors.ink, fontSize: 23, lineHeight: 31 },
  filterRail: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: spacing.lg },
  filterRailCompact: { marginTop: 6, marginBottom: spacing.md },
  filterItem: { minHeight: 36, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.55)' },
  filterItemCompact: { minHeight: 32, paddingHorizontal: 10 },
  filterItemActive: { borderColor: colors.charcoal, backgroundColor: colors.charcoal },
  filterText: { color: colors.inkSoft, fontSize: 11, lineHeight: 16, fontWeight: '600' },
  filterTextActive: { color: colors.paper },
  masterDetail: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg },
  masterDetailCompact: { flexDirection: 'column' },
  masterPane: { width: 390, maxWidth: '36%', padding: spacing.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#F6F0E6' },
  masterPaneCompact: { width: '100%', maxWidth: '100%' },
  detailPane: { flex: 1, minWidth: 0, padding: spacing.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...shadow.card },
  detailPaneCompact: { width: '100%', padding: spacing.lg },
  paneLabel: { color: colors.gold, fontSize: 9, letterSpacing: 1.3 },
  listRow: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderBottomWidth: 1, borderBottomColor: '#DBCFBC', borderLeftWidth: 3, borderLeftColor: 'transparent' },
  listRowSelected: { borderLeftColor: colors.gold, backgroundColor: colors.surface },
  listMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  listDate: { color: colors.muted, fontSize: 10 },
  listTitle: { marginTop: 7, color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  listSummary: { marginTop: 4, color: colors.inkSoft, fontSize: 11, lineHeight: 17 },
  listFoot: { marginTop: 7, color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '600' },
  socialExcerpt: { marginTop: 8, color: colors.ink, fontFamily: fonts.serif, fontSize: 14, lineHeight: 22, fontWeight: '600' },
  detailHeading: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md, paddingBottom: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line },
  detailHeadingCopy: { flex: 1, minWidth: 0 },
  detailTitle: { marginTop: 4, color: colors.ink, fontSize: 23, lineHeight: 32, fontWeight: '700' },
  detailMeta: { marginTop: 7, color: colors.muted, fontSize: 11, lineHeight: 18 },
  detailSection: { marginTop: spacing.lg, paddingTop: spacing.lg, borderTopWidth: 1, borderTopColor: '#E7DED1' },
  detailLabel: { marginBottom: 7, color: colors.gold, fontSize: 9, letterSpacing: 1.3 },
  bodyCopy: { color: colors.inkSoft, fontSize: 14, lineHeight: 23 },
  reference: { marginTop: 8, color: colors.muted, fontSize: 10, lineHeight: 16 },
  aiDraftSection: { marginTop: spacing.lg, padding: spacing.lg, borderLeftWidth: 3, borderLeftColor: colors.gold, backgroundColor: '#F4EDDF' },
  aiDraftHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  aiDraftLabel: { color: colors.ink, fontSize: 10, letterSpacing: 1.2 },
  aiCaution: { marginTop: 5, color: colors.danger, fontSize: 10, lineHeight: 16 },
  aiDraftBody: { marginTop: spacing.md, color: colors.ink, fontSize: 14, lineHeight: 24 },
  fieldCaption: { marginTop: spacing.md, color: colors.muted, fontSize: 11, fontWeight: '700' },
  field: { marginTop: spacing.lg },
  input: { minHeight: 46, paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: colors.paper, color: colors.ink, fontFamily: fonts.sans, fontSize: 14, lineHeight: 21 },
  multilineInput: { minHeight: 92 },
  tallInput: { minHeight: 210, fontFamily: fonts.serif, lineHeight: 24 },
  fieldHint: { marginTop: 5, color: colors.muted, fontSize: 10, lineHeight: 16 },
  inlineActions: { marginTop: spacing.md, flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  actionButton: { minHeight: 48, marginTop: spacing.xl, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: radius.sm, backgroundColor: colors.charcoal },
  actionButtonCompact: { minHeight: 38, marginTop: 0 },
  actionButtonText: { color: colors.paper, fontSize: 12, lineHeight: 18, fontWeight: '700' },
  quietButton: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.sm, backgroundColor: colors.surface },
  quietButtonDanger: { borderColor: '#B9918B' },
  quietButtonText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  quietButtonTextDanger: { color: colors.danger },
  copyButton: { minHeight: 30, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.gold, borderRadius: radius.pill },
  copyButtonText: { color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  copyButtonProminent: { minHeight: 38, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.charcoal, borderRadius: radius.sm },
  copyButtonProminentText: { color: colors.charcoal, fontSize: 11, fontWeight: '700' },
  statusLabel: { flexShrink: 0, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#BAA987', borderRadius: radius.pill, backgroundColor: 'rgba(255,253,248,0.4)' },
  statusLabelDanger: { borderColor: '#B8857C', backgroundColor: '#F7E9E6' },
  statusText: { color: colors.inkSoft, fontSize: 9, lineHeight: 13, fontWeight: '700' },
  statusTextDanger: { color: colors.danger },
  taskSummary: { padding: spacing.xl, borderLeftWidth: 4, borderLeftColor: colors.gold, backgroundColor: colors.charcoal },
  taskSummaryAlert: { borderLeftColor: colors.danger },
  taskSummaryTitle: { color: colors.paper, fontSize: 24, lineHeight: 32 },
  taskSummaryText: { marginTop: 5, color: '#BDB4A4', fontSize: 12, lineHeight: 19 },
  taskList: { marginTop: spacing.lg, borderTopWidth: 1, borderTopColor: colors.line },
  taskRow: { paddingVertical: spacing.lg, paddingHorizontal: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.line, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  taskRowFailure: { borderLeftColor: colors.danger, backgroundColor: '#F8EFEB' },
  taskHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  taskTitleCopy: { flex: 1, minWidth: 0 },
  taskTitle: { color: colors.ink, fontSize: 18, lineHeight: 26 },
  taskTime: { marginTop: 3, color: colors.muted, fontSize: 10, lineHeight: 16 },
  taskDescription: { marginTop: spacing.md, color: colors.inkSoft, fontSize: 13, lineHeight: 20 },
  taskCount: { marginTop: 5, color: colors.gold, fontSize: 10, fontWeight: '700' },
  taskError: { marginTop: spacing.md, padding: spacing.md, borderLeftWidth: 2, borderLeftColor: colors.danger, backgroundColor: '#F3E3DF' },
  taskErrorLabel: { color: colors.danger, fontSize: 9 },
  taskErrorText: { marginTop: 4, color: colors.danger, fontSize: 12, lineHeight: 19 },
  outputs: { marginTop: spacing.md, color: colors.muted, fontSize: 10, lineHeight: 16 },
  performanceRow: { flexDirection: 'row', flexWrap: 'wrap' },
  faqList: { gap: spacing.lg },
  faqCard: { padding: spacing.xl, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.surface, ...shadow.card },
  faqHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: spacing.md },
  faqHeadingCopy: { flex: 1, minWidth: 0 },
  faqCount: { color: colors.gold, fontSize: 10, lineHeight: 15, fontWeight: '700' },
  faqQuestion: { marginTop: 6, color: colors.ink, fontSize: 20, lineHeight: 30 },
  faqAnswer: { marginTop: spacing.lg, padding: spacing.lg, backgroundColor: '#F5EFE4' },
  logList: { borderTopWidth: 1, borderTopColor: colors.line },
  logRow: { minHeight: 84, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, flexDirection: 'row', alignItems: 'flex-start', gap: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.line, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  logRowFailure: { borderLeftColor: colors.danger, backgroundColor: '#F8EFEB' },
  logTime: { width: 110, color: colors.muted, fontSize: 10, lineHeight: 16 },
  logCopy: { flex: 1, minWidth: 0 },
  logAction: { color: colors.ink, fontSize: 14, lineHeight: 20, fontWeight: '700' },
  logDetail: { marginTop: 3, color: colors.inkSoft, fontSize: 11, lineHeight: 17 },
  logTarget: { marginTop: 5, color: colors.gold, fontSize: 9, lineHeight: 14 },
  compactEmpty: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.lg, alignItems: 'center' },
  compactEmptyText: { color: colors.muted, fontSize: 14, textAlign: 'center' },
});
