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

    const { redemptionId, verificationCode } = await req.json();

    if (!redemptionId || !verificationCode) {
      return new Response(
        JSON.stringify({ error: 'Redemption ID and verification code are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Verifying redemption: ${redemptionId}`);

    // Get redemption with verification details
    const { data: redemption, error: fetchError } = await supabase
      .from('redemptions')
      .select('*')
      .eq('id', redemptionId)
      .single();

    if (fetchError || !redemption) {
      return new Response(
        JSON.stringify({ error: 'Redemption not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (redemption.email_verified) {
      return new Response(
        JSON.stringify({ error: 'Redemption already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check expiration
    if (new Date(redemption.verification_expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Verification code expired. Please request a new one.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check max attempts
    if (redemption.verification_attempts >= 5) {
      return new Response(
        JSON.stringify({ error: 'Maximum verification attempts exceeded. Please request a new code.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment attempts
    await supabase
      .from('redemptions')
      .update({ verification_attempts: redemption.verification_attempts + 1 })
      .eq('id', redemptionId);

    // Verify code
    if (redemption.verification_code !== verificationCode) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as verified and keep pending status
    const { error: updateError } = await supabase
      .from('redemptions')
      .update({
        email_verified: true,
        status: 'pending'
      })
      .eq('id', redemptionId);

    if (updateError) {
      throw updateError;
    }

    console.log(`Redemption verified successfully: ${redemptionId}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Redemption verified successfully. Your request is being processed.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error verifying redemption:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
