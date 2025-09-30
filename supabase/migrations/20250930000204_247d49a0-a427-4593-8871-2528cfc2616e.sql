-- Move pg_cron extension from public to pg_catalog schema
DROP EXTENSION IF EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;