-- Create transaction_fees table to track all fees collected
CREATE TABLE public.transaction_fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('deposit', 'redemption')),
  transaction_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  original_amount NUMERIC NOT NULL,
  fee_percentage NUMERIC NOT NULL DEFAULT 0.5,
  fee_amount NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.transaction_fees ENABLE ROW LEVEL SECURITY;

-- Only admins can view fees
CREATE POLICY "Only admins can view transaction fees"
  ON public.transaction_fees
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_wallets
      WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
      AND is_active = true
    )
  );

-- Service role can insert fees
CREATE POLICY "Service role can insert transaction fees"
  ON public.transaction_fees
  FOR INSERT
  WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX idx_transaction_fees_user_id ON public.transaction_fees(user_id);
CREATE INDEX idx_transaction_fees_type ON public.transaction_fees(transaction_type);
CREATE INDEX idx_transaction_fees_created_at ON public.transaction_fees(created_at DESC);