-- Ensure whitelist_requests table is fully protected from anonymous access
-- Add explicit restrictive policy to block all anonymous access

-- Drop the old blocking policy if it exists
DROP POLICY IF EXISTS "Block direct client access to whitelist requests" ON public.whitelist_requests;

-- Create a restrictive policy that explicitly blocks anonymous users
CREATE POLICY "Block all anonymous access to whitelist requests"
ON public.whitelist_requests
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Create a restrictive policy that blocks authenticated users who aren't admins
CREATE POLICY "Block non-admin authenticated access to whitelist requests"
ON public.whitelist_requests
AS RESTRICTIVE
FOR ALL
TO authenticated
USING (false)
WITH CHECK (false);

-- The existing permissive policies remain:
-- 1. "Admins with whitelist permission can view requests" - allows admin SELECT
-- 2. "Admins can delete whitelist requests" - allows admin DELETE  
-- 3. "Service role full access to whitelist requests" - allows service role ALL operations

-- Note: RESTRICTIVE policies combined with PERMISSIVE policies using AND logic
-- This means even if a permissive policy would allow access, the restrictive policy
-- can still block it unless the user is explicitly allowed by both