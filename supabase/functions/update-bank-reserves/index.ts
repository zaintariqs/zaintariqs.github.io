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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    const walletAddress = user.user_metadata?.wallet_address
    if (!walletAddress) {
      throw new Error('Wallet address not found')
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

    const { mode, amount } = await req.json()

    if (!mode || !amount || isNaN(Number(amount))) {
      throw new Error('Invalid input: mode and valid amount are required')
    }

    const numericAmount = Number(amount)

    if (mode === 'set') {
      // Set the reserve to a specific amount
      const { error: updateError } = await supabaseClient
        .from('bank_reserves')
        .update({
          amount: numericAmount,
          last_updated: new Date().toISOString(),
          updated_by: walletAddress
        })
        .eq('reserve_type', 'pkr')

      if (updateError) {
        console.error('Error setting reserves:', updateError)
        throw new Error('Failed to set bank reserves')
      }

      console.log(`Bank reserves set to ${numericAmount} by ${walletAddress}`)
    } else if (mode === 'adjust') {
      // Adjust the reserve by a delta amount
      const { error: adjustError } = await supabaseClient.rpc('update_pkr_reserves', {
        amount_change: numericAmount,
        updated_by_wallet: walletAddress
      })

      if (adjustError) {
        console.error('Error adjusting reserves:', adjustError)
        throw new Error('Failed to adjust bank reserves')
      }

      console.log(`Bank reserves adjusted by ${numericAmount} by ${walletAddress}`)
    } else {
      throw new Error('Invalid mode: must be "set" or "adjust"')
    }

    // Fetch updated reserves
    const { data: updatedReserves, error: fetchError } = await supabaseClient
      .from('bank_reserves')
      .select('*')
      .eq('reserve_type', 'pkr')
      .single()

    if (fetchError) {
      console.error('Error fetching updated reserves:', fetchError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Bank reserves ${mode === 'set' ? 'set to' : 'adjusted by'} ${numericAmount}`,
        reserves: updatedReserves
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in update-bank-reserves function:', error)
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
