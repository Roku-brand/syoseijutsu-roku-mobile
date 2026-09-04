-- Remove activity created while the former FAQ demonstration record was being
-- exercised. Real FAQ records use stable hashed or external source IDs.
delete from public.operation_activity_log
where target = 'faq-candidate-001';
