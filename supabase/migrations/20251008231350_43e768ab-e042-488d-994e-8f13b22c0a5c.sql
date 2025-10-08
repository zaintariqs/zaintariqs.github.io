-- ============================================
-- PHASE 1 CRITICAL SECURITY FIXES (FIXED)
-- ============================================

-- 1. SECURE MASTER MINTER CONFIGURATION
-- Create table to store master minter address securely
CREATE TABLE IF NOT EXISTS public.master_minter_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  master_minter_address TEXT NOT NULL UNIQUE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on master minter config
ALTER TABLE public.master_minter_config ENABLE ROW LEVEL SECURITY;

-- Only service role can modify master minter config
CREATE POLICY "Service role manages master minter config"
ON public.master_minter_config
FOR ALL
USING (false);

-- Create audit log for master minter changes
CREATE TABLE IF NOT EXISTS public.master_minter_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  old_address TEXT,
  new_address TEXT NOT NULL,
  changed_by TEXT NOT NULL,
  change_reason TEXT,
  approved_by TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on history
ALTER TABLE public.master_minter_history ENABLE ROW LEVEL SECURITY;

-- Admins with view deposits permission can view history (using existing permission)
CREATE POLICY "Admins can view master minter history"
ON public.master_minter_history
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'::admin_permission));

-- Security definer function to get master minter address
CREATE OR REPLACE FUNCTION public.get_master_minter_address()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT master_minter_address
  FROM public.master_minter_config
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Insert initial master minter address
INSERT INTO public.master_minter_config (master_minter_address, updated_by)
VALUES ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'system')
ON CONFLICT (master_minter_address) DO NOTHING;

-- 2. FIX DEPOSITS_MASKED VIEW RLS EXPOSURE
-- Drop existing view and recreate with proper RLS-enabled table
DROP VIEW IF EXISTS public.deposits_masked;

-- Create a proper table for masked deposits (views can't have RLS)
CREATE TABLE IF NOT EXISTS public.deposits_public (
  id UUID PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount_pkr NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  phone_number TEXT NOT NULL, -- This will be masked
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  user_transaction_id TEXT,
  transaction_id TEXT,
  reviewed_by TEXT,
  receipt_url TEXT,
  rejection_reason TEXT,
  mint_transaction_hash TEXT
);

-- Enable RLS
ALTER TABLE public.deposits_public ENABLE ROW LEVEL SECURITY;

-- Users can only view their own masked deposits
CREATE POLICY "Users can view own masked deposits"
ON public.deposits_public
FOR SELECT
USING (lower(user_id) = lower((auth.jwt() ->> 'wallet_address')::text));

-- Admins with view_deposits permission can view all
CREATE POLICY "Admins can view all masked deposits"
ON public.deposits_public
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'::admin_permission));

-- Block all modifications (read-only table)
CREATE POLICY "Block all modifications to deposits_public"
ON public.deposits_public
FOR ALL
USING (false)
WITH CHECK (false);

-- Create function to sync deposits to deposits_public with masking
CREATE OR REPLACE FUNCTION public.sync_deposits_to_public()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert or update the masked version
  INSERT INTO public.deposits_public (
    id, user_id, amount_pkr, payment_method, phone_number, status,
    created_at, submitted_at, reviewed_at, updated_at,
    user_transaction_id, transaction_id, reviewed_by, receipt_url,
    rejection_reason, mint_transaction_hash
  )
  VALUES (
    NEW.id, NEW.user_id, NEW.amount_pkr, NEW.payment_method,
    mask_phone_number(NEW.phone_number), -- Mask phone number
    NEW.status, NEW.created_at, NEW.submitted_at, NEW.reviewed_at, NEW.updated_at,
    NEW.user_transaction_id, NEW.transaction_id, NEW.reviewed_by, NEW.receipt_url,
    NEW.rejection_reason, NEW.mint_transaction_hash
  )
  ON CONFLICT (id) DO UPDATE SET
    amount_pkr = EXCLUDED.amount_pkr,
    payment_method = EXCLUDED.payment_method,
    phone_number = mask_phone_number(NEW.phone_number),
    status = EXCLUDED.status,
    submitted_at = EXCLUDED.submitted_at,
    reviewed_at = EXCLUDED.reviewed_at,
    updated_at = EXCLUDED.updated_at,
    user_transaction_id = EXCLUDED.user_transaction_id,
    transaction_id = EXCLUDED.transaction_id,
    reviewed_by = EXCLUDED.reviewed_by,
    receipt_url = EXCLUDED.receipt_url,
    rejection_reason = EXCLUDED.rejection_reason,
    mint_transaction_hash = EXCLUDED.mint_transaction_hash;
    
  RETURN NEW;
END;
$$;

-- Create trigger to auto-sync deposits to public table
DROP TRIGGER IF EXISTS sync_deposits_to_public_trigger ON public.deposits;
CREATE TRIGGER sync_deposits_to_public_trigger
AFTER INSERT OR UPDATE ON public.deposits
FOR EACH ROW
EXECUTE FUNCTION public.sync_deposits_to_public();

-- Sync existing data
INSERT INTO public.deposits_public (
  id, user_id, amount_pkr, payment_method, phone_number, status,
  created_at, submitted_at, reviewed_at, updated_at,
  user_transaction_id, transaction_id, reviewed_by, receipt_url,
  rejection_reason, mint_transaction_hash
)
SELECT 
  id, user_id, amount_pkr, payment_method,
  mask_phone_number(phone_number), -- Mask phone number
  status, created_at, submitted_at, reviewed_at, updated_at,
  user_transaction_id, transaction_id, reviewed_by, receipt_url,
  rejection_reason, mint_transaction_hash
FROM public.deposits
ON CONFLICT (id) DO NOTHING;

-- 3. FIX WHITELIST_REQUESTS RLS TO PREVENT EMAIL HARVESTING
-- Drop ALL existing policies on whitelist_requests
DROP POLICY IF EXISTS "Anyone can create whitelist request" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Users can view their own whitelist request" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Admins with whitelist permission can view requests" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Service role can update whitelist requests" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Admins can delete whitelist requests" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Users can only view their own whitelist request" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Authenticated users can create own whitelist request" ON public.whitelist_requests;
DROP POLICY IF EXISTS "Admins with whitelist permission can view all requests" ON public.whitelist_requests;

-- Recreate with secure policies
CREATE POLICY "Authenticated users can create own whitelist request"
ON public.whitelist_requests
FOR INSERT
WITH CHECK (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')::text));

CREATE POLICY "Users can only view their own whitelist request"
ON public.whitelist_requests
FOR SELECT
USING (lower(wallet_address) = lower((auth.jwt() ->> 'wallet_address')::text));

CREATE POLICY "Admins with whitelist permission can view all requests"
ON public.whitelist_requests
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'manage_whitelist'::admin_permission));

-- Service role can update (for edge functions)
CREATE POLICY "Service role can update whitelist requests"
ON public.whitelist_requests
FOR UPDATE
USING (true);

-- Admins can delete
CREATE POLICY "Admins can delete whitelist requests"
ON public.whitelist_requests
FOR DELETE
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'manage_whitelist'::admin_permission));

-- 4. PHONE NUMBER ENCRYPTION SUPPORT
-- Add encryption key version tracking
ALTER TABLE public.deposits ADD COLUMN IF NOT EXISTS phone_encryption_version INTEGER DEFAULT 1;

-- Create PII access audit log
CREATE TABLE IF NOT EXISTS public.pii_access_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_table TEXT NOT NULL,
  accessed_record_id UUID NOT NULL,
  accessed_fields TEXT[] NOT NULL,
  accessed_by_wallet TEXT NOT NULL,
  access_reason TEXT,
  access_timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ip_address TEXT
);

-- Enable RLS
ALTER TABLE public.pii_access_log ENABLE ROW LEVEL SECURITY;

-- Only admins with audit permission can view PII access logs
CREATE POLICY "Admins can view PII access logs"
ON public.pii_access_log
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'::admin_permission));

-- Service role can insert logs
CREATE POLICY "Service role can log PII access"
ON public.pii_access_log
FOR INSERT
WITH CHECK (true);

-- Function to log PII access
CREATE OR REPLACE FUNCTION public.log_pii_access(
  p_table TEXT,
  p_record_id UUID,
  p_fields TEXT[],
  p_accessed_by TEXT,
  p_reason TEXT DEFAULT NULL,
  p_ip TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pii_access_log (
    accessed_table,
    accessed_record_id,
    accessed_fields,
    accessed_by_wallet,
    access_reason,
    ip_address
  ) VALUES (
    p_table,
    p_record_id,
    p_fields,
    p_accessed_by,
    p_reason,
    p_ip
  );
END;
$$;

-- 5. DATABASE-BACKED RATE LIMITING IMPROVEMENTS
-- Add atomic rate limit check/update function
CREATE OR REPLACE FUNCTION public.check_and_update_rate_limit(
  p_wallet_address TEXT,
  p_operation_type TEXT,
  p_max_operations INTEGER DEFAULT 10,
  p_window_minutes INTEGER DEFAULT 5
)
RETURNS TABLE (
  allowed BOOLEAN,
  retry_after_seconds INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_window_start TIMESTAMP WITH TIME ZONE;
  v_operation_count INTEGER;
  v_oldest_operation TIMESTAMP WITH TIME ZONE;
BEGIN
  v_window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get current operation count in window
  SELECT COUNT(*), MIN(last_operation_at)
  INTO v_operation_count, v_oldest_operation
  FROM public.admin_rate_limits
  WHERE wallet_address = lower(p_wallet_address)
    AND operation_type = p_operation_type
    AND window_start >= v_window_start;
  
  -- Check if rate limit exceeded
  IF v_operation_count >= p_max_operations THEN
    -- Calculate retry after time
    RETURN QUERY SELECT 
      false,
      GREATEST(0, EXTRACT(EPOCH FROM (v_oldest_operation + (p_window_minutes || ' minutes')::INTERVAL - now()))::INTEGER);
    RETURN;
  END IF;
  
  -- Update or insert rate limit record
  INSERT INTO public.admin_rate_limits (
    wallet_address,
    operation_type,
    operation_count,
    last_operation_at,
    window_start
  ) VALUES (
    lower(p_wallet_address),
    p_operation_type,
    1,
    now(),
    v_window_start
  )
  ON CONFLICT (wallet_address, operation_type, window_start)
  DO UPDATE SET
    operation_count = admin_rate_limits.operation_count + 1,
    last_operation_at = now();
  
  -- Return allowed
  RETURN QUERY SELECT true, 0;
END;
$$;

-- Clean up old rate limit records (cron job will call this)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM public.admin_rate_limits
  WHERE window_start < (now() - INTERVAL '24 hours');
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;