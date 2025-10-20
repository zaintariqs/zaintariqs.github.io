import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { ethers } from 'https://esm.sh/ethers@6.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2' // USDT on Base

const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function decimals() view returns (uint8)'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting USDT deposit detection...')

    // Get all whitelisted addresses
    const { data: whitelistData, error: whitelistError } = await supabase
      .from('whitelist_requests')
      .select('wallet_address')
      .eq('status', 'approved')

    if (whitelistError) {
      console.error('Error fetching whitelist:', whitelistError)
      throw whitelistError
    }

    const whitelistedAddresses = whitelistData.map(w => w.wallet_address.toLowerCase())
    console.log(`Monitoring ${whitelistedAddresses.length} whitelisted addresses`)

    if (whitelistedAddresses.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No whitelisted addresses to monitor' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get the last processed block
    const { data: lastDeposit } = await supabase
      .from('usdt_deposits')
      .select('block_number')
      .order('block_number', { ascending: false })
      .limit(1)
      .single()

    const fromBlock = lastDeposit ? lastDeposit.block_number + 1 : 'latest'
    
    // Connect to Base network
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const usdtContract = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, provider)

    // Get current block
    const currentBlock = await provider.getBlockNumber()
    const searchFromBlock = typeof fromBlock === 'number' ? fromBlock : Math.max(0, currentBlock - 1000)
    
    console.log(`Searching from block ${searchFromBlock} to ${currentBlock}`)

    // Query Transfer events
    const filter = usdtContract.filters.Transfer()
    const events = await usdtContract.queryFilter(filter, searchFromBlock, currentBlock)
    console.log(`Found ${events.length} USDT transfer events`)

    let processedCount = 0
    let depositCount = 0

    for (const event of events) {
      const to = event.args?.to?.toLowerCase()
      
      // Check if recipient is whitelisted
      if (!whitelistedAddresses.includes(to)) {
        continue
      }

      depositCount++
      const txHash = event.transactionHash
      const from = event.args?.from?.toLowerCase()
      const value = event.args?.value
      const block = await event.getBlock()

      // Convert amount (USDT has 6 decimals on Base)
      const amount = ethers.formatUnits(value, 6)

      // Check if deposit already exists
      const { data: existingDeposit } = await supabase
        .from('usdt_deposits')
        .select('id')
        .eq('transaction_hash', txHash)
        .single()

      if (existingDeposit) {
        console.log(`Deposit ${txHash} already recorded, skipping`)
        continue
      }

      // Insert USDT deposit
      const { error: insertError } = await supabase
        .from('usdt_deposits')
        .insert({
          user_wallet_address: to,
          transaction_hash: txHash,
          from_address: from,
          amount_usdt: amount,
          block_number: block.number,
          timestamp: new Date(block.timestamp * 1000).toISOString()
        })

      if (insertError) {
        console.error(`Error inserting deposit ${txHash}:`, insertError)
      } else {
        processedCount++
        console.log(`Recorded USDT deposit: ${from} → ${to} (${amount} USDT)`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} new USDT deposits from ${depositCount} whitelisted recipients out of ${events.length} total events`,
        from_block: searchFromBlock,
        to_block: currentBlock
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error detecting USDT deposits:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})