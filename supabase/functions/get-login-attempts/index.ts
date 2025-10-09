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

    const { walletAddress, limit = 100 } = await req.json()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing walletAddress' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[get-login-attempts] Verifying admin for wallet: ${walletAddress}`)

    // Verify admin wallet (case-insensitive)
    const { data: adminRows, error: adminError } = await supabase
      .from('admin_wallets')
      .select('id')
      .ilike('wallet_address', walletAddress)
      .eq('is_active', true)
      .limit(1)

    if (adminError) {
      console.error('[get-login-attempts] Error checking admin:', adminError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!adminRows || adminRows.length === 0) {
      console.warn('[get-login-attempts] Unauthorized access attempt by', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch login attempts
    const { data: attempts, error: attemptsError } = await supabase
      .from('login_attempts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(Math.min(Number(limit) || 100, 500))

    if (attemptsError) {
      console.error('[get-login-attempts] Error fetching attempts:', attemptsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch login attempts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[get-login-attempts] Returning ${attempts?.length || 0} attempts`)

    return new Response(
      JSON.stringify({ attempts: attempts || [] }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[get-login-attempts] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})