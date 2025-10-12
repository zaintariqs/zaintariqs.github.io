-- Block all anonymous access to login_attempts table
-- This prevents hackers from accessing sensitive user login data

-- Drop any existing permissive policies and add restrictive ones
DROP POLICY IF EXISTS "Block all anonymous access to login_attempts" ON public.login_attempts;

CREATE POLICY "Block all anonymous access to login_attempts"
ON public.login_attempts
AS RESTRICTIVE
FOR ALL
TO anon
USING (false);

-- Ensure only authenticated admins with proper permissions can view
-- (The existing "Admins can view login attempts" policy already handles this)

-- Ensure service role can still insert for logging purposes
-- (The existing "Service role can insert login attempts" policy already handles this)

COMMENT ON POLICY "Block all anonymous access to login_attempts" ON public.login_attempts 
IS 'Security: Explicitly blocks all anonymous access to prevent data theft. Only authenticated admins with view_deposits permission can read this sensitive data.';