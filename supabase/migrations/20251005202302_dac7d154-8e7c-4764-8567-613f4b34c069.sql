-- Security Fix: Block direct client access to deposits table
-- All access must go through the deposits edge function which properly validates wallet signatures

-- Drop existing RLS policies on deposits table
DROP POLICY IF EXISTS "Users can view their own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role can insert deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role can update deposits" ON public.deposits;

-- Create restrictive policies that block all direct client access
-- This forces all operations through edge functions with proper authentication
CREATE POLICY "Block all direct client access to deposits" 
ON public.deposits 
AS RESTRICTIVE
FOR ALL 
TO PUBLIC
USING (false)
WITH CHECK (false);

-- Allow service role (edge functions) to manage deposits
CREATE POLICY "Service role can manage deposits" 
ON public.deposits 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Create trigger to log unauthorized access attempts for security monitoring
CREATE OR REPLACE FUNCTION public.log_deposits_access_attempt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log to admin_actions table for security monitoring
  INSERT INTO public.admin_actions (action_type, wallet_address, details)
  VALUES (
    'unauthorized_deposits_access_attempt',
    'unknown',
    jsonb_build_object(
      'timestamp', now(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    )
  );
  
  -- Deny the operation
  RAISE EXCEPTION 'Direct access to deposits table is not allowed. Use the deposits edge function.';
  RETURN NULL;
END;
$$;

-- Note: We don't create a trigger on deposits because the restrictive policy already blocks access
-- The edge function (using service role) bypasses RLS and can still perform operations