-- Enable pg_cron extension for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a cron job to run the market maker bot every 5 minutes
-- This will call the edge function automatically
SELECT cron.schedule(
  'market-maker-bot-scheduler',
  '*/5 * * * *', -- Every 5 minutes
  $$
  SELECT
    net.http_post(
        url:='https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/market-maker',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric"}'::jsonb,
        body:='{"walletAddress": "0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F", "automated": true}'::jsonb
    ) as request_id;
  $$
);

-- Create a function to check cron job status
CREATE OR REPLACE FUNCTION public.get_market_maker_cron_status()
RETURNS TABLE(
  jobname text,
  schedule text,
  active boolean,
  last_run timestamp with time zone,
  next_run timestamp with time zone
)
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
  WHERE jobname = 'market-maker-bot-scheduler';
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_market_maker_cron_status() TO authenticated;

-- Create a function to pause/resume the cron job
CREATE OR REPLACE FUNCTION public.toggle_market_maker_cron(enable boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to toggle
  IF NOT EXISTS (
    SELECT 1 FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')::text)
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Admin access required';
  END IF;

  -- Update the cron job status
  IF enable THEN
    UPDATE cron.job SET active = true WHERE jobname = 'market-maker-bot-scheduler';
  ELSE
    UPDATE cron.job SET active = false WHERE jobname = 'market-maker-bot-scheduler';
  END IF;

  RETURN true;
END;
$$;