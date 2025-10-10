-- Add verification columns to deposits table
ALTER TABLE public.deposits 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Add verification columns to redemptions table
ALTER TABLE public.redemptions 
ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_code TEXT,
ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS verification_attempts INTEGER DEFAULT 0;

-- Create indexes for faster verification lookups
CREATE INDEX IF NOT EXISTS idx_deposits_verification_code ON public.deposits(verification_code);
CREATE INDEX IF NOT EXISTS idx_redemptions_verification_code ON public.redemptions(verification_code);