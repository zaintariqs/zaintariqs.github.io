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

// Simple rate limiting (in-memory)
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60000 // 1 minute
const MAX_ATTEMPTS_PER_WINDOW = 5

function checkRateLimit(identifier: string): boolean {
  const now = Date.now()
  const attempts = rateLimitMap.get(identifier) || []
  
  // Remove old attempts outside the window
  const recentAttempts = attempts.filter(time => now - time < RATE_LIMIT_WINDOW_MS)
  
  if (recentAttempts.length >= MAX_ATTEMPTS_PER_WINDOW) {
    return false
  }
  
  recentAttempts.push(now)
  rateLimitMap.set(identifier, recentAttempts)
  
  // Cleanup old entries
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS * 2
    for (const [key, times] of rateLimitMap.entries()) {
      if (times.every(t => t < cutoff)) {
        rateLimitMap.delete(key)
      }
    }
  }
  
  return true
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

    // Rate limiting by IP and wallet
    const ipAddress = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    const rateLimitKey = `${walletAddress.toLowerCase()}-${ipAddress}`
    if (!checkRateLimit(rateLimitKey)) {
      console.warn('[log-login-attempt] Rate limit exceeded for:', rateLimitKey)
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in 1 minute.' }),
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
