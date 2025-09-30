-- Fix the security definer view by enabling security_invoker
CREATE OR REPLACE VIEW public.market_maker_status
WITH (security_invoker=on) AS
SELECT 
  status,
  last_trade_at
FROM public.market_maker_config
LIMIT 1;