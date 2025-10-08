-- Fix security linter issues

-- 1. Fix deposits_masked view to use security_invoker
DROP VIEW IF EXISTS public.deposits_masked;

CREATE OR REPLACE VIEW public.deposits_masked
WITH (security_invoker=on)
AS
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

-- 2. Fix functions to use search_path = ''

-- Fix mask_phone_number function
CREATE OR REPLACE FUNCTION public.mask_phone_number(phone TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN phone IS NULL THEN NULL
    WHEN LENGTH(phone) <= 4 THEN '****'
    ELSE REPEAT('*', LENGTH(phone) - 4) || RIGHT(phone, 4)
  END
$$;

-- Fix is_nonce_used function
CREATE OR REPLACE FUNCTION public.is_nonce_used(_nonce TEXT)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_actions
    WHERE nonce = _nonce
  )
$$;