-- Create storage bucket for deposit receipts
INSERT INTO storage.buckets (id, name, public)
VALUES ('deposit-receipts', 'deposit-receipts', false)
ON CONFLICT (id) DO NOTHING;

-- Add columns to deposits table for user submission
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS user_transaction_id TEXT,
ADD COLUMN IF NOT EXISTS receipt_url TEXT,
ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS mint_transaction_hash TEXT;

-- Storage policies for deposit receipts
CREATE POLICY "Users can upload their own receipts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'deposit-receipts' AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'wallet_address')
);

CREATE POLICY "Users can view their own receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit-receipts' AND
  (storage.foldername(name))[1] = (auth.jwt() ->> 'wallet_address')
);

CREATE POLICY "Admins can view all receipts"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'deposit-receipts' AND
  EXISTS (
    SELECT 1 FROM admin_wallets
    WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
    AND is_active = true
  )
);