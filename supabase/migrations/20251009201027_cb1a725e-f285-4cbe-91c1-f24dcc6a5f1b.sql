-- Create table for login attempts tracking
CREATE TABLE public.login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_login_attempts_wallet ON public.login_attempts(wallet_address);
CREATE INDEX idx_login_attempts_created_at ON public.login_attempts(created_at DESC);

-- Enable RLS
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins with view_deposits permission can see all login attempts
CREATE POLICY "Admins can view login attempts"
ON public.login_attempts
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'));

-- Policy: Service role can insert login attempts
CREATE POLICY "Service role can insert login attempts"
ON public.login_attempts
FOR INSERT
WITH CHECK (true);