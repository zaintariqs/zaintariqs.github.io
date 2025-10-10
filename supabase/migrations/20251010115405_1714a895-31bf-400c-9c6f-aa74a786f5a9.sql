-- Update promotional reserves to 30,000
UPDATE public.bank_reserves 
SET amount = 30000, updated_by = 'system'
WHERE reserve_type = 'promotional';