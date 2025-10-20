import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { ethers } from 'https://esm.sh/ethers@6.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const POOL_ADDRESS = '0x1bC6fB786B7B5BA4D31A7F47a75eC3Fd3B26690E'
const PKRSC_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'

const POOL_ABI = [
  'event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)',
  'function token0() external view returns (address)',
  'function token1() external view returns (address)'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting Uniswap trade detection...')

    // Get the last processed block
    const { data: lastTrade } = await supabase
      .from('trade_history')
      .select('block_number')
      .order('block_number', { ascending: false })
      .limit(1)
      .single()

    const fromBlock = lastTrade ? lastTrade.block_number + 1 : 'latest'
    
    // Connect to Base network
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const poolContract = new ethers.Contract(POOL_ADDRESS, POOL_ABI, provider)

    // Get token addresses to determine which is token0/token1
    const token0 = await poolContract.token0()
    const token1 = await poolContract.token1()
    const isPkrscToken0 = token0.toLowerCase() === PKRSC_ADDRESS.toLowerCase()

    console.log(`PKRSC is token${isPkrscToken0 ? '0' : '1'}`)

    // Query swap events
    const filter = poolContract.filters.Swap()
    const currentBlock = await provider.getBlockNumber()
    const searchFromBlock = typeof fromBlock === 'number' ? fromBlock : Math.max(0, currentBlock - 1000)
    
    console.log(`Searching from block ${searchFromBlock} to ${currentBlock}`)
    
    const events = await poolContract.queryFilter(filter, searchFromBlock, currentBlock)
    console.log(`Found ${events.length} swap events`)

    let processedCount = 0
    let whitelistedCount = 0

    for (const event of events) {
      const txHash = event.transactionHash
      const block = await event.getBlock()
      const trader = event.args?.sender || event.args?.recipient

      // Check if trader is whitelisted
      const { data: isWhitelisted } = await supabase.rpc('is_wallet_whitelisted', {
        wallet_addr: trader
      })

      if (!isWhitelisted) {
        continue
      }

      whitelistedCount++

      const amount0 = ethers.formatUnits(event.args?.amount0 || 0, 6) // USDT/PKRSC decimals
      const amount1 = ethers.formatUnits(event.args?.amount1 || 0, 6)
      
      // Determine trade direction and amounts
      let tokenIn: string
      let tokenOut: string
      let amountIn: string
      let amountOut: string

      if (isPkrscToken0) {
        // PKRSC is token0, USDT is token1
        if (parseFloat(amount0) < 0) {
          // Selling PKRSC for USDT
          tokenIn = 'PKRSC'
          tokenOut = 'USDT'
          amountIn = Math.abs(parseFloat(amount0)).toString()
          amountOut = Math.abs(parseFloat(amount1)).toString()
        } else {
          // Buying PKRSC with USDT
          tokenIn = 'USDT'
          tokenOut = 'PKRSC'
          amountIn = Math.abs(parseFloat(amount1)).toString()
          amountOut = Math.abs(parseFloat(amount0)).toString()
        }
      } else {
        // USDT is token0, PKRSC is token1
        if (parseFloat(amount1) < 0) {
          // Selling PKRSC for USDT
          tokenIn = 'PKRSC'
          tokenOut = 'USDT'
          amountIn = Math.abs(parseFloat(amount1)).toString()
          amountOut = Math.abs(parseFloat(amount0)).toString()
        } else {
          // Buying PKRSC with USDT
          tokenIn = 'USDT'
          tokenOut = 'PKRSC'
          amountIn = Math.abs(parseFloat(amount0)).toString()
          amountOut = Math.abs(parseFloat(amount1)).toString()
        }
      }

      const priceAtTrade = parseFloat(amountIn) / parseFloat(amountOut)

      // Check if trade already exists
      const { data: existingTrade } = await supabase
        .from('trade_history')
        .select('id')
        .eq('transaction_hash', txHash)
        .single()

      if (existingTrade) {
        console.log(`Trade ${txHash} already recorded, skipping`)
        continue
      }

      // Insert trade history
      const { error: insertError } = await supabase
        .from('trade_history')
        .insert({
          user_wallet_address: trader,
          transaction_hash: txHash,
          block_number: block.number,
          timestamp: new Date(block.timestamp * 1000).toISOString(),
          token_in: tokenIn,
          token_out: tokenOut,
          amount_in: amountIn,
          amount_out: amountOut,
          price_at_trade: priceAtTrade,
          pool_address: POOL_ADDRESS
        })

      if (insertError) {
        console.error(`Error inserting trade ${txHash}:`, insertError)
      } else {
        processedCount++
        console.log(`Recorded trade: ${trader} - ${tokenIn} → ${tokenOut}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Processed ${processedCount} new trades from ${whitelistedCount} whitelisted addresses out of ${events.length} total events`,
        from_block: searchFromBlock,
        to_block: currentBlock
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error detecting trades:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})