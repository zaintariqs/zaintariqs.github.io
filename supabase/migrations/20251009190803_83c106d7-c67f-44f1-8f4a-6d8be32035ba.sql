-- Remove plaintext email from whitelist_requests table for security
-- Emails are already stored encrypted in the encrypted_emails table

-- Drop the email column from whitelist_requests table
-- This forces all email access to go through encrypted_emails table
ALTER TABLE public.whitelist_requests 
DROP COLUMN IF EXISTS email;

-- Add helpful comments explaining the security model
COMMENT ON TABLE public.whitelist_requests IS 
  'User whitelist requests. Emails are stored separately in encrypted_emails table for PII protection. Use join with encrypted_emails to access user email addresses.';

COMMENT ON TABLE public.encrypted_emails IS
  'Encrypted user emails for PII protection. Emails must be decrypted in edge functions using BANK_DATA_ENCRYPTION_KEY secret.';