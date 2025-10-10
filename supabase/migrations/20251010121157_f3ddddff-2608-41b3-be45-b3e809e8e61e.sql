-- Mark the incorrect bonus as failed
UPDATE public.welcome_bonuses
SET 
  status = 'failed',
  error_message = 'Incorrect decimal precision used - 18 decimals instead of 6. Actual amount minted was too high.'
WHERE LOWER(wallet_address) = LOWER('0x1c842C5170834221242AbceCA9898E37b5345632')
  AND status = 'completed';

-- Restore the promotional reserves (add back the 300 PKR)
UPDATE public.bank_reserves
SET 
  amount = amount + 300,
  updated_by = 'system_correction',
  last_updated = now()
WHERE reserve_type = 'promotional';