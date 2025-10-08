-- Add email encryption infrastructure for better PII protection
CREATE TABLE IF NOT EXISTS public.encrypted_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address text NOT NULL UNIQUE,
  encrypted_email text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  accessed_by text,
  accessed_at timestamp with time zone
);

ALTER TABLE public.encrypted_emails ENABLE ROW LEVEL SECURITY;

-- Only service role can manage encrypted emails
CREATE POLICY "Service role manages encrypted emails"
ON public.encrypted_emails
FOR ALL
USING (false);

-- Track whitelist request submissions with signature verification
ALTER TABLE public.whitelist_requests
ADD COLUMN IF NOT EXISTS signature text,
ADD COLUMN IF NOT EXISTS nonce text,
ADD COLUMN IF NOT EXISTS client_ip text;

-- Add indexes for faster lookups and better performance
CREATE INDEX IF NOT EXISTS idx_whitelist_requests_wallet ON public.whitelist_requests(lower(wallet_address));
CREATE INDEX IF NOT EXISTS idx_encrypted_emails_wallet ON public.encrypted_emails(lower(wallet_address));

-- Log access to sensitive whitelist data for audit trail
CREATE TABLE IF NOT EXISTS public.whitelist_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by text NOT NULL,
  wallet_address text NOT NULL,
  access_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.whitelist_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only service role can manage access logs"
ON public.whitelist_access_log
FOR ALL
USING (false);

-- Add phone encryption tracking column
ALTER TABLE public.deposits
ADD COLUMN IF NOT EXISTS phone_encrypted boolean DEFAULT false;

-- Comment explaining security measures
COMMENT ON TABLE public.encrypted_emails IS 'Stores encrypted email addresses separately from main tables for enhanced PII protection';
COMMENT ON TABLE public.whitelist_access_log IS 'Audit trail for all access to whitelist request data';