-- Create scheduled job to cleanup old rate limit entries (runs daily)
-- This prevents the admin_rate_limits table from growing indefinitely

-- First, enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Drop existing cleanup job if it exists
SELECT cron.unschedule('cleanup-rate-limits-daily') WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits-daily'
);

-- Create scheduled cleanup job (runs daily at 2 AM UTC)
SELECT cron.schedule(
  'cleanup-rate-limits-daily',
  '0 2 * * *', -- Every day at 2 AM UTC
  $$
  DELETE FROM public.admin_rate_limits
  WHERE window_start < (now() - INTERVAL '7 days');
  $$
);

-- Add comment
COMMENT ON EXTENSION pg_cron IS 'Enables scheduled jobs for database maintenance tasks';

-- Log the cleanup job creation
INSERT INTO public.admin_actions (action_type, wallet_address, details)
VALUES (
  'rate_limit_cleanup_job_created',
  'system',
  jsonb_build_object(
    'schedule', '0 2 * * * (daily at 2 AM UTC)',
    'retention_period', '7 days',
    'description', 'Automated cleanup of old rate limit entries',
    'timestamp', now()
  )
);