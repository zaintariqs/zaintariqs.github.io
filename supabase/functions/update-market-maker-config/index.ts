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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { walletAddress, updates } = await req.json()

    if (!walletAddress || typeof walletAddress !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!updates || typeof updates !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid updates' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin_wallet', {
      wallet_addr: walletAddress
    })

    if (adminError || !isAdmin) {
      console.error('Unauthorized update attempt:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get current config ID
    const { data: currentConfig } = await supabase
      .from('market_maker_config')
      .select('id')
      .single()

    if (!currentConfig) {
      return new Response(
        JSON.stringify({ error: 'Configuration not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Update config
    const { data: updatedConfig, error: updateError } = await supabase
      .from('market_maker_config')
      .update(updates)
      .eq('id', currentConfig.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating config:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update configuration' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log admin action
    await supabase.from('admin_actions').insert({
      wallet_address: walletAddress,
      action_type: 'UPDATE_MARKET_MAKER_CONFIG',
      details: updates
    })

    return new Response(
      JSON.stringify(updatedConfig),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in update-market-maker-config function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
