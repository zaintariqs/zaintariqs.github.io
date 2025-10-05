import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-wallet-signature, x-signature-message',
  'Access-Control-Allow-Methods': 'POST,GET,PATCH,OPTIONS',
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

    // GET: Fetch user's deposits
    if (req.method === 'GET') {
      console.log(`Fetching deposits for wallet: ${walletAddress}`)
      
      const { data, error } = await supabase
        .from('deposits')
        .select('*')
        .eq('user_id', walletAddress.toLowerCase())
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching deposits:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to fetch deposits' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // POST: Create new deposit
    if (req.method === 'POST') {
      const body = await req.json()
      const { amount, paymentMethod, phoneNumber } = body

      if (!amount || !paymentMethod || !phoneNumber) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Creating deposit for wallet: ${walletAddress}, amount: ${amount}, method: ${paymentMethod}`)

      const { data, error } = await supabase
        .from('deposits')
        .insert({
          user_id: walletAddress.toLowerCase(),
          amount_pkr: amount,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
          status: 'pending'
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to create deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // PATCH: Submit transaction proof (user submits TXID and receipt)
    if (req.method === 'PATCH') {
      const body = await req.json()
      const { depositId, transactionId, receiptUrl } = body

      if (!depositId || !transactionId || !receiptUrl) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      console.log(`Submitting proof for deposit: ${depositId}`)

      // Verify deposit belongs to user
      const { data: deposit, error: fetchError } = await supabase
        .from('deposits')
        .select('*')
        .eq('id', depositId)
        .eq('user_id', walletAddress.toLowerCase())
        .single()

      if (fetchError || !deposit) {
        return new Response(
          JSON.stringify({ error: 'Deposit not found or unauthorized' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update deposit with transaction proof
      const { data, error } = await supabase
        .from('deposits')
        .update({
          user_transaction_id: transactionId,
          receipt_url: receiptUrl,
          submitted_at: new Date().toISOString(),
          status: 'processing'
        })
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error updating deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to submit proof' }),
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
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})