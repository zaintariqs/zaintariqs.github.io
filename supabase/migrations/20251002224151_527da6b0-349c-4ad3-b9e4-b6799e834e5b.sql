-- Align redemptions.user_id with wallet-based auth by storing wallet addresses as text
-- Safely change column type from uuid -> text and index it for lookups
ALTER TABLE public.redemptions
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- Add an index to speed up lookups by wallet address
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'idx_redemptions_user_id') THEN
    CREATE INDEX idx_redemptions_user_id ON public.redemptions (user_id);
  END IF;
END $$;

-- Add a helpful comment for future maintainers
COMMENT ON COLUMN public.redemptions.user_id IS 'Stores the wallet address (lowercased) of the redemption requester. Previously stored as UUID, now text for wallet-based authentication.';