import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PKRSC_TOKEN_ADDRESS = '0x43CCbDAC0726E0dFd00c6F454A6253441F25D521'
const PKRSC_DECIMALS = 6

interface BaseScanTransaction {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  tokenDecimal: string
  tokenSymbol: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const basescanApiKey = Deno.env.get('BASESCAN_API_KEY')!

    const supabase = createClient(supabaseUrl, supabaseKey)

    console.log('Starting automatic redemption transfer detection...')

    // Get master minter address
    const { data: masterMinterData } = await supabase
      .from('master_minter_config')
      .select('master_minter_address')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (!masterMinterData?.master_minter_address) {
      throw new Error('Master minter address not configured')
    }

    const masterMinterAddress = masterMinterData.master_minter_address.toLowerCase()
    console.log('Master minter address:', masterMinterAddress)

    // Get pending redemptions (email verified, no transaction hash yet)
    const { data: pendingRedemptions, error: redemptionsError } = await supabase
      .from('redemptions')
      .select('id, user_id, pkrsc_amount, created_at')
      .eq('status', 'pending')
      .eq('email_verified', true)
      .is('transaction_hash', null)
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .order('created_at', { ascending: false })

    if (redemptionsError) {
      console.error('Error fetching redemptions:', redemptionsError)
      throw redemptionsError
    }

    if (!pendingRedemptions || pendingRedemptions.length === 0) {
      console.log('No pending redemptions found')
      return new Response(
        JSON.stringify({ message: 'No pending redemptions to process' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingRedemptions.length} pending redemptions`)

    // Fetch recent token transfers to master minter using Etherscan API V2
    // Base network uses chainId 8453
    const apiUrl = `https://api.etherscan.io/v2/api`
    const params = new URLSearchParams({
      chainid: '8453', // Base network
      module: 'account',
      action: 'tokentx',
      contractaddress: PKRSC_TOKEN_ADDRESS,
      address: masterMinterAddress,
      page: '1',
      offset: '100', // Get last 100 transfers
      sort: 'desc',
      apikey: basescanApiKey
    })
    
    const fullUrl = `${apiUrl}?${params.toString()}`
    
    console.log('Fetching transfers from Etherscan API V2 for Base (chainId 8453)...')
    console.log('API URL (without key):', fullUrl.replace(basescanApiKey, 'REDACTED'))
    
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    
    const apiData = await response.json()

    console.log('Etherscan API Response Status:', apiData.status)
    console.log('Etherscan API Response Message:', apiData.message)
    console.log('Result Count:', Array.isArray(apiData.result) ? apiData.result.length : 'N/A')

    // Check for API errors
    if (apiData.status !== '1') {
      const errorMsg = apiData.message || apiData.result || 'Unknown error'
      console.error('Etherscan API error details:', {
        status: apiData.status,
        message: errorMsg,
        result: apiData.result,
        apiKeyExists: !!basescanApiKey,
        apiKeyLength: basescanApiKey?.length || 0
      })
      
      // Common error messages
      if (errorMsg.includes('Invalid API Key')) {
        throw new Error('Invalid BASESCAN_API_KEY. Get your API key from https://basescan.org/myapikey')
      }
      
      if (errorMsg.includes('rate limit')) {
        console.warn('Rate limit reached, will retry on next cron run')
        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Rate limit reached, will retry later',
            pending_redemptions: pendingRedemptions.length,
            matched_count: 0
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      
      throw new Error(`Etherscan API error: ${errorMsg}`)
    }

    // Handle "No transactions found" which returns status 0 but is not an error
    if (!apiData.result || (typeof apiData.result === 'string' && apiData.result.includes('No transactions'))) {
      console.log('No transfers found yet for master minter address')
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'No transfers found on blockchain yet',
          pending_redemptions: pendingRedemptions.length,
          matched_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!Array.isArray(apiData.result)) {
      console.warn('Unexpected API response format:', apiData.result)
      return new Response(
        JSON.stringify({ 
          success: true,
          message: 'Unexpected API response format',
          pending_redemptions: pendingRedemptions.length,
          matched_count: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const recentTransfers = apiData.result as BaseScanTransaction[]
    console.log(`Found ${recentTransfers.length} recent transfers to master minter`)

    // Check if these transaction hashes are already used
    const transferHashes = recentTransfers.map(tx => tx.hash.toLowerCase())
    const { data: usedHashes } = await supabase
      .from('used_transaction_hashes')
      .select('transaction_hash')
      .in('transaction_hash', transferHashes)

    const usedHashSet = new Set(usedHashes?.map(h => h.transaction_hash.toLowerCase()) || [])

    let matchedCount = 0
    const matches = []

    // Try to match transfers to redemptions
    for (const redemption of pendingRedemptions) {
      const expectedAmount = parseFloat(redemption.pkrsc_amount)
      const userAddress = redemption.user_id.toLowerCase()

      // Find matching transfer (within 24 hours of redemption creation)
      const redemptionTime = new Date(redemption.created_at).getTime() / 1000
      
      for (const transfer of recentTransfers) {
        const transferTime = parseInt(transfer.timeStamp)
        const transferAmount = parseFloat(transfer.value) / Math.pow(10, parseInt(transfer.tokenDecimal))
        const fromAddress = transfer.from.toLowerCase()
        const txHash = transfer.hash.toLowerCase()

        // Skip if already used
        if (usedHashSet.has(txHash)) {
          continue
        }

        // Check if transfer matches redemption:
        // 1. From the right user
        // 2. Amount matches (within 0.1% tolerance for rounding)
        // 3. Transfer happened after redemption was created
        // 4. Transfer happened within 24 hours of redemption
        const amountMatch = Math.abs(transferAmount - expectedAmount) / expectedAmount < 0.001
        const timeMatch = transferTime >= redemptionTime && transferTime <= redemptionTime + 24 * 60 * 60
        const addressMatch = fromAddress === userAddress

        if (addressMatch && amountMatch && timeMatch) {
          console.log(`✅ Match found for redemption ${redemption.id}:`)
          console.log(`   TX Hash: ${transfer.hash}`)
          console.log(`   Amount: ${transferAmount} PKRSC`)
          console.log(`   From: ${transfer.from}`)

          // Update redemption with transaction hash and set to pending_burn
          const { error: updateError } = await supabase
            .from('redemptions')
            .update({ 
              transaction_hash: transfer.hash,
              status: 'pending_burn',
              updated_at: new Date().toISOString()
            })
            .eq('id', redemption.id)

          if (updateError) {
            console.error(`Error updating redemption ${redemption.id}:`, updateError)
          } else {
            // Mark hash as used
            await supabase
              .from('used_transaction_hashes')
              .insert({
                transaction_hash: transfer.hash.toLowerCase(),
                transaction_type: 'redemption',
                used_by: redemption.user_id
              })

            // Log admin action
            await supabase
              .from('admin_actions')
              .insert({
                action_type: 'auto_detect_redemption_transfer',
                wallet_address: 'system',
                details: {
                  redemption_id: redemption.id,
                  transaction_hash: transfer.hash,
                  amount: transferAmount,
                  user: redemption.user_id
                }
              })

            matchedCount++
            matches.push({
              redemption_id: redemption.id,
              transaction_hash: transfer.hash,
              amount: transferAmount
            })
          }

          // Mark this hash as used to avoid duplicate matching
          usedHashSet.add(txHash)
          break // Move to next redemption
        }
      }
    }

    console.log(`✅ Auto-detection complete: ${matchedCount} redemptions matched`)

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-detection complete`,
        pending_redemptions: pendingRedemptions.length,
        matched_count: matchedCount,
        matches
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in auto-detect-redemption-transfers:', error)
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
