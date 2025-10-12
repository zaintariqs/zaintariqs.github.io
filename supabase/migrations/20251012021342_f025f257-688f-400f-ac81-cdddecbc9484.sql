-- Fix verification code hashing and rate limiting issues

-- 1. Enable pgcrypto extension for verification code hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Add unique constraint to admin_rate_limits table for ON CONFLICT clause
-- First, check if there are any duplicate entries and clean them up
DELETE FROM public.admin_rate_limits a
USING public.admin_rate_limits b
WHERE a.id > b.id 
  AND a.wallet_address = b.wallet_address 
  AND a.operation_type = b.operation_type 
  AND a.window_start = b.window_start;

-- Now add the unique constraint
ALTER TABLE public.admin_rate_limits 
ADD CONSTRAINT admin_rate_limits_unique_key 
UNIQUE (wallet_address, operation_type, window_start);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_admin_rate_limits_lookup 
ON public.admin_rate_limits (wallet_address, operation_type, window_start);

-- Log the fix
INSERT INTO public.admin_actions (action_type, wallet_address, details)
VALUES (
  'whitelist_verification_fix_applied',
  'system',
  jsonb_build_object(
    'fixes', ARRAY['enabled_pgcrypto_extension', 'added_rate_limits_unique_constraint'],
    'description', 'Fixed verification code hashing and rate limiting database constraints',
    'timestamp', now()
  )
);