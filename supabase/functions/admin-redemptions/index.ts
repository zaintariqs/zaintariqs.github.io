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
      console.warn('Non-admin attempted to access admin redemptions:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // GET: Fetch all redemptions (admin only)
    if (req.method === 'GET') {
      console.log(`Admin ${walletAddress} fetching all redemptions`)
      
      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching redemptions:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch redemptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'admin_viewed_all_redemptions',
        wallet_address: walletAddress.toLowerCase(),
        details: { timestamp: new Date().toISOString(), count: data?.length || 0 }
      })

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Update redemption status (admin only)
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { redemptionId, status, bankTransactionId, cancellationReason, burnTransactionHash } = body

      if (!redemptionId || !status) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const validStatuses = ['pending', 'waiting_for_burn', 'burn_confirmed', 'processing_transfer', 'completed', 'rejected', 'cancelled']
      if (!validStatuses.includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate required fields based on status
      if (status === 'completed' && !bankTransactionId) {
        return new Response(
          JSON.stringify({ error: 'Bank transaction ID required for completed redemptions' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (status === 'cancelled' && !cancellationReason) {
        return new Response(
          JSON.stringify({ error: 'Cancellation reason required when cancelling redemptions' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const updateData: any = { status }
      if (bankTransactionId) updateData.bank_transaction_id = bankTransactionId
      if (cancellationReason) updateData.cancellation_reason = cancellationReason
      if (burnTransactionHash) updateData.transaction_hash = burnTransactionHash

      console.log(`Admin ${walletAddress} updating redemption ${redemptionId} to status ${status}`)

      const { data, error } = await supabase
        .from('redemptions')
        .update(updateData)
        .eq('id', redemptionId)
        .select()
        .single()

      if (error) {
        console.error('Error updating redemption:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update redemption' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'admin_updated_redemption',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          redemptionId, 
          status, 
          bankTransactionId,
          cancellationReason,
          burnTransactionHash,
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