-- Speed up auto-detect-redemption-transfers to run every minute instead of every 3 minutes
-- This provides faster detection of redemption transfers (60 seconds max wait vs 180 seconds)

SELECT cron.unschedule('auto-detect-redemption-transfers');

SELECT cron.schedule(
  'auto-detect-redemption-transfers',
  '* * * * *', -- Every minute (was every 3 minutes)
  $$
  SELECT
    net.http_post(
      url := 'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/auto-detect-redemption-transfers',
      headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MjgyMjI5NzYsImV4cCI6MjA0Mzc5ODk3Nn0.GVEhIz8Y2KrUeXWYVjGv1fHPGr4JWTtGGTKaZN3sQGc"}'::jsonb,
      body := '{"source": "cron"}'::jsonb
    ) as request_id;
  $$
);