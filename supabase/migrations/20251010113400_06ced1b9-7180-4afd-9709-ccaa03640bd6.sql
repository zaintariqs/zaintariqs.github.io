-- Add promotional reserve to bank_reserves
INSERT INTO public.bank_reserves (reserve_type, amount)
VALUES ('promotional', 30000);

-- Create enum for bonus status
CREATE TYPE bonus_status AS ENUM ('pending', 'completed', 'failed', 'insufficient_funds');

-- Create welcome_bonuses table to track bonus distribution
CREATE TABLE public.welcome_bonuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 300,
  status bonus_status NOT NULL DEFAULT 'pending',
  transaction_hash TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  distributed_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(wallet_address)
);

-- Enable RLS on welcome_bonuses
ALTER TABLE public.welcome_bonuses ENABLE ROW LEVEL SECURITY;

-- Admins can view all bonuses
CREATE POLICY "Admins can view welcome bonuses"
ON public.welcome_bonuses
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'));

-- Users can view their own bonus
CREATE POLICY "Users can view own bonus"
ON public.welcome_bonuses
FOR SELECT
USING (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')::text));

-- Only service role can insert/update bonuses
CREATE POLICY "Service role manages bonuses"
ON public.welcome_bonuses
FOR ALL
USING (false);

-- Create index for faster lookups
CREATE INDEX idx_welcome_bonuses_wallet ON public.welcome_bonuses(wallet_address);
CREATE INDEX idx_welcome_bonuses_status ON public.welcome_bonuses(status);

-- Function to check promotional reserve balance
CREATE OR REPLACE FUNCTION public.get_promotional_reserve_balance()
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT amount
  FROM public.bank_reserves
  WHERE reserve_type = 'promotional'
  LIMIT 1;
$$;

-- Function to update promotional reserves
CREATE OR REPLACE FUNCTION public.update_promotional_reserves(
  amount_change NUMERIC,
  updated_by_wallet TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bank_reserves
  SET 
    amount = amount + amount_change,
    last_updated = now(),
    updated_by = updated_by_wallet
  WHERE reserve_type = 'promotional';
END;
$$;