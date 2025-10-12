-- Create cron job to automatically detect redemption transfers
-- Runs every 3 minutes to check BaseScan for incoming PKRSC transfers to master minter
SELECT cron.schedule(
  'auto-detect-redemption-transfers',
  '*/3 * * * *', -- Every 3 minutes
  $$
  SELECT
    net.http_post(
        url:='https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/auto-detect-redemption-transfers',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);