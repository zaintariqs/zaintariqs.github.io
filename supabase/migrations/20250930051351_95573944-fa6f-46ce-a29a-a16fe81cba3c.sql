-- Tighten RLS on redemptions to ensure only owners can read/write and prevent owner changes
begin;

alter table public.redemptions enable row level security;

-- Replace existing policies with stricter versions (no type casts, add WITH CHECK on UPDATE, scope to authenticated role)
drop policy if exists "Users can view their own redemptions" on public.redemptions;
drop policy if exists "Users can create their own redemptions" on public.redemptions;
drop policy if exists "Users can update their own redemptions" on public.redemptions;

create policy "Users can view their own redemptions"
  on public.redemptions
  for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own redemptions"
  on public.redemptions
  for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own redemptions"
  on public.redemptions
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

commit;