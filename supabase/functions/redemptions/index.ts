import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
}

interface RedemptionRequest {
  walletAddress: string
  pkrscAmount: number
  bankName: string
  accountNumber: string
  accountTitle: string
}

// Validate Ethereum address format
function isValidEthAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Sanitize input to prevent SQL injection and XSS
function sanitizeString(input: string): string {
  return input.trim().substring(0, 255) // Limit length
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

    // Verify wallet address from header
    const walletAddressHeader = req.headers.get('x-wallet-address')
    
    if (req.method === 'POST') {
      const body: RedemptionRequest = await req.json()
      
      // Validate wallet address
      if (!body.walletAddress || !isValidEthAddress(body.walletAddress)) {
        return new Response(
          JSON.stringify({ error: 'Invalid wallet address' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify header matches body (prevent address spoofing)
      if (walletAddressHeader?.toLowerCase() !== body.walletAddress.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'Wallet address mismatch' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate amount
      if (!body.pkrscAmount || body.pkrscAmount < 100) {
        return new Response(
          JSON.stringify({ error: 'Minimum redemption is 100 PKRSC' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate and sanitize bank details
      if (!body.bankName || !body.accountNumber || !body.accountTitle) {
        return new Response(
          JSON.stringify({ error: 'All bank details are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Insert redemption with service role
      const { data, error } = await supabase
        .from('redemptions')
        .insert({
          user_id: body.walletAddress.toLowerCase(),
          pkrsc_amount: body.pkrscAmount,
          bank_name: sanitizeString(body.bankName),
          account_number: sanitizeString(body.accountNumber),
          account_title: sanitizeString(body.accountTitle),
          burn_address: '0x000000000000000000000000000000000000dEaD',
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating redemption:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create redemption request' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'GET') {
      // Get redemptions for a specific wallet
      if (!walletAddressHeader || !isValidEthAddress(walletAddressHeader)) {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing wallet address' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('redemptions')
        .select('*')
        .eq('user_id', walletAddressHeader.toLowerCase())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching redemptions:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch redemptions' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (req.method === 'PATCH') {
      // Update redemption status (for transaction hash)
      const body = await req.json()
      const { redemptionId, transactionHash, status } = body

      if (!walletAddressHeader || !isValidEthAddress(walletAddressHeader)) {
        return new Response(
          JSON.stringify({ error: 'Invalid or missing wallet address' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify ownership before update
      const { data: existing, error: fetchError } = await supabase
        .from('redemptions')
        .select('user_id')
        .eq('id', redemptionId)
        .single()

      if (fetchError || !existing) {
        return new Response(
          JSON.stringify({ error: 'Redemption not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (existing.user_id.toLowerCase() !== walletAddressHeader.toLowerCase()) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update the redemption
      const { data, error } = await supabase
        .from('redemptions')
        .update({
          transaction_hash: transactionHash,
          status: status
        })
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
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
