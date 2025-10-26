-- Add bank details to v2_deposits table for streamlined flow
ALTER TABLE public.v2_deposits
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT,
ADD COLUMN IF NOT EXISTS account_title TEXT,
ADD COLUMN IF NOT EXISTS redemption_id UUID,
ADD COLUMN IF NOT EXISTS burn_tx_hash TEXT;