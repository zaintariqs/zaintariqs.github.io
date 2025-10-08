-- Fix whitelist_requests RLS for wallet-based authentication
-- The previous policies expected JWT auth, but this app uses wallet auth

-- Drop the JWT-based policies
DROP POLICY IF EXISTS "Authenticated users can create own whitelist request" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Users can only view their own whitelist request" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Admins with whitelist permission can view all requests" ON public.whitelist_requests;

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role manages whitelist requests"
ON public.whitelist_requests
FOR ALL
USING (true)
WITH CHECK (true);

-- Block direct client access (force use of edge functions for security)
CREATE POLICY "Block direct client access to whitelist requests"
ON public.whitelist_requests
FOR ALL
TO authenticated, anon
USING (false)
WITH CHECK (false);