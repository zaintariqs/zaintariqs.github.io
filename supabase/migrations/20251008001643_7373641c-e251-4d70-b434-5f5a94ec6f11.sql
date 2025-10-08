-- Grant all permissions to active admin wallets

-- Main admin wallet - full permissions
INSERT INTO public.admin_roles (wallet_address, permission, granted_by)
VALUES 
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_deposits', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'approve_deposits', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_redemptions', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'process_redemptions', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'manage_whitelist', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'manage_blacklist', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_reserves', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'manage_reserves', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'manage_market_maker', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'manage_admins', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_transaction_fees', 'system'),
  ('0x5be080f81552c2495B288c04D2B64b9F7A4A9F3F', 'view_audit_logs', 'system')
ON CONFLICT (wallet_address, permission) DO NOTHING;

-- Market maker bot wallet - market maker permissions only
INSERT INTO public.admin_roles (wallet_address, permission, granted_by)
VALUES 
  ('0x65706aa69b3613bfc6926561ef332118d20cbc41', 'manage_market_maker', 'system'),
  ('0x65706aa69b3613bfc6926561ef332118d20cbc41', 'view_reserves', 'system')
ON CONFLICT (wallet_address, permission) DO NOTHING;

-- Third admin wallet - full permissions
INSERT INTO public.admin_roles (wallet_address, permission, granted_by)
VALUES 
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'view_deposits', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'approve_deposits', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'view_redemptions', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'process_redemptions', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'manage_whitelist', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'manage_blacklist', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'view_reserves', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'manage_reserves', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'manage_market_maker', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'manage_admins', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'view_transaction_fees', 'system'),
  ('0x271546e11839a2d19a891d7520a9a871de85cc7f', 'view_audit_logs', 'system')
ON CONFLICT (wallet_address, permission) DO NOTHING;