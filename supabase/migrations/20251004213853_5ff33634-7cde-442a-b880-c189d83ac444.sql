-- Create whitelist_requests table
CREATE TABLE IF NOT EXISTS public.whitelist_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  rejection_reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.whitelist_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own whitelist request
CREATE POLICY "Users can view their own whitelist request"
ON public.whitelist_requests
FOR SELECT
USING (LOWER(wallet_address) = LOWER(auth.jwt() ->> 'wallet_address'));

-- Anyone can create a whitelist request
CREATE POLICY "Anyone can create whitelist request"
ON public.whitelist_requests
FOR INSERT
WITH CHECK (true);

-- Only admins can view all whitelist requests
CREATE POLICY "Admins can view all whitelist requests"
ON public.whitelist_requests
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER(auth.jwt() ->> 'wallet_address')
    AND is_active = true
  )
);

-- Service role can update whitelist requests
CREATE POLICY "Service role can update whitelist requests"
ON public.whitelist_requests
FOR UPDATE
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_whitelist_requests_updated_at
  BEFORE UPDATE ON public.whitelist_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for faster queries
CREATE INDEX idx_whitelist_requests_wallet_address ON public.whitelist_requests(LOWER(wallet_address));
CREATE INDEX idx_whitelist_requests_status ON public.whitelist_requests(status);
CREATE INDEX idx_whitelist_requests_requested_at ON public.whitelist_requests(requested_at DESC);

-- Create function to check if wallet is whitelisted
CREATE OR REPLACE FUNCTION public.is_wallet_whitelisted(wallet_addr TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.whitelist_requests
    WHERE LOWER(wallet_address) = LOWER(wallet_addr)
      AND status = 'approved'
  )
$$;