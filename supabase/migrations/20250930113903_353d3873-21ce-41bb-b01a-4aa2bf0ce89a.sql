-- Ensure RLS is enabled on admin_wallets table
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies
DROP POLICY IF EXISTS "Only service role can manage admin wallets" ON public.admin_wallets;

-- Create a comprehensive restrictive policy that blocks ALL direct client access
-- This ensures that admin wallet addresses cannot be accessed by any client
CREATE POLICY "Block all direct client access to admin wallets"
ON public.admin_wallets
AS RESTRICTIVE
FOR ALL
TO public, authenticated, anon
USING (false)
WITH CHECK (false);

-- Add security monitoring function for admin_wallets access attempts
CREATE OR REPLACE FUNCTION public.log_admin_wallets_access_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to admin_actions table for security monitoring
  INSERT INTO public.admin_actions (action_type, wallet_address, details)
  VALUES (
    'unauthorized_admin_wallets_access_attempt',
    'unknown',
    jsonb_build_object(
      'timestamp', now(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME,
      'attempted_by', current_user
    )
  );
  
  -- Deny the operation
  RAISE EXCEPTION 'Direct access to admin_wallets table is not allowed. Administrative functions are secured via service role only.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Note: Admin wallet management is handled exclusively through:
-- 1. The verify-admin edge function (uses is_admin_wallet function)
-- 2. Service role operations only
-- No client-side access is permitted to protect admin identities