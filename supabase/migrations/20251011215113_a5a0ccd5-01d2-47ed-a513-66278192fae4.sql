-- Create table for special token holder addresses
CREATE TABLE IF NOT EXISTS public.special_addresses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  address text NOT NULL UNIQUE,
  label text NOT NULL,
  label_type text NOT NULL, -- 'provider', 'uniswap', 'master-minter'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.special_addresses ENABLE ROW LEVEL SECURITY;

-- Allow admins to view special addresses
CREATE POLICY "Admins can view special addresses"
ON public.special_addresses
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'::admin_permission));

-- Service role can manage special addresses
CREATE POLICY "Service role can manage special addresses"
ON public.special_addresses
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Insert the known special addresses
INSERT INTO public.special_addresses (address, label, label_type) VALUES
  ('0xcfbdcbfd1312a2d85545a88ca95c93c7523dd11b', 'LIQUIDITY PROVIDER ADDRESS', 'provider'),
  ('0x1bc6fb786b7b5ba4d31a7f47a75ec3fd3b26690e', 'LIQUIDITY POOL ADDRESS', 'uniswap'),
  ('0x50c46b0286028c3ab12b947003129feb39ccf082', 'MASTER MINTER ADDRESS', 'master-minter')
ON CONFLICT (address) DO NOTHING;

-- Create updated_at trigger
CREATE TRIGGER update_special_addresses_updated_at
BEFORE UPDATE ON public.special_addresses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();