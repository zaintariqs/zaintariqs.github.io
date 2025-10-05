-- Drop the overly restrictive blocking policy on deposits table
DROP POLICY IF EXISTS "Block all direct client access to deposits" ON public.deposits;

-- Create proper user-scoped RLS policies for defense-in-depth

-- Policy 1: Users can view their own deposits
-- This provides security even if the edge function is bypassed
CREATE POLICY "Users can view own deposits"
ON public.deposits
FOR SELECT
TO authenticated, anon
USING (
  LOWER(user_id) = LOWER((auth.jwt() ->> 'wallet_address')::text)
);

-- Policy 2: Admins can view all deposits
CREATE POLICY "Admins can view all deposits"
ON public.deposits
FOR SELECT
TO authenticated, anon
USING (
  EXISTS (
    SELECT 1
    FROM public.admin_wallets
    WHERE LOWER(wallet_address) = LOWER((auth.jwt() ->> 'wallet_address')::text)
      AND is_active = true
  )
);

-- Policy 3: Block direct INSERT - must use deposits edge function
-- Edge function validates wallet signatures before allowing inserts
CREATE POLICY "Block direct insert to deposits"
ON public.deposits
FOR INSERT
TO authenticated, anon
WITH CHECK (false);

-- Policy 4: Block direct UPDATE - must use edge function
CREATE POLICY "Block direct update to deposits"
ON public.deposits
FOR UPDATE
TO authenticated, anon
USING (false);

-- Policy 5: Block direct DELETE - deposits should never be deleted
CREATE POLICY "Block direct delete from deposits"
ON public.deposits
FOR DELETE
TO authenticated, anon
USING (false);

-- Policy 6: Service role can perform all operations (for edge functions)
CREATE POLICY "Service role full access to deposits"
ON public.deposits
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Update the access attempt logging function to be more informative
CREATE OR REPLACE FUNCTION public.log_deposits_access_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Log unauthorized write attempts (reads are now allowed via RLS)
  IF TG_OP IN ('INSERT', 'UPDATE', 'DELETE') THEN
    INSERT INTO public.admin_actions (action_type, wallet_address, details)
    VALUES (
      'unauthorized_deposits_write_attempt',
      COALESCE((auth.jwt() ->> 'wallet_address')::text, 'unknown'),
      jsonb_build_object(
        'timestamp', now(),
        'operation', TG_OP,
        'table', TG_TABLE_NAME,
        'user_id', COALESCE(NEW.user_id, OLD.user_id)
      )
    );
    
    -- Deny the write operation
    RAISE EXCEPTION 'Direct write access to deposits table is not allowed. Use the deposits edge function.';
  END IF;
  
  RETURN NEW;
END;
$function$;