-- Step 1: Handle existing duplicate transaction hashes
-- Keep the oldest redemption and NULL out the duplicates
WITH duplicate_txs AS (
  SELECT transaction_hash, COUNT(*) as count
  FROM public.redemptions
  WHERE transaction_hash IS NOT NULL
  GROUP BY transaction_hash
  HAVING COUNT(*) > 1
),
ranked_redemptions AS (
  SELECT 
    r.id,
    r.transaction_hash,
    ROW_NUMBER() OVER (PARTITION BY r.transaction_hash ORDER BY r.created_at ASC) as rn
  FROM public.redemptions r
  INNER JOIN duplicate_txs d ON r.transaction_hash = d.transaction_hash
)
UPDATE public.redemptions
SET transaction_hash = NULL
FROM ranked_redemptions
WHERE public.redemptions.id = ranked_redemptions.id
  AND ranked_redemptions.rn > 1;

-- Step 2: Update any empty transaction_hash values to NULL
UPDATE public.redemptions 
SET transaction_hash = NULL 
WHERE transaction_hash = '' OR TRIM(transaction_hash) = '';

-- Step 3: Create unique index on transaction_hash (allowing NULL values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_redemptions_transaction_hash_unique 
ON public.redemptions(transaction_hash) 
WHERE transaction_hash IS NOT NULL;

COMMENT ON INDEX idx_redemptions_transaction_hash_unique IS 'Prevents transaction hash replay attacks - each blockchain transaction can only be used once for redemption';

-- Step 4: Create validation function
CREATE OR REPLACE FUNCTION public.validate_transaction_hash_unique()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.transaction_hash IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.redemptions 
      WHERE transaction_hash = NEW.transaction_hash 
        AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Transaction hash % has already been used for redemption. Replay attacks are not allowed.', NEW.transaction_hash
        USING HINT = 'Each blockchain transaction can only be redeemed once',
              ERRCODE = '23505';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Step 5: Create trigger
DROP TRIGGER IF EXISTS enforce_transaction_hash_unique ON public.redemptions;
CREATE TRIGGER enforce_transaction_hash_unique
  BEFORE INSERT OR UPDATE ON public.redemptions
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_transaction_hash_unique();

COMMENT ON FUNCTION public.validate_transaction_hash_unique() IS 'Trigger function to prevent transaction hash replay attacks in redemptions';