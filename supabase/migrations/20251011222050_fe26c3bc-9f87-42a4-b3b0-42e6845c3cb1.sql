-- Update market maker config default interval to 10 seconds
UPDATE public.market_maker_config 
SET min_trade_interval_seconds = 10 
WHERE min_trade_interval_seconds = 300;