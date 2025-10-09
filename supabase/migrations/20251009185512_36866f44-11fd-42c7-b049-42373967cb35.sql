-- Enhance deposits_public table security with restrictive policies
-- Phone numbers are already masked, but we'll add explicit blocks for anonymous access

-- Add restrictive policy to completely block all anonymous access
CREATE POLICY "Block all anonymous access to deposits_public"
ON public.deposits_public
AS RESTRICTIVE
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add restrictive policy for authenticated users - they can ONLY see their own records
CREATE POLICY "Restrict authenticated users to own deposits only"
ON public.deposits_public
AS RESTRICTIVE
FOR SELECT
TO authenticated
USING (
  -- Users can only see their own deposits OR they must be admins
  lower(user_id) = lower((auth.jwt() ->> 'wallet_address')::text)
  OR has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'::admin_permission)
);

-- The existing permissive policies remain:
-- 1. "Users can view own masked deposits" - allows user SELECT for their records
-- 2. "Admins can view all masked deposits" - allows admin SELECT for all records
-- 3. "Block all modifications to deposits_public" - blocks all write operations

-- Note: Phone numbers are already masked by the mask_phone_number() function
-- which shows only the last 4 digits (e.g., ********8601)