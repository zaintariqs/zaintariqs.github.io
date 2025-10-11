-- Update market maker cron to run every minute instead of every 5 minutes
-- This allows price checks every 60 seconds while min_trade_interval_seconds controls actual trading frequency
SELECT cron.unschedule('market-maker-bot-scheduler');

SELECT cron.schedule(
  'market-maker-bot-scheduler',
  '* * * * *', -- Every minute
  $$
  SELECT
    net.http_post(
      url:='https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/market-maker',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric"}'::jsonb,
      body:=concat('{"time": "', now(), '", "walletAddress": "0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F"}')::jsonb
    ) as request_id;
  $$
);