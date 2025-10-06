import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    const body = await req.json().catch(() => ({}))
    const walletAddress: string | undefined = body.walletAddress

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'walletAddress is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('list-blacklisted: verifying admin for', walletAddress)

    // Verify requester is an active admin wallet
    const { data: isAdminData, error: adminErr } = await supabase
      .from('admin_wallets')
      .select('id')
      .eq('is_active', true)
      .ilike('wallet_address', walletAddress)
      .maybeSingle()

    if (adminErr) {
      console.error('Error verifying admin:', adminErr)
      return new Response(
        JSON.stringify({ error: 'Failed to verify admin' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isAdminData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch active blacklisted addresses
    const { data: addresses, error } = await supabase
      .from('blacklisted_addresses')
      .select('id, wallet_address, reason, blacklisted_at, blacklisted_by, is_active')
      .eq('is_active', true)
      .order('blacklisted_at', { ascending: false })

    if (error) {
      console.error('Error fetching blacklisted addresses:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch blacklisted addresses' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ addresses }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: any) {
    console.error('Unexpected error in list-blacklisted:', err)
    return new Response(
      JSON.stringify({ error: err?.message || 'Unexpected error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})