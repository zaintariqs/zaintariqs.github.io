import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, responseHeaders } from '../_shared/cors.ts'

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
        { status: 400, headers: responseHeaders }
      )
    }

    // Validate Ethereum address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid Ethereum address format' }),
        { status: 400, headers: responseHeaders }
      )
    }

    console.log('Checking admin status for wallet:', walletAddress)

    // Use the security definer function to check admin status
    const { data, error } = await supabase.rpc('is_admin_wallet', {
      wallet_addr: walletAddress
    })

    if (error) {
      console.error('Error checking admin status:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin status' }),
        { status: 500, headers: responseHeaders }
      )
    }

    console.log('Admin check result:', data)

    return new Response(
      JSON.stringify({ isAdmin: data === true }),
      { headers: responseHeaders }
    )
  } catch (error) {
    console.error('Error in verify-admin function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: responseHeaders }
    )
  }
})
