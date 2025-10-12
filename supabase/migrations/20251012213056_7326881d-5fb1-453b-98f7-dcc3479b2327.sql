-- Add desired_pkr_amount column to redemptions table
-- This stores the exact whole PKR amount user wants to receive in their bank
ALTER TABLE public.redemptions 
ADD COLUMN desired_pkr_amount numeric;

-- Update existing records to set desired_pkr_amount based on current pkrsc_amount
-- For existing redemptions, calculate what the PKR amount would have been
UPDATE public.redemptions 
SET desired_pkr_amount = FLOOR(pkrsc_amount / 1.005);

-- Make the column NOT NULL after populating existing data
ALTER TABLE public.redemptions 
ALTER COLUMN desired_pkr_amount SET NOT NULL;

-- Add a check to ensure desired_pkr_amount is a whole number (for new inserts only)
ALTER TABLE public.redemptions
ADD CONSTRAINT check_desired_pkr_whole_number 
CHECK (desired_pkr_amount = FLOOR(desired_pkr_amount));

-- Comment on the columns
COMMENT ON COLUMN public.redemptions.desired_pkr_amount IS 'Exact whole PKR amount user will receive in bank account (no decimals). Minimum 100 PKR for new redemptions.';
COMMENT ON COLUMN public.redemptions.pkrsc_amount IS 'Total PKRSC tokens burned (includes 0.5% fee, supports decimals)';