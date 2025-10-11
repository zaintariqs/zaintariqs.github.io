import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.7.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { walletAddress } = await req.json()

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_wallet', {
      wallet_addr: walletAddress
    })

    if (adminError || !isAdmin) {
      console.error('Unauthorized access attempt:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch config
    const { data: config, error: configError } = await supabase
      .from('market_maker_config')
      .select('*')
      .single()

    if (configError) {
      console.error('Error fetching config:', configError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Derive wallet address from private key
    let botWalletAddress = null
    try {
      const privateKey = Deno.env.get('MARKET_MAKER_PRIVATE_KEY')
      if (privateKey) {
        const wallet = new ethers.Wallet(privateKey)
        botWalletAddress = wallet.address
      }
    } catch (error) {
      console.error('Error deriving wallet address:', error)
    }

    return new Response(
      JSON.stringify({
        ...config,
        bot_wallet_address: botWalletAddress
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in get-market-maker-config function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
