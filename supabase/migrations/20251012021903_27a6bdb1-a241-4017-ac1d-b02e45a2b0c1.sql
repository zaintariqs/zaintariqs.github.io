-- Fix hashing function to avoid digest(bytea, unknown) error by adding explicit casts and proper text->bytea conversion
-- Ensure pgcrypto is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Replace hash_verification_code with robust implementation
CREATE OR REPLACE FUNCTION public.hash_verification_code(code text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Use convert_to for deterministic bytea and cast hash algorithm to text
  RETURN encode(digest(convert_to(code, 'UTF8'), 'sha256'::text), 'hex');
END;
$$;

-- Log the fix
INSERT INTO public.admin_actions (action_type, wallet_address, details)
VALUES (
  'fix_hash_verification_code_function',
  'system',
  jsonb_build_object(
    'description', 'Updated hashing function to use convert_to and explicit casts to satisfy pgcrypto signature',
    'timestamp', now()
  )
);