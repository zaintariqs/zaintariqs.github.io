-- Phase 1: Critical Security Fixes

-- 1. Create admin permissions enum
CREATE TYPE public.admin_permission AS ENUM (
  'view_deposits',
  'approve_deposits',
  'view_redemptions',
  'process_redemptions',
  'manage_whitelist',
  'manage_blacklist',
  'view_reserves',
  'manage_reserves',
  'manage_market_maker',
  'manage_admins',
  'view_transaction_fees',
  'view_audit_logs'
);

-- 2. Create admin_roles table for RBAC
CREATE TABLE public.admin_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL REFERENCES public.admin_wallets(wallet_address) ON DELETE CASCADE,
  permission admin_permission NOT NULL,
  granted_by TEXT NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(wallet_address, permission)
);

ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;

-- Only service role can manage admin roles
CREATE POLICY "Service role manages admin roles"
ON public.admin_roles
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Admins can view their own permissions
CREATE POLICY "Admins can view own permissions"
ON public.admin_roles
FOR SELECT
USING (LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')::text));

-- 3. Create function to check admin permission
CREATE OR REPLACE FUNCTION public.has_admin_permission(
  _wallet_address TEXT,
  _permission admin_permission
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_wallets aw
    INNER JOIN public.admin_roles ar ON LOWER(aw.wallet_address) = LOWER(ar.wallet_address)
    WHERE LOWER(aw.wallet_address) = LOWER(_wallet_address)
      AND aw.is_active = true
      AND ar.permission = _permission
  )
$$;

-- 4. Create table to track used transaction hashes (prevent replay attacks)
CREATE TABLE public.used_transaction_hashes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_hash TEXT NOT NULL UNIQUE,
  transaction_type TEXT NOT NULL, -- 'mint' or 'burn'
  used_by TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.used_transaction_hashes ENABLE ROW LEVEL SECURITY;

-- Only service role can access transaction hashes
CREATE POLICY "Service role manages transaction hashes"
ON public.used_transaction_hashes
FOR ALL
USING (false);

-- Create index for fast lookup
CREATE INDEX idx_used_tx_hashes ON public.used_transaction_hashes(transaction_hash);

-- 5. Add nonce column to admin_actions for replay protection
ALTER TABLE public.admin_actions
ADD COLUMN IF NOT EXISTS nonce TEXT,
ADD COLUMN IF NOT EXISTS signature TEXT,
ADD COLUMN IF NOT EXISTS signed_message TEXT;

-- Create index on nonce for fast lookup
CREATE INDEX IF NOT EXISTS idx_admin_actions_nonce ON public.admin_actions(nonce) WHERE nonce IS NOT NULL;

-- 6. Create function to check if nonce was used
CREATE OR REPLACE FUNCTION public.is_nonce_used(_nonce TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_actions
    WHERE nonce = _nonce
  )
$$;

-- 7. Add rate limiting table for admin operations
CREATE TABLE public.admin_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  last_operation_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  operation_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can manage rate limits
CREATE POLICY "Service role manages rate limits"
ON public.admin_rate_limits
FOR ALL
USING (false);

-- Create unique index for upsert operations
CREATE UNIQUE INDEX idx_rate_limit_wallet_op ON public.admin_rate_limits(wallet_address, operation_type);

-- 8. Add column to track if phone numbers and bank details were accessed
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS full_phone_accessed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS full_phone_accessed_by TEXT;

ALTER TABLE public.redemptions
ADD COLUMN IF NOT EXISTS bank_details_accessed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS bank_details_accessed_by TEXT;

-- 9. Create function to mask phone numbers
CREATE OR REPLACE FUNCTION public.mask_phone_number(phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN phone IS NULL THEN NULL
    WHEN LENGTH(phone) <= 4 THEN '****'
    ELSE REPEAT('*', LENGTH(phone) - 4) || RIGHT(phone, 4)
  END
$$;

-- 10. Create view for masked deposits (admins with view_deposits can see masked data)
CREATE OR REPLACE VIEW public.deposits_masked AS
SELECT
  id,
  user_id,
  amount_pkr,
  payment_method,
  public.mask_phone_number(phone_number) as phone_number,
  status,
  transaction_id,
  user_transaction_id,
  receipt_url,
  created_at,
  submitted_at,
  reviewed_at,
  reviewed_by,
  rejection_reason,
  mint_transaction_hash,
  updated_at
FROM public.deposits;

-- 11. Update RLS policies to use permission-based checks
DROP POLICY IF EXISTS "Admins can view all deposits" ON public.deposits;

CREATE POLICY "Admins with view permission can see deposits"
ON public.deposits
FOR SELECT
USING (
  public.has_admin_permission(
    (auth.jwt() ->> 'wallet_address')::text,
    'view_deposits'::admin_permission
  )
);

DROP POLICY IF EXISTS "Admins can view all whitelist requests" ON public.whitelist_requests;

CREATE POLICY "Admins with whitelist permission can view requests"
ON public.whitelist_requests
FOR SELECT
USING (
  LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')::text)
  OR public.has_admin_permission(
    (auth.jwt() ->> 'wallet_address')::text,
    'manage_whitelist'::admin_permission
  )
);

DROP POLICY IF EXISTS "Admins can view blacklisted addresses" ON public.blacklisted_addresses;

CREATE POLICY "Admins with blacklist permission can view blacklist"
ON public.blacklisted_addresses
FOR SELECT
USING (
  public.has_admin_permission(
    (auth.jwt() ->> 'wallet_address')::text,
    'manage_blacklist'::admin_permission
  )
);

DROP POLICY IF EXISTS "Only admins can view bank reserves" ON public.bank_reserves;

CREATE POLICY "Admins with reserve permission can view reserves"
ON public.bank_reserves
FOR SELECT
USING (
  public.has_admin_permission(
    (auth.jwt() ->> 'wallet_address')::text,
    'view_reserves'::admin_permission
  )
);

DROP POLICY IF EXISTS "Only admins can view transaction fees" ON public.transaction_fees;

CREATE POLICY "Admins with fee permission can view fees"
ON public.transaction_fees
FOR SELECT
USING (
  public.has_admin_permission(
    (auth.jwt() ->> 'wallet_address')::text,
    'view_transaction_fees'::admin_permission
  )
);

DROP POLICY IF EXISTS "Only admins can view market maker transactions" ON public.market_maker_transactions;

CREATE POLICY "Admins with market maker permission can view transactions"
ON public.market_maker_transactions
FOR SELECT
USING (
  public.has_admin_permission(
    (auth.jwt() ->> 'wallet_address')::text,
    'manage_market_maker'::admin_permission
  )
);

-- 12. Add comment explaining the security model
COMMENT ON TABLE public.admin_roles IS 'Stores granular permissions for admin wallets. Each admin can have multiple permissions. Use has_admin_permission() function in RLS policies and edge functions.';
COMMENT ON TABLE public.used_transaction_hashes IS 'Prevents transaction replay attacks by tracking all used mint/burn transaction hashes.';
COMMENT ON FUNCTION public.has_admin_permission IS 'Security definer function to check if a wallet has a specific admin permission. Use this in RLS policies to avoid recursion.';
COMMENT ON FUNCTION public.mask_phone_number IS 'Masks phone numbers showing only last 4 digits. Use this for displaying phone numbers to admins who should not see full numbers.';