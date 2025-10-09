import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { walletAddress, fingerprint } = await req.json()

    if (!walletAddress || !fingerprint) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get IP address from headers
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'unknown'
    
    const userAgent = req.headers.get('user-agent') || 'unknown'

    console.log('Logging login attempt for wallet:', walletAddress)

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
      console.error('Error logging login attempt:', insertError)
      return new Response(
        JSON.stringify({ error: 'Failed to log login attempt' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Login attempt logged successfully')

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
