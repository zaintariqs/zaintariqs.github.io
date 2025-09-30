-- Ensure default config exists and update RLS policies
DO $$
BEGIN
  -- Insert default config if not exists
  IF NOT EXISTS (SELECT 1 FROM public.market_maker_config LIMIT 1) THEN
    INSERT INTO public.market_maker_config (target_price, price_threshold, trade_amount_usdt, status)
    VALUES (1.0, 0.02, 100, 'paused');
  END IF;
END $$;

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view config" ON public.market_maker_config;
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.market_maker_transactions;

-- Create new policies allowing read for all authenticated users and write for service role
CREATE POLICY "Anyone can view config" ON public.market_maker_config FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can update config" ON public.market_maker_config FOR UPDATE TO service_role USING (true);
CREATE POLICY "Anyone can view transactions" ON public.market_maker_transactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Service role can insert transactions" ON public.market_maker_transactions FOR INSERT TO service_role WITH CHECK (true);