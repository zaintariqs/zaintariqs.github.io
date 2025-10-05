-- Add RLS policy to allow admins to delete whitelist requests
CREATE POLICY "Admins can delete whitelist requests"
ON public.whitelist_requests
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
    AND is_active = true
  )
);