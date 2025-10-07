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
const USDT_ADDRESS = '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2'
const PKRSC_ADDRESS = '0x1f192CB7B36d7acfBBdCA1E0C1d697361508F9D5'
const BASE_RPC = 'https://mainnet.base.org'

// Minimal Uniswap Router ABI
const ROUTER_ABI = [
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountOut)',
  'function exactOutputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountOut, uint256 amountInMaximum, uint160 sqrtPriceLimitX96)) external returns (uint256 amountIn)'
]

// ERC20 ABI
const ERC20_ABI = [
  'function balanceOf(address) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)'
]

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
    const { walletAddress } = await req.json().catch(() => ({}))
    
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
      .select('*')
      .eq('status', 'failed')
      .gte('created_at', new Date(Date.now() - 3600000).toISOString()) // Last hour
      .order('created_at', { ascending: false })

    if (recentFailures && recentFailures.length >= 3) {
      console.error('Circuit breaker triggered: Too many recent failures')
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_CIRCUIT_BREAKER',
        details: { reason: 'Too many failed transactions in last hour', failures: recentFailures.length }
      })
      
      return new Response(
        JSON.stringify({ error: 'Market maker circuit breaker activated due to recent failures' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

    // Set up Web3 provider and wallet
    const provider = new ethers.JsonRpcProvider(BASE_RPC)
    const wallet = new ethers.Wallet(privateKey, provider)

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

    // Fetch current price from multiple sources
    let currentPrice = 0
    let liquidityUsd = 0
    let priceSource = 'none'
    
    try {
      // Try DEX Screener first
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
          console.log('Price from DEX Screener:', currentPrice, 'Liquidity:', liquidityUsd)
        }
      }
    } catch (error) {
      console.warn('DEX Screener failed:', error)
    }
    
    // If no price found, calculate from target USD/PKR rate
    if (currentPrice === 0) {
      console.log('No DEX price found, using forex-derived target price')
      currentPrice = 1 / usdToPkr
      priceSource = 'calculated'
      
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_PRICE_FALLBACK',
        details: { 
          reason: 'DEX price unavailable, using calculated target',
          calculatedPrice: currentPrice,
          usdToPkr
        }
      })
    }
    
    // Check for minimum liquidity (if available)
    if (priceSource === 'dexscreener' && liquidityUsd < 100) {
      console.warn('Very low liquidity detected:', liquidityUsd)
      await supabase.from('admin_actions').insert({
        wallet_address: walletAddress,
        action_type: 'MARKET_MAKER_LOW_LIQUIDITY',
        details: { liquidityUsd, currentPrice }
      })
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

    // Execute trade
    const tradeAmountUsdt = parseFloat(config.trade_amount_usdt)
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
        const usdtBalance = await usdt.balanceOf(wallet.address)
        console.log('USDT balance:', ethers.formatUnits(usdtBalance, 6))
        
        if (usdtBalance < amountIn) {
          throw new Error(`Insufficient USDT balance. Have: ${ethers.formatUnits(usdtBalance, 6)}, Need: ${tradeAmountUsdt}`)
        }
        
        // Check and approve USDT
        const allowance = await usdt.allowance(wallet.address, UNISWAP_ROUTER)
        if (allowance < amountIn) {
          const approveTx = await usdt.approve(UNISWAP_ROUTER, ethers.MaxUint256)
          await approveTx.wait()
          console.log('USDT approved')
        }

        // Execute swap: USDT -> PKRSC
        const params = {
          tokenIn: USDT_ADDRESS,
          tokenOut: PKRSC_ADDRESS,
          fee: 3000, // 0.3%
          recipient: wallet.address,
          amountIn: amountIn,
          amountOutMinimum: 0, // Accept any amount (risky, but simplified)
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
        const amountIn = ethers.parseUnits(amountPkrsc.toFixed(18), 18) // PKRSC has 18 decimals
        
        // Check PKRSC balance
        const pkrscBalance = await pkrsc.balanceOf(wallet.address)
        console.log('PKRSC balance:', ethers.formatUnits(pkrscBalance, 18))
        console.log('PKRSC needed:', amountPkrsc.toFixed(6))
        
        if (pkrscBalance < amountIn) {
          throw new Error(`Insufficient PKRSC balance. Have: ${ethers.formatUnits(pkrscBalance, 18)}, Need: ${amountPkrsc.toFixed(6)}`)
        }
        
        // Check and approve PKRSC
        const allowance = await pkrsc.allowance(wallet.address, UNISWAP_ROUTER)
        if (allowance < amountIn) {
          const approveTx = await pkrsc.approve(UNISWAP_ROUTER, ethers.MaxUint256)
          await approveTx.wait()
          console.log('PKRSC approved')
        }

        // Execute swap: PKRSC -> USDT
        const params = {
          tokenIn: PKRSC_ADDRESS,
          tokenOut: USDT_ADDRESS,
          fee: 3000,
          recipient: wallet.address,
          amountIn: amountIn,
          amountOutMinimum: 0,
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
