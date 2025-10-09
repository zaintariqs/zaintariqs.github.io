-- Fix whitelist_requests table - remove vulnerable policy that allows public reads
-- Drop the old policy that has USING true without proper role checks
DROP POLICY IF EXISTS "Service role can update whitelist requests" ON public.whitelist_requests;

-- Verify that RLS is enabled
ALTER TABLE public.whitelist_requests ENABLE ROW LEVEL SECURITY;

-- The remaining policies are:
-- 1. "Block direct client access to whitelist requests" - blocks all client access
-- 2. "Admins with whitelist permission can view requests" - allows admin SELECT
-- 3. "Admins can delete whitelist requests" - allows admin DELETE
-- 4. "Service role full access to whitelist requests" - allows service role ALL operations with proper auth.role() check