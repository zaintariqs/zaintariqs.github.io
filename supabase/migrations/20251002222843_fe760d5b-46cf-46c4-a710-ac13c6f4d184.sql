-- Drop the insecure view
DROP VIEW IF EXISTS public.market_maker_status;

-- Create a secure function instead that only admins can access
CREATE OR REPLACE FUNCTION public.get_market_maker_status()
RETURNS TABLE (status bot_status, last_trade_at TIMESTAMP WITH TIME ZONE)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- Only allow admins to access this data
  SELECT 
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.admin_wallets
        WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
        AND is_active = true
      ) THEN (SELECT status FROM market_maker_config LIMIT 1)
      ELSE NULL
    END as status,
    CASE 
      WHEN EXISTS (
        SELECT 1 FROM public.admin_wallets
        WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
        AND is_active = true
      ) THEN (SELECT last_trade_at FROM market_maker_config LIMIT 1)
      ELSE NULL
    END as last_trade_at;
$$;

-- Grant execute permission only to authenticated users (admin check is inside function)
GRANT EXECUTE ON FUNCTION public.get_market_maker_status() TO authenticated;

-- Add comment explaining the security model
COMMENT ON FUNCTION public.get_market_maker_status() IS 'Returns market maker status only for admin wallets. Non-admins receive NULL values. Uses SECURITY DEFINER to bypass RLS on underlying table.';