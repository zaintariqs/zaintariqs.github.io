import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

// Verify wallet signature to prevent fake login attempts
async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string
): Promise<boolean> {
  try {
    const { ethers } = await import('https://esm.sh/ethers@6.9.0')
    const recoveredAddress = ethers.verifyMessage(message, signature)
    return recoveredAddress.toLowerCase() === walletAddress.toLowerCase()
  } catch (error) {
    console.error('Signature verification failed:', error)
    return false
  }
}

// Database-backed rate limiting using admin_rate_limits table
async function checkRateLimit(
  supabase: any,
  identifier: string,
  operationType: string = 'login_attempt',
  maxOperations: number = 5,
  windowMinutes: number = 1
): Promise<{ allowed: boolean; retryAfter?: number }> {
  try {
    const { data, error } = await supabase.rpc('check_and_update_rate_limit', {
      p_wallet_address: identifier.toLowerCase(),
      p_operation_type: operationType,
      p_max_operations: maxOperations,
      p_window_minutes: windowMinutes
    }).single()

    if (error) {
      console.error('Rate limit check error:', error)
      return { allowed: true } // Fail open on error
    }

    return {
      allowed: data.allowed,
      retryAfter: data.retry_after_seconds || undefined
    }
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return { allowed: true } // Fail open on error
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { walletAddress, fingerprint, signature, message } = await req.json()

    if (!walletAddress || !fingerprint || !signature || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify wallet signature
    const isValidSignature = await verifyWalletSignature(walletAddress, signature, message)
    if (!isValidSignature) {
      console.warn('[log-login-attempt] Invalid signature for wallet:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Invalid wallet signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Rate limiting by IP and wallet (database-backed)
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    const rateLimitKey = `${walletAddress.toLowerCase()}-${ipAddress}`
    const rateLimitResult = await checkRateLimit(supabase, rateLimitKey, 'login_attempt', 5, 1)
    if (!rateLimitResult.allowed) {
      console.warn('[log-login-attempt] Rate limit exceeded for:', rateLimitKey)
      return new Response(
        JSON.stringify({ 
          error: `Too many requests. Please try again in ${rateLimitResult.retryAfter || 60} seconds.` 
        }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log('[log-login-attempt] Verified login attempt for wallet:', walletAddress.slice(0, 8) + '...')

    // Insert login attempt
    const { error: insertError } = await supabase
      .from('login_attempts')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        fingerprint,
        ip_address: ipAddress,
        user_agent: userAgent
      })

    if (insertError) {
      console.error('[log-login-attempt] Database error:', insertError.message)
      return new Response(
        JSON.stringify({ error: 'Failed to log login attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in log-login-attempt function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
