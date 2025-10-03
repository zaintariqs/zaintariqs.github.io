-- Create deposits table to track user deposit requests
CREATE TABLE IF NOT EXISTS public.deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  amount_pkr NUMERIC NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('easypaisa', 'jazzcash')),
  phone_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected', 'cancelled')),
  transaction_id TEXT,
  rejection_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "Users can view their own deposits"
ON public.deposits
FOR SELECT
USING (auth.jwt() ->> 'wallet_address' = user_id);

-- Service role can insert deposits
CREATE POLICY "Service role can insert deposits"
ON public.deposits
FOR INSERT
WITH CHECK (true);

-- Service role can update deposits
CREATE POLICY "Service role can update deposits"
ON public.deposits
FOR UPDATE
USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_deposits_user_id ON public.deposits(user_id);
CREATE INDEX idx_deposits_status ON public.deposits(status);
CREATE INDEX idx_deposits_created_at ON public.deposits(created_at DESC);