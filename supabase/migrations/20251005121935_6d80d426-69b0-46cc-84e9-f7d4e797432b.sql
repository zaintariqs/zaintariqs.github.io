-- Add cancellation_reason to redemptions table
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Add bank_transaction_id to redemptions table for admin to input when completing
ALTER TABLE public.redemptions ADD COLUMN IF NOT EXISTS bank_transaction_id TEXT;