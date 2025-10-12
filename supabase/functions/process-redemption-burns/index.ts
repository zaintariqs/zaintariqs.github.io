import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// PKRSC Contract details
const PKRSC_TOKEN_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const PKRSC_DECIMALS = 6

// ERC20 Burnable ABI (only burn function)
const BURN_ABI = [
  'function burn(uint256 amount) external',
  'function balanceOf(address account) external view returns (uint256)'
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const masterMinterPrivateKey = Deno.env.get('MASTER_MINTER_PRIVATE_KEY')
    
    if (!masterMinterPrivateKey) {
      throw new Error('Master minter private key not configured')
    }

    // SECURITY: Require authorization header to prevent unauthorized burn operations
    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn('Unauthorized burn attempt - missing authorization header')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const token = authHeader.replace('Bearer ', '')
    // Verify it's the service role key or anon key (cron job uses service role)
    if (token !== supabaseServiceKey && token !== Deno.env.get('SUPABASE_ANON_KEY')) {
      console.warn('Unauthorized burn attempt - invalid token')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { ethers } = await import('https://esm.sh/ethers@6.9.0')

    // Set up wallet and contract
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const masterMinterWallet = new ethers.Wallet(masterMinterPrivateKey, provider)
    const pkrscContract = new ethers.Contract(PKRSC_TOKEN_ADDRESS, BURN_ABI, masterMinterWallet)

    console.log('Master Minter Wallet:', masterMinterWallet.address)

    // Find redemptions that need burning (email verified, pending_burn status)
    // Join with transaction_fees to get the net amount (amount to burn, excluding fee)
    const { data: pendingRedemptions, error: fetchError } = await supabase
      .from('redemptions')
      .select(`
        id, 
        user_id, 
        pkrsc_amount, 
        transaction_hash, 
        status,
        desired_pkr_amount
      `)
      .eq('status', 'pending_burn')
      .eq('email_verified', true)
      .order('created_at', { ascending: true })
      .limit(10) // Process max 10 at a time

    if (fetchError) {
      console.error('Error fetching pending redemptions:', fetchError)
      throw fetchError
    }

    if (!pendingRedemptions || pendingRedemptions.length === 0) {
      console.log('No pending redemptions to process')
      return new Response(
        JSON.stringify({ message: 'No pending redemptions', processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found ${pendingRedemptions.length} redemption(s) to process`)

    const results = []

    for (const redemption of pendingRedemptions) {
      try {
        // Get the net amount to burn (excluding the fee) from transaction_fees table
        const { data: feeData } = await supabase
          .from('transaction_fees')
          .select('net_amount, fee_amount, original_amount')
          .eq('transaction_id', redemption.id)
          .single()
        
        // Calculate burn amount: should be the desired PKR amount in PKRSC (1:1), NOT the full transfer amount
        // User transferred: original_amount (e.g., 1005.03 PKRSC)
        // Fee: fee_amount (e.g., 5.03 PKRSC) - stays in master minter wallet
        // Burn: net_amount (e.g., 1000 PKRSC) - matches the PKR sent to user's bank
        const burnAmount = feeData?.net_amount || redemption.desired_pkr_amount || (redemption.pkrsc_amount / 1.005)
        const feeAmount = feeData?.fee_amount || (redemption.pkrsc_amount * 0.005)
        const burnAmountWei = ethers.parseUnits(burnAmount.toFixed(6), PKRSC_DECIMALS)

        console.log(`Processing redemption ${redemption.id}:`)
        console.log(`  - User transferred: ${redemption.pkrsc_amount} PKRSC to master minter`)
        console.log(`  - Burning: ${burnAmount} PKRSC (matches PKR to be sent to bank)`)
        console.log(`  - Fee kept: ${feeAmount.toFixed(6)} PKRSC (remains in master minter wallet as revenue)`)

        // SECURITY CHECK 1: Check daily burn limit
        const { data: limitCheck, error: limitError } = await supabase.rpc('check_daily_burn_limit', {
          burn_amount_pkrsc: burnAmount
        }).single()

        if (limitError) {
          console.error('Error checking daily burn limit:', limitError)
        } else if (limitCheck && !limitCheck.allowed) {
          console.error(`Daily burn limit exceeded. Current: ${limitCheck.current_daily_total} PKRSC, Remaining: ${limitCheck.limit_remaining} PKRSC, Requested: ${burnAmount} PKRSC`)
          
          await supabase.from('redemptions').update({ status: 'error' }).eq('id', redemption.id)
          await supabase.from('admin_actions').insert({
            action_type: 'redemption_burn_daily_limit_exceeded',
            wallet_address: redemption.user_id,
            details: {
              redemptionId: redemption.id,
              burnAmount,
              dailyTotal: limitCheck.current_daily_total,
              limitRemaining: limitCheck.limit_remaining,
              severity: 'critical'
            }
          })

          results.push({
            redemptionId: redemption.id,
            success: false,
            error: 'Daily burn limit exceeded'
          })
          continue
        }

        // SECURITY CHECK 2: Detect anomalous patterns
        const { data: anomalyCheck, error: anomalyError } = await supabase.rpc('detect_burn_anomaly', {
          burn_amount_pkrsc: burnAmount
        }).single()

        if (anomalyError) {
          console.error('Error detecting anomaly:', anomalyError)
        } else if (anomalyCheck && anomalyCheck.is_anomaly) {
          console.warn(`⚠️ ANOMALY DETECTED: ${anomalyCheck.reason} (Severity: ${anomalyCheck.severity})`)
          
          // Log the anomaly but continue (don't block legitimate large burns)
          await supabase.from('admin_actions').insert({
            action_type: 'redemption_burn_anomaly_detected',
            wallet_address: redemption.user_id,
            details: {
              redemptionId: redemption.id,
              burnAmount,
              anomalyReason: anomalyCheck.reason,
              severity: anomalyCheck.severity,
              timestamp: new Date().toISOString()
            }
          })
        }

        // Check master minter balance
        const balance = await pkrscContract.balanceOf(masterMinterWallet.address)
        console.log(`Master minter balance: ${ethers.formatUnits(balance, PKRSC_DECIMALS)} PKRSC`)

        if (balance < burnAmountWei) {
          console.error(`Insufficient balance to burn. Have: ${ethers.formatUnits(balance, PKRSC_DECIMALS)}, Need: ${burnAmount}`)
          
          await supabase.from('redemptions').update({
            status: 'error'
          }).eq('id', redemption.id)

          await supabase.from('admin_actions').insert({
            action_type: 'redemption_burn_insufficient_balance',
            wallet_address: redemption.user_id,
            details: {
              redemptionId: redemption.id,
              burnAmount,
              balance: ethers.formatUnits(balance, PKRSC_DECIMALS),
              error: 'Insufficient master minter balance'
            }
          })

          results.push({
            redemptionId: redemption.id,
            success: false,
            error: 'Insufficient balance'
          })
          continue
        }

        // Execute burn via contract
        console.log(`Calling burn(${burnAmountWei.toString()})...`)
        const tx = await pkrscContract.burn(burnAmountWei)
        console.log(`Burn transaction sent: ${tx.hash}`)
        
        const receipt = await tx.wait()
        console.log(`Burn transaction confirmed: ${receipt.hash}`)

        // Update redemption status to burn_confirmed
        await supabase.from('redemptions').update({
          status: 'burn_confirmed', // Tokens burned, ready for admin to process bank transfer
        }).eq('id', redemption.id)

        // SECURITY: Record burn operation in audit table
        await supabase.from('burn_operations').insert({
          redemption_id: redemption.id,
          burn_amount: burnAmount,
          burn_tx_hash: receipt.hash,
          master_minter_address: masterMinterWallet.address,
          user_id: redemption.user_id,
          status: 'completed'
        })

        // Log the burn
        await supabase.from('admin_actions').insert({
          action_type: 'redemption_tokens_burned',
          wallet_address: redemption.user_id,
          details: {
            redemptionId: redemption.id,
            burnAmount,
            burnTxHash: receipt.hash,
            masterMinter: masterMinterWallet.address,
            timestamp: new Date().toISOString(),
            securityChecks: 'passed'
          }
        })

        results.push({
          redemptionId: redemption.id,
          success: true,
          burnTxHash: receipt.hash,
          burnAmount
        })

        console.log(`✓ Successfully burned ${burnAmount} PKRSC for redemption ${redemption.id}`)

      } catch (error) {
        console.error(`Failed to process redemption ${redemption.id}:`, error)
        
        await supabase.from('redemptions').update({
          status: 'error'
        }).eq('id', redemption.id)

        await supabase.from('admin_actions').insert({
          action_type: 'redemption_burn_failed',
          wallet_address: redemption.user_id,
          details: {
            redemptionId: redemption.id,
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        })

        results.push({
          redemptionId: redemption.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(
      JSON.stringify({
        message: `Processed ${pendingRedemptions.length} redemption(s)`,
        success: successCount,
        failed: failCount,
        results
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing redemption burns:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
