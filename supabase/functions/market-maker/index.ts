import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { ethers } from 'https://esm.sh/ethers@6.9.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to verify admin status
async function verifyAdmin(supabase: any, walletAddress: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin_wallet', {
    wallet_addr: walletAddress
  })
  
  if (error) {
    console.error('Error verifying admin:', error)
    return false
  }
  
  return data === true
}

// Uniswap V3 Router on Base
const UNISWAP_ROUTER = '0x2626664c2603336E57B271c5C0b26F421741e481'
const UNISWAP_FACTORY = '0x33128a8fC17869897dcE68Ed026d694621f6FDfD'
const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
const PKRSC_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const PKRSC_USDT_POOL = '0x1bC6fB786B7B5BA4D31A7F47a75eC3Fd3B26690E' // Direct pool address
// Use multiple RPC endpoints as fallbacks
const BASE_RPCS = [
  'https://mainnet.base.org',
  'https://base.llamarpc.com',
  'https://base-rpc.publicnode.com'
]

// Minimal Uniswap Router ABI
const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountIn)'
]

// Uniswap V3 Factory ABI
const FACTORY_ABI = [
  'function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)'
]

// Uniswap V3 Pool ABI
const POOL_ABI = [
  'function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)',
  'function token0() view returns (address)',
  'function token1() view returns (address)'
]

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function decimals() view returns (uint8)'
]

// Helpers
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms))

function isRateLimitError(error: any): boolean {
  try {
    const msg = error?.info?.error?.message?.toLowerCase?.() || error?.message?.toLowerCase?.() || ''
    const code = error?.info?.error?.code
    return msg.includes('rate limit') || code === -32016
  } catch {
    return false
  }
}

async function withRetries<T>(fn: () => Promise<T>, attempts = 3, baseDelayMs = 300): Promise<T> {
  let lastErr: any
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      lastErr = err
      if (isRateLimitError(err) && i < attempts - 1) {
        const delay = baseDelayMs * Math.pow(2, i)
        console.warn(`Rate limited, retrying in ${delay}ms (attempt ${i + 2}/${attempts})`)
        await sleep(delay)
        continue
      }
      break
    }
  }
  throw lastErr
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Market maker bot triggered')

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const privateKey = Deno.env.get('MARKET_MAKER_PRIVATE_KEY')!

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get the requesting wallet address from the request body
    const { walletAddress, force } = await req.json().catch(() => ({}))
    const forceRun = Boolean(force)
    
    if (!walletAddress) {
      console.error('No wallet address provided')
      return new Response(
        JSON.stringify({ error: 'Wallet address required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify admin status
    const isAdmin = await verifyAdmin(supabase, walletAddress)
    if (!isAdmin) {
      console.error('Unauthorized: Not an admin wallet')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Admin verified:', walletAddress)

    // Check for suspicious activity (circuit breaker)
    const { data: recentFailures } = await supabase
      .from('market_maker_transactions')
      .select('id, created_at, error_message')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false })

    const criticalFailures = (recentFailures || []).filter((r: any) => {
      const msg = (r.error_message || '').toLowerCase()
      // Ignore inventory/rate-limit type failures
      if (msg.includes('insufficient pkrsc')) return false
      if (msg.includes('rate limit')) return false
      return true
    })

    if (!forceRun && criticalFailures.length >= 3) {
      console.error('Circuit breaker triggered: Too many recent critical failures')
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_CIRCUIT_BREAKER',
        details: { reason: 'Too many critical failed transactions in last hour', failures: criticalFailures.length }
      })
      
      return new Response(
        JSON.stringify({ message: 'Circuit breaker active. Skipping run without force=true.' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Fetch bot configuration
    const { data: config, error: configError } = await supabase
      .from('market_maker_config')
      .select('*')
      .single()

    if (configError || !config) {
      console.error('Failed to fetch config:', configError)
      return new Response(JSON.stringify({ error: 'Config not found' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check if bot is active
    if (config.status !== 'active') {
      console.log('Bot is not active, status:', config.status)
      return new Response(JSON.stringify({ message: 'Bot is paused' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Check minimum trade interval
    if (config.last_trade_at) {
      const timeSinceLastTrade = Date.now() - new Date(config.last_trade_at).getTime()
      if (timeSinceLastTrade < config.min_trade_interval_seconds * 1000) {
        console.log('Too soon since last trade')
        return new Response(JSON.stringify({ message: 'Trade interval not reached' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // Set up Web3 provider and wallet with fallback RPC
    let provider: ethers.JsonRpcProvider | null = null
    let wallet: ethers.Wallet | null = null
    
    for (const rpc of BASE_RPCS) {
      try {
        provider = new ethers.JsonRpcProvider(rpc)
        await provider.getBlockNumber() // Test connection
        wallet = new ethers.Wallet(privateKey, provider)
        console.log(`Using RPC: ${rpc}`)
        break
      } catch (error) {
        console.warn(`RPC ${rpc} failed, trying next...`)
        continue
      }
    }
    
    if (!provider || !wallet) {
      throw new Error('All RPC endpoints failed')
    }

    console.log('Bot wallet address:', wallet.address)

    // Fetch live USD/PKR exchange rate
    let usdToPkr = parseFloat(config.target_price) // Fallback to config
    try {
      const forexResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD')
      const forexData = await forexResponse.json()
      if (forexData.rates && forexData.rates.PKR) {
        usdToPkr = forexData.rates.PKR
        console.log(`Live USD/PKR rate: 1 USD = ${usdToPkr} PKR`)
        
        // Log the rate fetch for monitoring
        await supabase.from('admin_actions').insert({
          wallet_address: walletAddress,
          action_type: 'MARKET_MAKER_FOREX_RATE',
          details: { usdToPkr, source: 'exchangerate-api.com' }
        })
      } else {
        console.warn('Failed to fetch PKR rate, using config target:', usdToPkr)
      }
    } catch (error) {
      console.warn('Forex API error, using config target:', error)
    }

    // Fetch current price from Uniswap pool directly
    let currentPrice = 0
    let liquidityUsd = 0
    let priceSource = 'none'
    
    try {
      console.log('Fetching price from Uniswap PKRSC/USDT pool...')
      console.log('Pool address:', PKRSC_USDT_POOL)
      
      const poolAddress = PKRSC_USDT_POOL
      
      if (poolAddress && poolAddress !== ethers.ZeroAddress) {
        const pool = new ethers.Contract(poolAddress, POOL_ABI, provider)
        
        // Get current price from pool
        const slot0 = await pool.slot0()
        const sqrtPriceX96 = slot0[0]
        
        console.log('sqrtPriceX96:', sqrtPriceX96.toString())
        
        // Get token order and decimals (both tokens have 6 decimals, so we can simplify)
        const token0 = await pool.token0()
        const token1 = await pool.token1()
        
        console.log('token0:', token0)
        console.log('token1:', token1)
        
        // Both PKRSC and USDT have 6 decimals, so no decimal adjustment needed
        const sqrtPrice = Number(sqrtPriceX96) / (2 ** 96)
        const price = sqrtPrice ** 2
        
        console.log('Raw price from sqrtPriceX96:', price)
        
        // Token order adjustment (no decimal adjustment needed since both have 6 decimals)
        if (token0.toLowerCase() === PKRSC_ADDRESS.toLowerCase()) {
          currentPrice = price
          console.log('PKRSC is token0, price:', currentPrice)
        } else {
          currentPrice = 1 / price
          console.log('PKRSC is token1, price:', currentPrice)
        }
        
        priceSource = 'uniswap_pool'
        console.log('✓ Successfully fetched Uniswap pool price: $' + currentPrice.toFixed(6))
        
        await supabase.from('admin_actions').insert({
          wallet_address: walletAddress,
          action_type: 'MARKET_MAKER_PRICE_FETCH',
          details: { 
            source: 'uniswap_pool',
            poolAddress,
            token0,
            token1,
            sqrtPriceX96: sqrtPriceX96.toString(),
            price: currentPrice
          }
        })
      } else {
        console.error('Pool address is invalid')
        await supabase.from('admin_actions').insert({
          wallet_address: walletAddress,
          action_type: 'MARKET_MAKER_POOL_INVALID',
          details: { 
            poolAddress: PKRSC_USDT_POOL
          }
        })
      }
    } catch (error) {
      console.error('ERROR fetching Uniswap pool price:', error)
      console.error('Error details:', error instanceof Error ? error.message : String(error))
      
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_POOL_ERROR',
        details: { 
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        }
      })
    }
    
    // If no price found from pool, try DEX Screener as fallback
    if (currentPrice === 0) {
      try {
        const priceResponse = await fetch(`https://api.dexscreener.com/latest/dex/tokens/${PKRSC_ADDRESS}`)
        const priceData = await priceResponse.json()
        
        if (priceData.pairs && priceData.pairs.length > 0) {
          const basePool = priceData.pairs.find((pair: any) => 
            pair.chainId === 'base' && (pair.quoteToken?.symbol === 'USDT' || pair.quoteToken?.symbol === 'USDC')
          )
          
          if (basePool) {
            currentPrice = parseFloat(basePool.priceUsd || '0')
            liquidityUsd = parseFloat(basePool.liquidity?.usd || '0')
            priceSource = 'dexscreener'
            console.log('Price from DEX Screener fallback:', currentPrice, 'Liquidity:', liquidityUsd)
          }
        }
      } catch (error) {
        console.warn('DEX Screener fallback failed:', error)
      }
    }
    
    // If still no price, calculate from target USD/PKR rate as last resort
    if (currentPrice === 0) {
      console.log('No pool price found, using forex-derived target price as fallback')
      currentPrice = 1 / usdToPkr
      priceSource = 'calculated_fallback'
      
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_PRICE_FALLBACK',
        details: { 
          reason: 'Pool and DEX price unavailable, using calculated target',
          calculatedPrice: currentPrice,
          usdToPkr
        }
      })
    }
    
    // Check for minimum liquidity and adjust trade size
    if (priceSource === 'dexscreener' && liquidityUsd < 100) {
      console.warn('Very low liquidity detected:', liquidityUsd)
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_LOW_LIQUIDITY',
        details: { liquidityUsd, currentPrice }
      })
      
      // Pause bot if liquidity is critically low
      if (liquidityUsd < 50) {
        await supabase.from('market_maker_config').update({
          status: 'paused'
        }).eq('id', config.id)
        
        return new Response(JSON.stringify({ 
          error: 'Pool liquidity too low for safe trading',
          liquidityUsd 
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }
    
    console.log(`Price: $${currentPrice.toFixed(6)} (source: ${priceSource})`)

    // Calculate price deviation using live forex rate
    // Since 1 PKRSC = 1 PKR, and we have USD/PKR rate, 
    // target price in USD = 1 / usdToPkr
    const targetPrice = 1 / usdToPkr
    const threshold = parseFloat(config.price_threshold)
    const deviation = (currentPrice - targetPrice) / targetPrice

    console.log(`Live Rate: 1 USD = ${usdToPkr} PKR`)
    console.log(`Target: $${targetPrice.toFixed(6)}, Current: $${currentPrice.toFixed(6)}, Deviation: ${(deviation * 100).toFixed(2)}%`)

    // Determine if we need to trade
    let shouldBuy = false
    let shouldSell = false

    if (deviation < -threshold) {
      // Price is too low, buy PKRSC to increase price
      shouldBuy = true
      console.log('Price below threshold, initiating BUY')
    } else if (deviation > threshold) {
      // Price is too high, sell PKRSC to decrease price
      shouldSell = true
      console.log('Price above threshold, initiating SELL')
    } else {
      console.log('Price within acceptable range')
      return new Response(JSON.stringify({ 
        message: 'Price within range',
        currentPrice,
        targetPrice,
        deviation: `${(deviation * 100).toFixed(2)}%`
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Use fixed trade amount from config (not dynamic)
    const tradeAmountUsdt = parseFloat(config.trade_amount_usdt)
    
    console.log(`Using fixed trade amount from config: $${tradeAmountUsdt.toFixed(2)} USDT`)
    
    await supabase.from('admin_actions').insert({
      wallet_address: walletAddress,
      action_type: 'MARKET_MAKER_FIXED_TRADE_SIZE',
      details: { 
        tradeAmount: tradeAmountUsdt,
        deviation: (Math.abs(deviation) * 100).toFixed(2) + '%',
        source: 'config.trade_amount_usdt'
      }
    })
    
    let txHash = ''
    let action = ''
    let amountPkrsc = 0

    try {
      const router = new ethers.Contract(UNISWAP_ROUTER, ROUTER_ABI, wallet)
      const usdt = new ethers.Contract(USDT_ADDRESS, ERC20_ABI, wallet)
      const pkrsc = new ethers.Contract(PKRSC_ADDRESS, ERC20_ABI, wallet)

      if (shouldBuy) {
        action = 'BUY'
        const amountIn = ethers.parseUnits(tradeAmountUsdt.toString(), 6) // USDT has 6 decimals
        
        // Check USDT balance
        const usdtBalance = await withRetries(() => usdt.balanceOf(wallet.address))
        console.log('USDT balance:', ethers.formatUnits(usdtBalance, 6))
        
        if (usdtBalance < amountIn) {
          throw new Error(`Insufficient USDT balance. Have: ${ethers.formatUnits(usdtBalance, 6)}, Need: ${tradeAmountUsdt}`)
        }
        
        // Check and approve USDT
        const allowance = await withRetries(() => usdt.allowance(wallet.address, UNISWAP_ROUTER))
        if (allowance < amountIn) {
          const approveTx = await usdt.approve(UNISWAP_ROUTER, ethers.MaxUint256)
          await approveTx.wait()
          console.log('USDT approved')
        }

        // Execute swap: USDT -> PKRSC with 30% slippage tolerance (low-liquidity safety)
        const expectedOut = ethers.parseUnits((tradeAmountUsdt / currentPrice).toFixed(6), 6)
        const minOut = (expectedOut * BigInt(70)) / BigInt(100) // 30% slippage
        
        const params = {
          tokenIn: USDT_ADDRESS,
          tokenOut: PKRSC_ADDRESS,
          fee: 100, // 0.01% fee tier
          recipient: wallet.address,
          amountIn: amountIn,
          amountOutMinimum: minOut,
          sqrtPriceLimitX96: 0
        }

        const tx = await router.exactInputSingle(params)
        const receipt = await tx.wait()
        txHash = receipt.hash
        amountPkrsc = tradeAmountUsdt / currentPrice // Approximate
        
        console.log('BUY executed:', txHash)
      } else if (shouldSell) {
        action = 'SELL'
        amountPkrsc = tradeAmountUsdt / currentPrice
        const amountIn = ethers.parseUnits(amountPkrsc.toFixed(6), 6) // PKRSC has 6 decimals (not 18!)
        
        // Check PKRSC balance
        const pkrscBalance = await withRetries(() => pkrsc.balanceOf(wallet.address))
        console.log('PKRSC balance:', ethers.formatUnits(pkrscBalance, 6))
        console.log('PKRSC needed:', amountPkrsc.toFixed(6))
        
        if (pkrscBalance < amountIn) {
          await supabase.from('admin_actions').insert({
            wallet_address: walletAddress,
            action_type: 'MARKET_MAKER_INSUFFICIENT_INVENTORY',
            details: {
              have: ethers.formatUnits(pkrscBalance, 6),
              need: amountPkrsc.toFixed(6)
            }
          })
          
          return new Response(JSON.stringify({
            message: 'Insufficient PKRSC inventory in bot wallet to execute SELL',
            have: ethers.formatUnits(pkrscBalance, 6),
            need: amountPkrsc.toFixed(6)
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
        
        // Check and approve PKRSC
        const allowance = await withRetries(() => pkrsc.allowance(wallet.address, UNISWAP_ROUTER))
        if (allowance < amountIn) {
          const approveTx = await pkrsc.approve(UNISWAP_ROUTER, ethers.MaxUint256)
          await approveTx.wait()
          console.log('PKRSC approved')
        }

        // Execute swap: PKRSC -> USDT with 30% slippage tolerance (low-liquidity safety)
        const expectedOut = ethers.parseUnits((tradeAmountUsdt * 0.70).toFixed(6), 6)
        
        const params = {
          tokenIn: PKRSC_ADDRESS,
          tokenOut: USDT_ADDRESS,
          fee: 100, // 0.01% fee tier
          recipient: wallet.address,
          amountIn: amountIn,
          amountOutMinimum: expectedOut,
          sqrtPriceLimitX96: 0
        }

        const tx = await router.exactInputSingle(params)
        const receipt = await tx.wait()
        txHash = receipt.hash
        
        console.log('SELL executed:', txHash)
      }

      // Log transaction
      await supabase.from('market_maker_transactions').insert({
        transaction_hash: txHash,
        action,
        amount_usdt: tradeAmountUsdt,
        amount_pkrsc: amountPkrsc,
        price: currentPrice,
        gas_used: 0, // Could calculate from receipt
        status: 'completed'
      })

      // Update last trade time
      await supabase.from('market_maker_config').update({
        last_trade_at: new Date().toISOString()
      }).eq('id', config.id)

      // Log successful trade to admin actions for monitoring
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_TRADE',
        details: {
          action,
          txHash,
          amountUsdt: tradeAmountUsdt,
          amountPkrsc: amountPkrsc,
          price: currentPrice,
          success: true
        }
      })

      return new Response(JSON.stringify({ 
        success: true,
        action,
        txHash,
        currentPrice,
        targetPrice
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })

    } catch (tradeError) {
      console.error('Trade execution failed:', tradeError)
      
      // Handle RPC rate limit gracefully (do not mark bot as error)
      if (isRateLimitError(tradeError)) {
        await supabase.from('admin_actions').insert({
          wallet_address: walletAddress,
          action_type: 'MARKET_MAKER_RATE_LIMIT',
          details: {
            action: shouldBuy ? 'BUY' : 'SELL',
            amountUsdt: tradeAmountUsdt,
            price: currentPrice,
            message: 'RPC rate limit encountered; skipping this run'
          }
        })
        
        return new Response(JSON.stringify({ 
          message: 'Skipped due to RPC rate limit; please retry shortly',
          rateLimited: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Handle slippage too tight gracefully
      const errMsg = (tradeError instanceof Error ? tradeError.message : String(tradeError)).toLowerCase()
      if (errMsg.includes('too little received')) {
        await supabase.from('admin_actions').insert({
          wallet_address: walletAddress,
          action_type: 'MARKET_MAKER_SLIPPAGE_PROTECTION',
          details: {
            action: shouldBuy ? 'BUY' : 'SELL',
            amountUsdt: tradeAmountUsdt,
            price: currentPrice,
            message: 'Swap would receive too little; skipping to avoid bad fill'
          }
        })

        return new Response(JSON.stringify({ 
          message: 'Skipped due to low received (slippage/impact). Try smaller trade or higher tolerance.',
          slippageProtection: true
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      
      // Log failed transaction
      await supabase.from('market_maker_transactions').insert({
        transaction_hash: 'FAILED',
        action: shouldBuy ? 'BUY' : 'SELL',
        amount_usdt: tradeAmountUsdt,
        amount_pkrsc: amountPkrsc,
        price: currentPrice,
        status: 'failed',
        error_message: tradeError instanceof Error ? tradeError.message : 'Unknown error'
      })

      // Update config status to error
      await supabase.from('market_maker_config').update({
        status: 'error'
      }).eq('id', config.id)

      // Alert admins of failure
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_TRADE_FAILED',
        details: {
          error: tradeError instanceof Error ? tradeError.message : 'Unknown error',
          action: shouldBuy ? 'BUY' : 'SELL',
          amountUsdt: tradeAmountUsdt,
          price: currentPrice
        }
      })

      throw tradeError
    }

  } catch (error) {
    console.error('Market maker error:', error)
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
