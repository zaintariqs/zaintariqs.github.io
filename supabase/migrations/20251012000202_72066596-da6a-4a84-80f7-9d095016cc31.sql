-- Drop the restrictive policy that blocks service role
DROP POLICY IF EXISTS "Service role manages bonuses" ON public.welcome_bonuses;

-- Create separate policies for service role access
CREATE POLICY "Service role can read bonuses"
  ON public.welcome_bonuses
  FOR SELECT
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage bonuses"
  ON public.welcome_bonuses
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Keep the admin view policy
-- (Admins can view welcome bonuses policy already exists)

-- Keep the user view own bonus policy  
-- (Users can view own bonus policy already exists)