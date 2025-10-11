-- Add master minter address as an active admin wallet
INSERT INTO public.admin_wallets (wallet_address, is_active, added_by)
VALUES ('0x50C46b0286028c3ab12b947003129FEb39CcF082', true, NULL)
ON CONFLICT (wallet_address) DO UPDATE SET is_active = true;

-- Grant all admin permissions to master minter
INSERT INTO public.admin_roles (wallet_address, permission, granted_by)
VALUES 
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'approve_deposits', 'system'),
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'manage_whitelist', 'system'),
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'view_deposits', 'system'),
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'manage_blacklist', 'system'),
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'view_reserves', 'system'),
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'manage_market_maker', 'system'),
  ('0x50C46b0286028c3ab12b947003129FEb39CcF082', 'view_transaction_fees', 'system')
ON CONFLICT (wallet_address, permission) DO NOTHING;