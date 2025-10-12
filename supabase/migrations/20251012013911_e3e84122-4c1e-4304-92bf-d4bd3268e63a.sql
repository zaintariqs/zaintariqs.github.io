-- Create table to track burn operations and implement daily limits
CREATE TABLE IF NOT EXISTS public.burn_operations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  redemption_id UUID NOT NULL,
  burn_amount NUMERIC NOT NULL,
  burn_tx_hash TEXT NOT NULL,
  master_minter_address TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'completed',
  CONSTRAINT fk_redemption FOREIGN KEY (redemption_id) REFERENCES public.redemptions(id)
);

-- Enable RLS
ALTER TABLE public.burn_operations ENABLE ROW LEVEL SECURITY;

-- Only service role and admins can view burn operations
CREATE POLICY "Admins can view burn operations"
ON public.burn_operations
FOR SELECT
USING (has_admin_permission((auth.jwt() ->> 'wallet_address')::text, 'view_deposits'::admin_permission));

CREATE POLICY "Service role manages burn operations"
ON public.burn_operations
FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Create function to check daily burn limits (max 1M PKRSC per day)
CREATE OR REPLACE FUNCTION public.check_daily_burn_limit(burn_amount_pkrsc NUMERIC)
RETURNS TABLE(allowed BOOLEAN, current_daily_total NUMERIC, limit_remaining NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_daily_total NUMERIC;
  v_daily_limit NUMERIC := 1000000; -- 1 million PKRSC per day
BEGIN
  -- Get total burns in last 24 hours
  SELECT COALESCE(SUM(burn_amount), 0)
  INTO v_daily_total
  FROM public.burn_operations
  WHERE created_at >= now() - INTERVAL '24 hours'
    AND status = 'completed';
  
  -- Check if adding this burn would exceed the limit
  IF (v_daily_total + burn_amount_pkrsc) > v_daily_limit THEN
    RETURN QUERY SELECT 
      false,
      v_daily_total,
      v_daily_limit - v_daily_total;
  ELSE
    RETURN QUERY SELECT 
      true,
      v_daily_total,
      v_daily_limit - v_daily_total;
  END IF;
END;
$$;

-- Create function to detect anomalous burn patterns
CREATE OR REPLACE FUNCTION public.detect_burn_anomaly(burn_amount_pkrsc NUMERIC)
RETURNS TABLE(is_anomaly BOOLEAN, reason TEXT, severity TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_burn NUMERIC;
  v_max_burn NUMERIC;
  v_recent_count INTEGER;
BEGIN
  -- Get statistics from last 7 days
  SELECT 
    AVG(burn_amount),
    MAX(burn_amount),
    COUNT(*)
  INTO v_avg_burn, v_max_burn, v_recent_count
  FROM public.burn_operations
  WHERE created_at >= now() - INTERVAL '7 days'
    AND status = 'completed';
  
  -- If first burn, allow it but flag as suspicious if very large
  IF v_recent_count = 0 THEN
    IF burn_amount_pkrsc > 100000 THEN
      RETURN QUERY SELECT true, 'First burn is unusually large (>100k PKRSC)'::TEXT, 'high'::TEXT;
    ELSE
      RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT;
    END IF;
    RETURN;
  END IF;
  
  -- Check if burn is more than 5x the average
  IF burn_amount_pkrsc > (v_avg_burn * 5) THEN
    RETURN QUERY SELECT true, format('Burn amount (%.2f) is more than 5x average (%.2f)', burn_amount_pkrsc, v_avg_burn), 'high'::TEXT;
    RETURN;
  END IF;
  
  -- Check if burn is more than 2x the historical maximum
  IF burn_amount_pkrsc > (v_max_burn * 2) THEN
    RETURN QUERY SELECT true, format('Burn amount (%.2f) is more than 2x historical max (%.2f)', burn_amount_pkrsc, v_max_burn), 'critical'::TEXT;
    RETURN;
  END IF;
  
  -- No anomaly detected
  RETURN QUERY SELECT false, NULL::TEXT, NULL::TEXT;
END;
$$;

-- Create index for performance
CREATE INDEX idx_burn_operations_created_at ON public.burn_operations(created_at DESC);
CREATE INDEX idx_burn_operations_status ON public.burn_operations(status);

COMMENT ON TABLE public.burn_operations IS 'Tracks all PKRSC token burn operations for security monitoring and audit trail';
COMMENT ON FUNCTION public.check_daily_burn_limit IS 'Enforces a 1M PKRSC daily burn limit to prevent excessive burns from compromised keys';
COMMENT ON FUNCTION public.detect_burn_anomaly IS 'Detects anomalous burn patterns that may indicate compromised master minter key';