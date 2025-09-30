-- Create admin_wallets table for secure admin verification
CREATE TABLE public.admin_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  added_at timestamp with time zone NOT NULL DEFAULT now(),
  added_by uuid REFERENCES auth.users(id),
  is_active boolean NOT NULL DEFAULT true
);

-- Enable RLS on admin_wallets
ALTER TABLE public.admin_wallets ENABLE ROW LEVEL SECURITY;

-- Only admins can view admin wallets (using security definer function)
CREATE POLICY "Only service role can manage admin wallets"
ON public.admin_wallets
FOR ALL
USING (false);

-- Insert the master minter as the first admin
INSERT INTO public.admin_wallets (wallet_address, is_active)
VALUES ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', true);

-- Create security definer function to check if wallet is admin
CREATE OR REPLACE FUNCTION public.is_admin_wallet(wallet_addr text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER(wallet_addr)
      AND is_active = true
  )
$$;

-- Update market_maker_config RLS to be admin-only
DROP POLICY IF EXISTS "Anyone can view config" ON public.market_maker_config;
DROP POLICY IF EXISTS "Service role can update config" ON public.market_maker_config;

CREATE POLICY "Only service role can manage config"
ON public.market_maker_config
FOR ALL
USING (false);

-- Create a public view for non-sensitive market maker status
CREATE OR REPLACE VIEW public.market_maker_status AS
SELECT 
  status,
  last_trade_at
FROM public.market_maker_config
LIMIT 1;

-- Grant access to the view
GRANT SELECT ON public.market_maker_status TO authenticated, anon;

-- Create blacklist table to replace localStorage
CREATE TABLE public.blacklisted_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  reason text NOT NULL,
  blacklisted_by text NOT NULL,
  blacklisted_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true
);

ALTER TABLE public.blacklisted_addresses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage blacklist"
ON public.blacklisted_addresses
FOR ALL
USING (false);

-- Create admin_actions audit log
CREATE TABLE public.admin_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL,
  action_type text NOT NULL,
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage admin actions"
ON public.admin_actions
FOR ALL
USING (false);