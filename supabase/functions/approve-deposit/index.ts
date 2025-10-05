import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
}

// PKRSC token details on Base
const PKRSC_TOKEN_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'
const PKRSC_DECIMALS = 6

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

    // Verify admin status with enhanced logging
    const { data: isAdmin, error: adminError } = await supabase
      .rpc('is_admin_wallet', { wallet_addr: walletAddress })
    
    // Log admin authentication attempt
    await supabase.from('admin_actions').insert({
      action_type: isAdmin ? 'admin_auth_success' : 'admin_auth_failed',
      wallet_address: walletAddress.toLowerCase(),
      details: { 
        timestamp: new Date().toISOString(),
        endpoint: 'approve-deposit',
        success: !!isAdmin
      }
    })
    
    if (adminError || !isAdmin) {
      console.error('Admin verification failed for wallet:', walletAddress, adminError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const body = await req.json()
    const { depositId, action, mintTxHash, rejectionReason } = body

    if (!depositId || !action) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get deposit details
    const { data: deposit, error: fetchError } = await supabase
      .from('deposits')
      .select('*')
      .eq('id', depositId)
      .single()

    if (fetchError || !deposit) {
      return new Response(
        JSON.stringify({ error: 'Deposit not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'approve') {
      if (!mintTxHash) {
        return new Response(
          JSON.stringify({ error: 'Mint transaction hash required for approval' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Verify the mint transaction on-chain
      try {
        const { ethers } = await import('https://esm.sh/ethers@6.9.0')
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
        const receipt = await provider.getTransactionReceipt(mintTxHash)

        if (!receipt) {
          return new Response(
            JSON.stringify({ error: 'Transaction not found. Please wait a moment and try again.' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (receipt.status !== 1) {
          return new Response(
            JSON.stringify({ error: 'Mint transaction failed on-chain' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Verify it's a transfer to the user's wallet
        const TRANSFER_TOPIC = ethers.id('Transfer(address,address,uint256)')
        const targetLog = receipt.logs.find((log: any) => {
          if (log.address?.toLowerCase() !== PKRSC_TOKEN_ADDRESS.toLowerCase()) return false
          if (!log.topics || log.topics.length < 3) return false
          if (log.topics[0] !== TRANSFER_TOPIC) return false
          const toTopic = log.topics[2].toLowerCase()
          const toAddr = '0x' + toTopic.slice(-40)
          return toAddr.toLowerCase() === deposit.user_id.toLowerCase()
        })

        if (!targetLog) {
          return new Response(
            JSON.stringify({ error: 'Transaction does not mint to user wallet' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Parse minted amount
        const value = ethers.toBigInt(targetLog.data)
        const mintedAmount = Number(value) / 10 ** PKRSC_DECIMALS

        console.log(`Verified mint: ${mintedAmount} PKRSC to ${deposit.user_id}`)
      } catch (error) {
        console.error('Error verifying mint transaction:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to verify mint transaction on-chain' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update deposit as completed
      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: 'completed',
          transaction_id: mintTxHash,
          mint_transaction_hash: mintTxHash,
          reviewed_by: walletAddress.toLowerCase(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error approving deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to approve deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Update PKR bank reserves
      const { error: reserveError } = await supabase.rpc('update_pkr_reserves', {
        amount_change: deposit.amount_pkr,
        updated_by_wallet: walletAddress.toLowerCase()
      })

      if (reserveError) {
        console.error('Error updating PKR reserves:', reserveError)
        // Log but don't fail the approval
      } else {
        console.log(`Updated PKR reserves: +${deposit.amount_pkr}`)
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'deposit_approved',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          depositId,
          userId: deposit.user_id,
          amount: deposit.amount_pkr,
          mintTxHash,
          reserveUpdated: !reserveError,
          timestamp: new Date().toISOString()
        }
      })

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (action === 'reject') {
      if (!rejectionReason) {
        return new Response(
          JSON.stringify({ error: 'Rejection reason required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      const { data, error } = await supabase
        .from('deposits')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          reviewed_by: walletAddress.toLowerCase(),
          reviewed_at: new Date().toISOString()
        })
        .eq('id', depositId)
        .select()
        .single()

      if (error) {
        console.error('Error rejecting deposit:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to reject deposit' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Log admin action
      await supabase.from('admin_actions').insert({
        action_type: 'deposit_rejected',
        wallet_address: walletAddress.toLowerCase(),
        details: { 
          depositId,
          userId: deposit.user_id,
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
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})