import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { walletAddress, limit = 50 } = await req.json()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // Verify admin with market maker permission using RPC
    const { data: hasMarketMakerPermission, error: permError } = await supabase
      .rpc('has_admin_permission', {
        _wallet_address: walletAddress,
        _permission: 'manage_market_maker'
      })

    if (permError) {
      console.error('Error checking permissions:', permError)
      return new Response(
        JSON.stringify({ error: 'Permission check failed' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    if (!hasMarketMakerPermission) {
      console.log('Unauthorized or insufficient permissions:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized or insufficient permissions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    console.log('Fetching transactions for admin:', walletAddress)

    // Fetch transactions
    const { data: transactions, error } = await supabase
      .from('market_maker_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching transactions:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transactions' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    return new Response(
      JSON.stringify(transactions),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
