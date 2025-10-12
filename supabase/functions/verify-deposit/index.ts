import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { depositId, verificationCode } = await req.json();

    if (!depositId || !verificationCode) {
      return new Response(
        JSON.stringify({ error: 'Deposit ID and verification code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying deposit: ${depositId}`);

    // Get deposit with verification details
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single();

    if (fetchError || !deposit) {
      return new Response(
        JSON.stringify({ error: 'Deposit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (deposit.email_verified) {
      return new Response(
        JSON.stringify({ error: 'Deposit already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(deposit.verification_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Verification code expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max attempts
    if (deposit.verification_attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempts
    await supabase
      .from('deposits')
      .update({ verification_attempts: deposit.verification_attempts + 1 })
      .eq('id', depositId);

    // Verify code (support both legacy plain and new hashed storage)
    // Hash input code using DB RPC first, then WebCrypto fallback
    let hashedInput: string | null = null;
    try {
      const { data: rpcHash, error: rpcErr } = await supabase.rpc('hash_verification_code', { code: verificationCode });
      if (!rpcErr && rpcHash) {
        hashedInput = rpcHash;
      }
    } catch (e) {
      console.warn('RPC hash failed, falling back to WebCrypto:', e);
    }
    if (!hashedInput) {
      try {
        const data = new TextEncoder().encode(verificationCode);
        const hash = await crypto.subtle.digest('SHA-256', data);
        const bytes = Array.from(new Uint8Array(hash));
        hashedInput = bytes.map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        console.error('Error hashing verification code with WebCrypto:', e);
        // proceed without hashedInput; plain comparison will be attempted below
      }
    }

    const isMatch = deposit.verification_code === verificationCode || deposit.verification_code === hashedInput
    if (!isMatch) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified and update status
    const { error: updateError } = await supabase
      .from('deposits')
      .update({
        email_verified: true,
        status: 'pending'
      })
      .eq('id', depositId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Deposit verified successfully: ${depositId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Deposit verified successfully. Your request is now pending admin approval.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error verifying deposit:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});