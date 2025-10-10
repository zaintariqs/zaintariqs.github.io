-- Add 'draft' to the redemption_status enum type
ALTER TYPE redemption_status ADD VALUE IF NOT EXISTS 'draft';

-- Update deposits table to use TEXT with check constraint instead of enum
-- First, check what the current status column type is for deposits
-- The deposits.status is already TEXT, so we just need to update the check constraint

-- Drop existing check constraint if it exists
ALTER TABLE public.deposits DROP CONSTRAINT IF EXISTS deposits_status_check;

-- Add new check constraint with 'draft' included
ALTER TABLE public.deposits 
ADD CONSTRAINT deposits_status_check 
CHECK (status IN ('draft', 'pending', 'processing', 'approved', 'rejected', 'completed'));