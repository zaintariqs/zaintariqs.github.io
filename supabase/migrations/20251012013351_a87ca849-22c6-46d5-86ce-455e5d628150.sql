-- Enable pgcrypto extension for cryptographic functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add function to hash verification codes using SHA-256
CREATE OR REPLACE FUNCTION public.hash_verification_code(code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN encode(digest(code::bytea, 'sha256'), 'hex');
END;
$$;

-- Add comment explaining the function
COMMENT ON FUNCTION public.hash_verification_code(text) IS 'Hashes verification codes using SHA-256 for secure storage. Returns hex-encoded hash.';