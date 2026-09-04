-- Remove the initial presentation-only records. The operations console must
-- show only data written by a real automation or by the owner.

delete from public.operation_inquiries
where source_ref like 'gmail:sample-%'
   or id in (
     'inq-20260905-001',
     'inq-20260904-004',
     'inq-20260904-003',
     'inq-20260903-006'
   );

delete from public.operation_social_posts
where id in (
  'social-20260905-001',
  'social-20260905-002',
  'social-20260904-003',
  'social-20260903-002',
  'social-20260901-001'
);

delete from public.operation_ai_tasks
where id in (
  'task-inquiry-triage',
  'task-reply-drafts',
  'task-social-drafts',
  'task-faq-candidates',
  'task-social-metrics'
);

delete from public.operation_faq_candidates
where id in ('faq-candidate-001', 'faq-candidate-002', 'faq-candidate-003');

delete from public.operation_activity_log
where id in (
  'log-20260905-0902',
  'log-20260905-0901',
  'log-20260905-0601',
  'log-20260904-2102',
  'log-20260904-1809',
  'log-20260904-0801'
);
