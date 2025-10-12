-- Drop existing cron job if it exists
SELECT cron.unschedule('market-maker-bot-scheduler');

-- Create new cron job that runs every 60 seconds
SELECT cron.schedule(
  'market-maker-bot-scheduler',
  '*/1 * * * *', -- Every minute (cron doesn't support seconds, so this is every 60 seconds)
  $$
  SELECT
    net.http_post(
      url := 'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/market-maker',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric"}'::jsonb,
      body := '{"walletAddress": "system_cron", "force": false}'::jsonb
    ) as request_id;
  $$
);

-- Update market maker config to ensure price threshold is 2% (0.02)
UPDATE public.market_maker_config
SET price_threshold = 0.02
WHERE id IN (SELECT id FROM public.market_maker_config LIMIT 1);