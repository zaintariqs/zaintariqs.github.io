import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const walletAddress = req.headers.get('x-wallet-address')
    
    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin has view_transaction_fees permission
    const { data: adminRoles, error: roleError } = await supabase
      .from('admin_roles')
      .select('permission')
      .ilike('wallet_address', walletAddress)

    if (roleError) {
      console.error('Error checking admin roles:', roleError)
      return new Response(
        JSON.stringify({ error: 'Failed to verify permissions' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const hasPermission = adminRoles?.some(role => role.permission === 'view_transaction_fees')
    
    if (!hasPermission) {
      console.warn('Admin lacks view_transaction_fees permission:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: view_transaction_fees permission required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Admin ${walletAddress} fetching transaction fees`)

    // Fetch transaction fees (last 50)
    const { data: fees, error: feesError } = await supabase
      .from('transaction_fees')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (feesError) {
      console.error('Error fetching transaction fees:', feesError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch transaction fees' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Calculate stats
    const totalFees = fees?.reduce((sum, fee) => sum + Number(fee.fee_amount), 0) || 0
    const depositFees = fees
      ?.filter((fee) => fee.transaction_type === 'deposit')
      .reduce((sum, fee) => sum + Number(fee.fee_amount), 0) || 0
    const redemptionFees = fees
      ?.filter((fee) => fee.transaction_type === 'redemption')
      .reduce((sum, fee) => sum + Number(fee.fee_amount), 0) || 0

    // Log admin action
    await supabase.from('admin_actions').insert({
      action_type: 'admin_viewed_transaction_fees',
      wallet_address: walletAddress.toLowerCase(),
      details: { 
        timestamp: new Date().toISOString(),
        count: fees?.length || 0
      }
    })

    return new Response(
      JSON.stringify({
        fees: fees || [],
        stats: {
          totalFees,
          depositFees,
          redemptionFees,
          transactionCount: fees?.length || 0
        }
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
