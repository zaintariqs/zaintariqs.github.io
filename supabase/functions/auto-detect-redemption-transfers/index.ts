import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const PKRSC_TOKEN_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const PKRSC_DECIMALS = 6
const BASE_RPC_URL = 'https://mainnet.base.org'

interface BaseScanTransaction {
  hash: string
  from: string
  to: string
  value: string
  timeStamp: string
  tokenDecimal: string
  tokenSymbol: string
}

interface TransferEvent {
  address: string
  topics: string[]
  data: string
  blockNumber: string
  transactionHash: string
  timeStamp?: number
}

// Helper function to detect transfers via RPC (faster than Etherscan)
async function detectTransfersViaRPC(supabase: any, pendingRedemptions: any[], masterMinterAddress: string) {
  const matches = []
  
  try {
    // Get current block number
    const blockResponse = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_blockNumber',
        params: []
      })
    })
    
    const blockData = await blockResponse.json()
    const currentBlock = parseInt(blockData.result, 16)
    const fromBlock = currentBlock - 2000 // Check last ~2000 blocks (about 66 min on Base, 2s block time)
    
    console.log(`Scanning blocks ${fromBlock} to ${currentBlock} via RPC...`)
    console.log(`Block range covers approximately ${(2000 * 2 / 60).toFixed(1)} minutes`)
    
    // ERC20 Transfer event signature: Transfer(address,address,uint256)
    const transferEventSignature = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'
    
    // Get Transfer events to master minter
    const logsResponse = await fetch(BASE_RPC_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'eth_getLogs',
        params: [{
          fromBlock: `0x${fromBlock.toString(16)}`,
          toBlock: `0x${currentBlock.toString(16)}`,
          address: PKRSC_TOKEN_ADDRESS,
          topics: [
            transferEventSignature,
            null, // from (any address)
            `0x000000000000000000000000${masterMinterAddress.slice(2).toLowerCase()}` // to (master minter)
          ]
        }]
      })
    })
    
    const logsData = await logsResponse.json()
    
    if (logsData.error) {
      console.error('RPC getLogs error:', logsData.error)
      return []
    }
    
    if (!logsData.result || logsData.result.length === 0) {
      console.log('No transfer events found via RPC')
      console.log(`(Checked ${pendingRedemptions.length} pending redemptions)`)
      return []
    }
    
    console.log(`Found ${logsData.result.length} transfer events via RPC`)
    console.log(`Matching against ${pendingRedemptions.length} pending redemptions...`)
    
    // Check which hashes are already used
    const transferHashes = logsData.result.map((log: TransferEvent) => log.transactionHash.toLowerCase())
    const { data: usedHashes } = await supabase
      .from('used_transaction_hashes')
      .select('transaction_hash')
      .in('transaction_hash', transferHashes)
    
    const usedHashSet = new Set(usedHashes?.map((h: any) => h.transaction_hash.toLowerCase()) || [])
    
    // Match transfers to redemptions
    for (const redemption of pendingRedemptions) {
      const expectedAmount = parseFloat(redemption.pkrsc_amount)
      const userAddress = redemption.user_id.toLowerCase()
      const redemptionTime = new Date(redemption.created_at).getTime() / 1000
      
      for (const log of logsData.result) {
        const txHash = log.transactionHash.toLowerCase()
        
        if (usedHashSet.has(txHash)) continue
        
        // Decode transfer event
        const fromAddress = '0x' + log.topics[1].slice(26).toLowerCase()
        const amount = parseInt(log.data, 16) / Math.pow(10, PKRSC_DECIMALS)
        
        // Get block timestamp
        const blockResponse = await fetch(BASE_RPC_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 3,
            method: 'eth_getBlockByNumber',
            params: [log.blockNumber, false]
          })
        })
        
        const blockData = await blockResponse.json()
        const blockTimestamp = parseInt(blockData.result.timestamp, 16)
        
        // Check if matches redemption
        const amountMatch = Math.abs(amount - expectedAmount) / expectedAmount < 0.001
        const timeMatch = blockTimestamp >= redemptionTime && blockTimestamp <= redemptionTime + 24 * 60 * 60
        const addressMatch = fromAddress === userAddress
        
        // Debug logging for non-matches
        if (addressMatch && !amountMatch) {
          console.log(`  ⚠️  Amount mismatch for ${redemption.id}: expected ${expectedAmount}, got ${amount}`)
        }
        if (amountMatch && !addressMatch) {
          console.log(`  ⚠️  Address mismatch: expected ${userAddress}, got ${fromAddress}`)
        }
        if (addressMatch && amountMatch && !timeMatch) {
          console.log(`  ⚠️  Time mismatch: redemption at ${redemptionTime}, tx at ${blockTimestamp}`)
        }
        
        if (addressMatch && amountMatch && timeMatch) {
          console.log(`✅ RPC Match found for redemption ${redemption.id}:`)
          console.log(`   TX Hash: ${log.transactionHash}`)
          console.log(`   Amount: ${amount} PKRSC`)
          console.log(`   From: ${fromAddress}`)
          
          // Update redemption
          const { error: updateError } = await supabase
            .from('redemptions')
            .update({ 
              transaction_hash: log.transactionHash,
              status: 'pending_burn',
              updated_at: new Date().toISOString()
            })
            .eq('id', redemption.id)
          
          if (!updateError) {
            // Mark hash as used
            await supabase
              .from('used_transaction_hashes')
              .insert({
                transaction_hash: log.transactionHash.toLowerCase(),
                transaction_type: 'redemption',
                used_by: redemption.user_id
              })
            
            // Log action
            await supabase
              .from('admin_actions')
              .insert({
                action_type: 'auto_detect_redemption_transfer_rpc',
                wallet_address: 'system',
                details: {
                  redemption_id: redemption.id,
                  transaction_hash: log.transactionHash,
                  amount: amount,
                  user: redemption.user_id,
                  method: 'rpc'
                }
              })
            
            matches.push({
              redemption_id: redemption.id,
              transaction_hash: log.transactionHash,
              amount: amount
            })
            
            usedHashSet.add(txHash)
          }
          
          break
        }
      }
    }
  } catch (error) {
    console.error('RPC detection error:', error)
  }
  
  return matches
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    // Use hardcoded API key for Base network
    const basescanApiKey = 'VCHJ2UNA6HAZUR89PYBVJ2GIY6PIW8DBWK'

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

    // First, try RPC-based lookup for faster detection
    console.log('Attempting RPC-based transfer detection...')
    const rpcMatches = await detectTransfersViaRPC(supabase, pendingRedemptions, masterMinterAddress)
    
    if (rpcMatches.length > 0) {
      console.log(`✅ RPC detection found ${rpcMatches.length} matches`)
      return new Response(
        JSON.stringify({
          success: true,
          message: `RPC-based detection complete`,
          pending_redemptions: pendingRedemptions.length,
          matched_count: rpcMatches.length,
          matches: rpcMatches
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fallback to Etherscan API if RPC didn't find anything
    console.log('RPC detection found no matches, falling back to Etherscan API...')
    
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

    // Check for API errors (but "No transactions found" is not an error)
    if (apiData.status !== '1') {
      const errorMsg = apiData.message || apiData.result || 'Unknown error'
      
      // "No transactions found" is a valid response, not an error
      if (errorMsg.includes('No transactions') || errorMsg.includes('No records')) {
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
