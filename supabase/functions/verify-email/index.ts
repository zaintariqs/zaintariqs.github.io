import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, responseHeaders } from '../_shared/cors.ts'

const MAX_ATTEMPTS = 5

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { walletAddress, verificationCode } = await req.json()

    if (!walletAddress || !verificationCode) {
      return new Response(
        JSON.stringify({ error: 'Wallet address and verification code are required' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Validate code format (6 digits)
    if (!/^\d{6}$/.test(verificationCode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid verification code format' }),
        { status: 400, headers: responseHeaders }
      )
    }

    console.log('Verifying email for wallet:', walletAddress)

    // Find the whitelist request
    const { data: request, error: fetchError } = await supabase
      .from('whitelist_requests')
      .select('*')
      .eq('wallet_address', walletAddress.toLowerCase())
      .single()

    if (fetchError || !request) {
      return new Response(
        JSON.stringify({ error: 'Whitelist request not found' }),
        { status: 404, headers: responseHeaders }
      )
    }

    // Check if already verified
    if (request.email_verified) {
      return new Response(
        JSON.stringify({ error: 'Email already verified' }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Check verification attempts
    if (request.verification_attempts >= MAX_ATTEMPTS) {
      return new Response(
        JSON.stringify({ 
          error: `Maximum verification attempts (${MAX_ATTEMPTS}) exceeded. Please request a new code.` 
        }),
        { status: 429, headers: responseHeaders }
      )
    }

    // Check if code expired (15 minutes)
    const expiresAt = new Date(request.verification_expires_at)
    if (expiresAt < new Date()) {
      return new Response(
        JSON.stringify({ error: 'Verification code expired. Please request a new one.' }),
        { status: 410, headers: responseHeaders }
      )
    }

    // Verify the code
    if (request.verification_code !== verificationCode) {
      // Increment failed attempts
      await supabase
        .from('whitelist_requests')
        .update({ 
          verification_attempts: request.verification_attempts + 1 
        })
        .eq('id', request.id)

      const attemptsLeft = MAX_ATTEMPTS - (request.verification_attempts + 1)
      return new Response(
        JSON.stringify({ 
          error: `Invalid verification code. ${attemptsLeft} attempt(s) remaining.` 
        }),
        { status: 400, headers: responseHeaders }
      )
    }

    // Success! Mark as verified
    const { error: updateError } = await supabase
      .from('whitelist_requests')
      .update({ 
        email_verified: true,
        verification_code: null,
        verification_expires_at: null
      })
      .eq('id', request.id)

    if (updateError) {
      console.error('Error updating verification status:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify email' }),
        { status: 500, headers: responseHeaders }
      )
    }

    console.log('Email verified successfully for wallet:', walletAddress)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email verified successfully! Your whitelist request is now pending admin approval.' 
      }),
      { headers: responseHeaders }
    )

  } catch (error) {
    console.error('Error in verify-email function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: responseHeaders }
    )
  }
})