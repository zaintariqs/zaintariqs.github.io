-- Security Fix: Ensure deposits table blocks all direct client access
-- All access must go through the deposits edge function which properly validates wallet signatures

-- First, drop all existing policies
DROP POLICY IF EXISTS "Users can view their own deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role can insert deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role can update deposits" ON public.deposits;
DROP POLICY IF EXISTS "Block all direct client access to deposits" ON public.deposits;
DROP POLICY IF EXISTS "Service role can manage deposits" ON public.deposits;

-- Create a single restrictive policy that blocks ALL direct client access
CREATE POLICY "Block all direct client access to deposits" 
ON public.deposits 
AS RESTRICTIVE
FOR ALL 
USING (false)
WITH CHECK (false);

-- Service role (edge functions) automatically bypasses RLS, so no special policy needed
-- This ensures phone numbers and receipt URLs are ONLY accessible through the
-- deposits edge function which properly validates wallet ownership via signatures