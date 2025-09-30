-- Update target price to 284 USDT per PKRSC
UPDATE public.market_maker_config 
SET target_price = 284.0
WHERE id = (SELECT id FROM public.market_maker_config LIMIT 1);