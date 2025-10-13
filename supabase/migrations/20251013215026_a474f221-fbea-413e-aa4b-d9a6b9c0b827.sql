-- Manual attachment of transaction hash to redemption 1a0777e7-810c-4956-8016-56b4c5ae29eb

-- Update redemption with transaction hash
UPDATE public.redemptions
SET 
  transaction_hash = '0x92411f8b4fc724d14af7177a845229047f3320343254ca53e9120b296928f330',
  status = 'pending_burn',
  updated_at = now()
WHERE id = '1a0777e7-810c-4956-8016-56b4c5ae29eb';

-- Mark transaction hash as used
INSERT INTO public.used_transaction_hashes (transaction_hash, transaction_type, used_by)
VALUES (
  '0x92411f8b4fc724d14af7177a845229047f3320343254ca53e9120b296928f330',
  'redemption',
  '0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249'
);

-- Log the manual action
INSERT INTO public.admin_actions (action_type, wallet_address, details)
VALUES (
  'manual_attach_redemption_tx',
  'system',
  jsonb_build_object(
    'redemption_id', '1a0777e7-810c-4956-8016-56b4c5ae29eb',
    'transaction_hash', '0x92411f8b4fc724d14af7177a845229047f3320343254ca53e9120b296928f330',
    'user', '0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249',
    'method', 'manual_database_update',
    'timestamp', now()
  )
);