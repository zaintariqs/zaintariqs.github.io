import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const body = await req.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Checking blacklist status for:', walletAddress)

    // Check if wallet is blacklisted and active
    const { data: blacklistEntry, error } = await supabase
      .from('blacklisted_addresses')
      .select('reason, blacklisted_at')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_active', true)
      .maybeSingle()

    if (error) {
      console.error('Error checking blacklist:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to check blacklist status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const isBlacklisted = !!blacklistEntry

    return new Response(
      JSON.stringify({ 
        isBlacklisted,
        reason: blacklistEntry?.reason || null,
        blacklistedAt: blacklistEntry?.blacklisted_at || null
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
