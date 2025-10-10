-- Remove duplicate promotional reserves, keeping the most recent one
DELETE FROM public.bank_reserves
WHERE reserve_type = 'promotional'
  AND id NOT IN (
    SELECT id 
    FROM public.bank_reserves 
    WHERE reserve_type = 'promotional'
    ORDER BY updated_at DESC 
    LIMIT 1
  );