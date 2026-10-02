create extension if not exists pg_cron;
select cron.schedule('roku-privacy-retention','19 18 * * *','select private.purge_expired_records()');
