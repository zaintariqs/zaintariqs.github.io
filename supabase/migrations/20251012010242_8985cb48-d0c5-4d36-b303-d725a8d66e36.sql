-- Add 'pending_burn' status to redemption_status enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'pending_burn' 
    AND enumtypid = 'redemption_status'::regtype
  ) THEN
    ALTER TYPE redemption_status ADD VALUE 'pending_burn';
  END IF;
END $$;

-- Add 'error' status to redemption_status enum if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'error' 
    AND enumtypid = 'redemption_status'::regtype
  ) THEN
    ALTER TYPE redemption_status ADD VALUE 'error';
  END IF;
END $$;

-- Create cron job to automatically burn tokens for verified redemptions every 5 minutes
SELECT cron.schedule(
  'process-redemption-burns',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
      url:='https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/process-redemption-burns',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric"}'::jsonb,
      body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);

-- Create function to check redemption burn cron status
CREATE OR REPLACE FUNCTION public.get_redemption_burn_cron_status()
RETURNS TABLE(jobname text, schedule text, active boolean, last_run timestamp with time zone, next_run timestamp with time zone)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    jobname::text,
    schedule::text,
    active,
    NULL::timestamp with time zone as last_run,
    NULL::timestamp with time zone as next_run
  FROM cron.job 
  WHERE jobname = 'process-redemption-burns';
$$;