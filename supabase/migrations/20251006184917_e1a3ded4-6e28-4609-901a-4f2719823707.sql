-- Allow admins to view blacklisted addresses
CREATE POLICY "Admins can view blacklisted addresses"
ON public.blacklisted_addresses
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_wallets
    WHERE LOWER(admin_wallets.wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
      AND admin_wallets.is_active = true
  )
);