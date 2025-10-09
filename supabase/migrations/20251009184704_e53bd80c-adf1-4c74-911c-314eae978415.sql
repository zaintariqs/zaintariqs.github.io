-- Fix whitelist_requests table RLS policies to prevent public access to email addresses
-- Drop the overly permissive policy that allows public read access
DROP POLICY IF EXISTS "Service role manages whitelist requests" ON public.whitelist_requests;

-- Keep the restrictive policy that blocks direct client access
-- (already exists: "Block direct client access to whitelist requests")

-- Add a specific policy to allow only admins with manage_whitelist permission to view requests
CREATE POLICY "Admins with whitelist permission can view requests"
ON public.whitelist_requests
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'manage_whitelist'::admin_permission));

-- Ensure service role (edge functions) can still manage all operations
CREATE POLICY "Service role full access to whitelist requests"
ON public.whitelist_requests
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');