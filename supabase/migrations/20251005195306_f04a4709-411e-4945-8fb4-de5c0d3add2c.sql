-- Add missing updated_at column to bank_reserves for trigger compatibility
ALTER TABLE public.bank_reserves
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ensure a PKR reserve row exists so manual 'set' updates have a target
INSERT INTO public.bank_reserves (reserve_type, amount, last_updated, updated_by)
SELECT 'pkr', 0, now(), NULL
WHERE NOT EXISTS (
  SELECT 1 FROM public.bank_reserves WHERE reserve_type = 'pkr'
);
