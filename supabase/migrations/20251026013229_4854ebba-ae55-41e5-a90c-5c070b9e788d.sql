-- Add V2 admin wallet
INSERT INTO public.admin_wallets (wallet_address, is_active)
VALUES ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', true)
ON CONFLICT (wallet_address) DO NOTHING;

-- Grant necessary permissions
INSERT INTO public.admin_roles (wallet_address, permission, granted_by)
VALUES 
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_deposits', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_reserves', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_transaction_fees', 'system')
ON CONFLICT (wallet_address, permission) DO NOTHING;