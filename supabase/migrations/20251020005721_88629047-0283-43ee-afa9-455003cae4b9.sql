-- Create USDT deposits table
CREATE TABLE public.usdt_deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  from_address TEXT NOT NULL,
  amount_usdt NUMERIC NOT NULL,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usdt_deposits ENABLE ROW LEVEL SECURITY;

-- Users can view their own USDT deposits
CREATE POLICY "Users can view own USDT deposits"
ON public.usdt_deposits
FOR SELECT
USING (LOWER(user_wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')::text));

-- Admins can view all USDT deposits
CREATE POLICY "Admins can view all USDT deposits"
ON public.usdt_deposits
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'));

-- Service role can insert USDT deposits
CREATE POLICY "Service role can insert USDT deposits"
ON public.usdt_deposits
FOR INSERT
WITH CHECK (true);

-- Create indexes for faster queries
CREATE INDEX idx_usdt_deposits_wallet ON public.usdt_deposits(LOWER(user_wallet_address));
CREATE INDEX idx_usdt_deposits_timestamp ON public.usdt_deposits(timestamp DESC);
CREATE INDEX idx_usdt_deposits_tx_hash ON public.usdt_deposits(transaction_hash);