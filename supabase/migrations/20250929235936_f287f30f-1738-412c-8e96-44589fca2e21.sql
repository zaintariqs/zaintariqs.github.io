-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create enum for bot status
CREATE TYPE bot_status AS ENUM ('active', 'paused', 'error');

-- Create bot configuration table
CREATE TABLE public.market_maker_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_price NUMERIC NOT NULL DEFAULT 1.0,
  price_threshold NUMERIC NOT NULL DEFAULT 0.02,
  trade_amount_usdt NUMERIC NOT NULL DEFAULT 100,
  min_trade_interval_seconds INTEGER NOT NULL DEFAULT 300,
  status bot_status NOT NULL DEFAULT 'paused',
  last_trade_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction history table
CREATE TABLE public.market_maker_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash TEXT NOT NULL,
  action TEXT NOT NULL,
  amount_usdt NUMERIC NOT NULL,
  amount_pkrsc NUMERIC NOT NULL,
  price NUMERIC NOT NULL,
  gas_used NUMERIC,
  status TEXT NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.market_maker_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.market_maker_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (read-only for authenticated users, admin can update via edge function)
CREATE POLICY "Anyone can view config" ON public.market_maker_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can view transactions" ON public.market_maker_transactions FOR SELECT TO authenticated USING (true);

-- Insert default configuration
INSERT INTO public.market_maker_config (target_price, price_threshold, trade_amount_usdt, status)
VALUES (1.0, 0.02, 100, 'paused');

-- Create trigger for updated_at
CREATE TRIGGER update_market_maker_config_updated_at
  BEFORE UPDATE ON public.market_maker_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Schedule cron job to run market maker every 5 minutes
SELECT cron.schedule(
  'run-market-maker',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://jdjreuxhvzmzockuduyq.supabase.co/functions/v1/market-maker',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkanJldXhodnptem9ja3VkdXlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDY4NzYsImV4cCI6MjA3NDU4Mjg3Nn0.KJYwFwrpN19mBJ2uj9I8tX1z_T9qfhd-KNXLGn5Zric"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);