-- Ensure RLS is enabled on redemptions table
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies that might allow unintended access
DROP POLICY IF EXISTS "Block direct client access to redemptions" ON public.redemptions;

-- Create a comprehensive restrictive policy that blocks ALL direct client access
-- This ensures that sensitive banking information cannot be accessed by any client
CREATE POLICY "Block all direct client access to redemptions"
ON public.redemptions
AS RESTRICTIVE
FOR ALL
TO public, authenticated, anon
USING (false)
WITH CHECK (false);

-- Add logging trigger to track any unauthorized access attempts
CREATE OR REPLACE FUNCTION public.log_redemption_access_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to admin_actions table for security monitoring
  INSERT INTO public.admin_actions (action_type, wallet_address, details)
  VALUES (
    'unauthorized_redemption_access_attempt',
    'unknown',
    jsonb_build_object(
      'timestamp', now(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    )
  );
  
  -- Deny the operation
  RAISE EXCEPTION 'Direct access to redemptions table is not allowed. Use the redemptions edge function.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Note: The redemptions edge function uses service_role key which bypasses RLS
-- This is the ONLY authorized way to access this table
-- All access goes through wallet signature verification in the edge function