-- Add email verification fields to whitelist_requests
ALTER TABLE public.whitelist_requests 
ADD COLUMN email_verified BOOLEAN DEFAULT false,
ADD COLUMN verification_code TEXT,
ADD COLUMN verification_expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN verification_attempts INTEGER DEFAULT 0;

-- Create index for faster verification lookups
CREATE INDEX idx_whitelist_verification_code ON public.whitelist_requests(verification_code) WHERE verification_code IS NOT NULL;

-- Update existing records to be unverified
UPDATE public.whitelist_requests 
SET email_verified = false 
WHERE email_verified IS NULL;

COMMENT ON COLUMN public.whitelist_requests.email_verified IS 'Whether the email address has been verified';
COMMENT ON COLUMN public.whitelist_requests.verification_code IS '6-digit code sent to email for verification';
COMMENT ON COLUMN public.whitelist_requests.verification_expires_at IS 'Expiration time for verification code (15 minutes)';
COMMENT ON COLUMN public.whitelist_requests.verification_attempts IS 'Number of failed verification attempts (max 5)';