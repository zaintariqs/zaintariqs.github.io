-- Manual attachment of transaction hash to redemption e1cffd84-7248-42f0-bffa-b3f9bf0f1c14

-- Update redemption with transaction hash
UPDATE public.redemptions
SET 
  transaction_hash = '0x6a9d3d40f3ef16d6ebc4687cfb0f095aa0be22ec3d212ef9a123859cdd6ab1c6',
  status = 'pending_burn',
  updated_at = now()
WHERE id = 'e1cffd84-7248-42f0-bffa-b3f9bf0f1c14';

-- Mark transaction hash as used
INSERT INTO public.used_transaction_hashes (transaction_hash, transaction_type, used_by)
VALUES (
  '0x6a9d3d40f3ef16d6ebc4687cfb0f095aa0be22ec3d212ef9a123859cdd6ab1c6',
  'redemption',
  '0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249'
);

-- Log the manual action
INSERT INTO public.admin_actions (action_type, wallet_address, details)
VALUES (
  'manual_attach_redemption_tx',
  'system',
  jsonb_build_object(
    'redemption_id', 'e1cffd84-7248-42f0-bffa-b3f9bf0f1c14',
    'transaction_hash', '0x6a9d3d40f3ef16d6ebc4687cfb0f095aa0be22ec3d212ef9a123859cdd6ab1c6',
    'user', '0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249',
    'method', 'manual_database_update',
    'timestamp', now()
  )
);