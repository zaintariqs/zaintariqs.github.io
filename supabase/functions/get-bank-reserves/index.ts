import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { walletAddress } = await req.json()

    if (!walletAddress) {
      throw new Error('Wallet address is required')
    }

    // Verify admin status
    const { data: adminWallet, error: adminError } = await supabaseClient
      .from('admin_wallets')
      .select('*')
      .ilike('wallet_address', walletAddress)
      .eq('is_active', true)
      .single()

    if (adminError || !adminWallet) {
      console.error('Admin verification failed:', adminError)
      throw new Error('Unauthorized: Admin access required')
    }

    // Fetch bank reserves
    const { data: reserves, error: fetchError } = await supabaseClient
      .from('bank_reserves')
      .select('*')
      .order('reserve_type')

    if (fetchError) {
      console.error('Error fetching bank reserves:', fetchError)
      throw new Error('Failed to fetch bank reserves')
    }

    return new Response(
      JSON.stringify({
        success: true,
        reserves: reserves || []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in get-bank-reserves function:', error)
    return new Response(
      JSON.stringify({
        error: error.message || 'An unexpected error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
