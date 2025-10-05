import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'GET,PATCH,OPTIONS',
}

serve(async (req) => {
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

    // Verify admin status
    const { data: adminData } = await supabase
      .from('admin_wallets')
      .select('is_active')
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_active', true)
      .single()

    if (!adminData) {
      console.warn('Non-admin attempted to access admin deposits:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET: Fetch all deposits (admin only)
    if (req.method === 'GET') {
      console.log(`Admin ${walletAddress} fetching all deposits`)
      
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deposits:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch deposits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'admin_viewed_all_deposits',
        wallet_address: walletAddress.toLowerCase(),
        details: { timestamp: new Date().toISOString(), count: data?.length || 0 }
      })

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Update deposit status (admin only)
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { depositId, status, transactionId, rejectionReason } = body

      if (!depositId || !status) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validStatuses = ['pending', 'processing', 'completed', 'rejected', 'cancelled']
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: any = { status }
      if (transactionId) updateData.transaction_id = transactionId
      if (rejectionReason) updateData.rejection_reason = rejectionReason

      console.log(`Admin ${walletAddress} updating deposit ${depositId} to status ${status}`)

      const { data, error } = await supabase
        .from('deposits')
        .update(updateData)
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error updating deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'admin_updated_deposit',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          depositId, 
          status, 
          transactionId,
          rejectionReason,
          timestamp: new Date().toISOString() 
        }
      })

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})