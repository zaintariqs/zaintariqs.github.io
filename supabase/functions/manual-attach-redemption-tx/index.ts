import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AttachRequest {
  redemption_id: string
  transaction_hash: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { redemption_id, transaction_hash }: AttachRequest = await req.json()

    console.log(`Manually attaching transaction ${transaction_hash} to redemption ${redemption_id}`)

    // Check if hash already used
    const { data: existingHash } = await supabase
      .from('used_transaction_hashes')
      .select('*')
      .eq('transaction_hash', transaction_hash.toLowerCase())
      .single()

    if (existingHash) {
      throw new Error(`Transaction hash ${transaction_hash} already used`)
    }

    // Get redemption details
    const { data: redemption, error: redemptionError } = await supabase
      .from('redemptions')
      .select('*')
      .eq('id', redemption_id)
      .single()

    if (redemptionError || !redemption) {
      throw new Error(`Redemption ${redemption_id} not found`)
    }

    // Verify transaction on blockchain
    const BASE_RPC_URL = 'https://mainnet.base.org'
    const receiptResponse = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getTransactionReceipt',
        params: [transaction_hash]
      })
    })

    const receiptData = await receiptResponse.json()
    
    if (!receiptData.result) {
      throw new Error(`Transaction ${transaction_hash} not found on blockchain`)
    }

    const receipt = receiptData.result
    console.log(`Transaction confirmed on blockchain - Block: ${parseInt(receipt.blockNumber, 16)}`)

    // Get master minter address
    const { data: masterMinterData } = await supabase
      .from('master_minter_config')
      .select('master_minter_address')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    const masterMinterAddress = masterMinterData?.master_minter_address?.toLowerCase()

    // Verify transaction logs contain Transfer event to master minter
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    const transferLog = receipt.logs?.find((log: any) => 
      log.topics[0] === transferEventSignature &&
      log.topics[2]?.toLowerCase().includes(masterMinterAddress?.slice(2))
    )

    if (!transferLog) {
      throw new Error(`Transaction is not a transfer to master minter address`)
    }

    // Decode amount from log
    const amount = parseInt(transferLog.data, 16) / Math.pow(10, 6) // 6 decimals

    console.log(`Verified transfer: ${amount} PKRSC to master minter`)
    console.log(`Expected: ${redemption.pkrsc_amount} PKRSC`)

    // Check amount matches (within tolerance)
    const amountMatch = Math.abs(amount - parseFloat(redemption.pkrsc_amount)) / parseFloat(redemption.pkrsc_amount) < 0.001
    
    if (!amountMatch) {
      throw new Error(`Amount mismatch: got ${amount}, expected ${redemption.pkrsc_amount}`)
    }

    // Update redemption
    const { error: updateError } = await supabase
      .from('redemptions')
      .update({ 
        transaction_hash: transaction_hash,
        status: 'pending_burn',
        updated_at: new Date().toISOString()
      })
      .eq('id', redemption_id)

    if (updateError) {
      throw updateError
    }

    // Mark hash as used
    await supabase
      .from('used_transaction_hashes')
      .insert({
        transaction_hash: transaction_hash.toLowerCase(),
        transaction_type: 'redemption',
        used_by: redemption.user_id
      })

    // Log admin action
    await supabase
      .from('admin_actions')
      .insert({
        action_type: 'manual_attach_redemption_tx',
        wallet_address: 'manual',
        details: {
          redemption_id,
          transaction_hash,
          amount,
          user: redemption.user_id,
          verified_on_chain: true
        }
      })

    console.log(`✅ Successfully attached transaction to redemption`)

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Transaction attached successfully',
        redemption_id,
        transaction_hash,
        amount,
        status: 'pending_burn'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in manual-attach-redemption-tx:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.toString()
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
