-- Properly lock down redemptions table with wallet-based RLS
-- This prevents users from viewing other users' banking information

begin;

-- Drop temporary permissive policies
drop policy if exists "Users can view their own redemptions via wallet" on public.redemptions;
drop policy if exists "Users can create redemptions for their wallet" on public.redemptions;
drop policy if exists "Users can update their own redemptions via wallet" on public.redemptions;

-- Since we don't have Supabase Auth implemented, we'll use service role for all operations
-- and handle access control at the application/edge function level

-- Deny all direct access from anon/authenticated roles
create policy "Block direct client access to redemptions"
  on public.redemptions
  for all
  using (false);

-- Only service role can access (via edge functions with proper validation)
-- This is enforced by having RLS enabled with only a false policy for regular users

commit;