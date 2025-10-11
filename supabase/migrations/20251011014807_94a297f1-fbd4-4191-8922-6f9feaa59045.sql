-- Update master minter configuration with new address
UPDATE public.master_minter_config
SET 
  master_minter_address = '0x50C46b0286028c3ab12b947003129FEb39CcF082',
  updated_at = now(),
  updated_by = '0x50C46b0286028c3ab12b947003129FEb39CcF082'
WHERE id = (SELECT id FROM public.master_minter_config ORDER BY created_at DESC LIMIT 1);

-- If no config exists, insert new one
INSERT INTO public.master_minter_config (master_minter_address, updated_by)
SELECT '0x50C46b0286028c3ab12b947003129FEb39CcF082', '0x50C46b0286028c3ab12b947003129FEb39CcF082'
WHERE NOT EXISTS (SELECT 1 FROM public.master_minter_config);

-- Log this change in master minter history
INSERT INTO public.master_minter_history (
  old_address,
  new_address,
  changed_by,
  change_reason
)
VALUES (
  (SELECT master_minter_address FROM public.master_minter_config ORDER BY created_at DESC LIMIT 1 OFFSET 1),
  '0x50C46b0286028c3ab12b947003129FEb39CcF082',
  '0x50C46b0286028c3ab12b947003129FEb39CcF082',
  'Updated to new PKRSC contract with fee collection mechanism'
);