-- Allow bank as a valid payment method for deposits
ALTER TABLE public.deposits DROP CONSTRAINT IF EXISTS deposits_payment_method_check;
ALTER TABLE public.deposits
  ADD CONSTRAINT deposits_payment_method_check
  CHECK (payment_method IN ('easypaisa', 'jazzcash', 'bank'));
