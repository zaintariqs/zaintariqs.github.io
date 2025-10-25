-- Create table for V2 deposits
CREATE TABLE IF NOT EXISTS public.v2_deposits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT NOT NULL,
  usdt_amount NUMERIC NOT NULL,
  expected_pkr_amount NUMERIC NOT NULL,
  exchange_rate_at_creation NUMERIC NOT NULL,
  deposit_address TEXT NOT NULL,
  chain TEXT NOT NULL DEFAULT 'base',
  status TEXT NOT NULL DEFAULT 'pending',
  transaction_hash TEXT,
  confirmations INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.v2_deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own deposits
CREATE POLICY "Users can view own V2 deposits"
ON public.v2_deposits
FOR SELECT
USING (LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')));

-- Admins can view all deposits
CREATE POLICY "Admins can view all V2 deposits"
ON public.v2_deposits
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address'), 'view_deposits'));

-- Service role can manage deposits
CREATE POLICY "Service role can manage V2 deposits"
ON public.v2_deposits
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_v2_deposits_wallet ON public.v2_deposits(wallet_address);
CREATE INDEX IF NOT EXISTS idx_v2_deposits_status ON public.v2_deposits(status);
CREATE INDEX IF NOT EXISTS idx_v2_deposits_tx_hash ON public.v2_deposits(transaction_hash);

-- Add trigger for updated_at
CREATE TRIGGER update_v2_deposits_updated_at
  BEFORE UPDATE ON public.v2_deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
