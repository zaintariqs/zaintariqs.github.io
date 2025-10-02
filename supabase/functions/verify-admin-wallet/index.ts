import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

// Validate Ethereum address format
function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get wallet address from header
    const walletAddress = req.headers.get('x-wallet-address')
    
    if (!walletAddress) {
      console.warn('[verify-admin-wallet] Missing wallet address header')
      return new Response(
        JSON.stringify({ isAdmin: false, error: 'Wallet address required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    if (!isValidEthAddress(walletAddress)) {
      console.warn('[verify-admin-wallet] Invalid wallet address format:', walletAddress)
      return new Response(
        JSON.stringify({ isAdmin: false, error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Call the is_admin_wallet database function
    const { data, error } = await supabase
      .rpc('is_admin_wallet', { wallet_addr: walletAddress })
    
    if (error) {
      console.error('[verify-admin-wallet] Database error:', error)
      return new Response(
        JSON.stringify({ isAdmin: false, error: 'Failed to verify admin status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('[verify-admin-wallet] Verification result for', walletAddress, ':', data)
    
    // Log admin access attempt for audit
    await supabase.from('admin_actions').insert({
      action_type: 'admin_verification_check',
      wallet_address: walletAddress.toLowerCase(),
      details: { 
        timestamp: new Date().toISOString(),
        isAdmin: data,
        userAgent: req.headers.get('user-agent')
      }
    })
    
    return new Response(
      JSON.stringify({ isAdmin: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('[verify-admin-wallet] Unexpected error:', error)
    return new Response(
      JSON.stringify({ isAdmin: false, error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
