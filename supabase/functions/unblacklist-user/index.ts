import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const adminWallet = req.headers.get('x-wallet-address')
    
    if (!adminWallet) {
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin_wallet', { wallet_addr: adminWallet })
    
    if (adminError || !isAdmin) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { walletAddress } = body

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Remove from blacklist by setting is_active to false
    const { error: unblacklistError } = await supabase
      .from('blacklisted_addresses')
      .update({ is_active: false })
      .eq('wallet_address', walletAddress.toLowerCase())
      .eq('is_active', true)

    if (unblacklistError) {
      console.error('Error unblacklisting user:', unblacklistError)
      return new Response(
        JSON.stringify({ error: 'Failed to unblacklist user' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update whitelist_requests status back to "approved"
    await supabase
      .from('whitelist_requests')
      .update({ 
        status: 'approved',
        rejection_reason: null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: adminWallet.toLowerCase()
      })
      .ilike('wallet_address', walletAddress)

    // Log admin action
    await supabase.from('admin_actions').insert({
      action_type: 'user_unblacklisted',
      wallet_address: adminWallet.toLowerCase(),
      details: { 
        unblacklistedAddress: walletAddress.toLowerCase(),
        timestamp: new Date().toISOString()
      }
    })

    return new Response(
      JSON.stringify({ success: true }),
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
