-- Fix search path for security function
CREATE OR REPLACE FUNCTION public.log_redemption_access_attempt()
RETURNS TRIGGER AS $$
BEGIN
  -- Log to admin_actions table for security monitoring
  INSERT INTO public.admin_actions (action_type, wallet_address, details)
  VALUES (
    'unauthorized_redemption_access_attempt',
    'unknown',
    jsonb_build_object(
      'timestamp', now(),
      'operation', TG_OP,
      'table', TG_TABLE_NAME
    )
  );
  
  -- Deny the operation
  RAISE EXCEPTION 'Direct access to redemptions table is not allowed. Use the redemptions edge function.';
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;