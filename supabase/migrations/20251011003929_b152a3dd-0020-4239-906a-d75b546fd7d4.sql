-- First add wallet to admin_wallets, then grant view_transaction_fees permission

-- Add wallet to admin_wallets
INSERT INTO public.admin_wallets (wallet_address, is_active, added_by)
VALUES ('0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249', true, 
  (SELECT id FROM public.admin_wallets WHERE wallet_address = '0x5be080f81552c2495b288c04d2b64b9f7a4a9f3f' LIMIT 1))
ON CONFLICT (wallet_address) DO UPDATE SET is_active = true;

-- Grant view_transaction_fees permission
INSERT INTO public.admin_roles (wallet_address, permission, granted_by)
VALUES ('0xa46923ae83d45e433bbe5dee6b9e787eb5fb9249', 'view_transaction_fees', '0x5be080f81552c2495b288c04d2b64b9f7a4a9f3f')
ON CONFLICT (wallet_address, permission) DO NOTHING;