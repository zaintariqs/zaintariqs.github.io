-- Drop the overly permissive public read policy
DROP POLICY IF EXISTS "Anyone can view transactions" ON public.market_maker_transactions;

-- Create restrictive policy that only allows admins to view transactions
CREATE POLICY "Only admins can view market maker transactions"
ON public.market_maker_transactions
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1 FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER(auth.jwt()->>'wallet_address')
    AND is_active = true
  )
);

-- Ensure the service role insert policy remains unchanged
-- (The existing "Service role can insert transactions" policy will continue to work)