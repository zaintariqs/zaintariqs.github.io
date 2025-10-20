-- Create trade history table
CREATE TABLE public.trade_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_wallet_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL UNIQUE,
  block_number BIGINT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  token_in TEXT NOT NULL,
  token_out TEXT NOT NULL,
  amount_in NUMERIC NOT NULL,
  amount_out NUMERIC NOT NULL,
  price_at_trade NUMERIC NOT NULL,
  pool_address TEXT NOT NULL DEFAULT '0x1bC6fB786B7B5BA4D31A7F47a75eC3Fd3B26690E',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trade_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own trade history
CREATE POLICY "Users can view own trade history"
ON public.trade_history
FOR SELECT
USING (LOWER(user_wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')::text));

-- Admins can view all trade history
CREATE POLICY "Admins can view all trade history"
ON public.trade_history
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'));

-- Service role can insert trade history
CREATE POLICY "Service role can insert trades"
ON public.trade_history
FOR INSERT
WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_trade_history_wallet ON public.trade_history(LOWER(user_wallet_address));
CREATE INDEX idx_trade_history_timestamp ON public.trade_history(timestamp DESC);
CREATE INDEX idx_trade_history_tx_hash ON public.trade_history(transaction_hash);