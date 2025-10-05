-- Create bank reserves table to track PKR holdings
CREATE TABLE IF NOT EXISTS public.bank_reserves (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reserve_type text NOT NULL, -- 'pkr' or 'usdt'
  amount numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  updated_by text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Insert initial PKR reserve record
INSERT INTO public.bank_reserves (reserve_type, amount)
VALUES ('pkr', 0)
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE public.bank_reserves ENABLE ROW LEVEL SECURITY;

-- Only admins can view reserves
CREATE POLICY "Only admins can view bank reserves"
ON public.bank_reserves
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address'))
    AND is_active = true
  )
);

-- Only service role can update reserves
CREATE POLICY "Only service role can update reserves"
ON public.bank_reserves
FOR UPDATE
USING (true);

-- Create function to update PKR reserves
CREATE OR REPLACE FUNCTION public.update_pkr_reserves(amount_change numeric, updated_by_wallet text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.bank_reserves
  SET 
    amount = amount + amount_change,
    last_updated = now(),
    updated_by = updated_by_wallet
  WHERE reserve_type = 'pkr';
END;
$$;

-- Create trigger to update reserves timestamp
CREATE TRIGGER update_bank_reserves_timestamp
BEFORE UPDATE ON public.bank_reserves
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();