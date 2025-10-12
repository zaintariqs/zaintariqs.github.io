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

    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    const { ethers } = await import('https://esm.sh/ethers@6.9.0')

    // Set up wallet and contract
    const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
    const masterMinterWallet = new ethers.Wallet(masterMinterPrivateKey, provider)
    const pkrscContract = new ethers.Contract(PKRSC_TOKEN_ADDRESS, BURN_ABI, masterMinterWallet)

    console.log('Master Minter Wallet:', masterMinterWallet.address)

    // Find redemptions that need burning (email verified, pending_burn status)
    const { data: pendingRedemptions, error: fetchError } = await supabase
      .from('redemptions')
      .select('id, user_id, pkrsc_amount, transaction_hash, status')
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
        // Calculate burn amount (net amount after fee)
        const burnAmount = redemption.pkrsc_amount
        const burnAmountWei = ethers.parseUnits(burnAmount.toString(), PKRSC_DECIMALS)

        console.log(`Processing redemption ${redemption.id}: burning ${burnAmount} PKRSC`)

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

        // Update redemption status
        await supabase.from('redemptions').update({
          status: 'pending', // Ready for admin to process bank transfer
        }).eq('id', redemption.id)

        // Log the burn
        await supabase.from('admin_actions').insert({
          action_type: 'redemption_tokens_burned',
          wallet_address: redemption.user_id,
          details: {
            redemptionId: redemption.id,
            burnAmount,
            burnTxHash: receipt.hash,
            masterMinter: masterMinterWallet.address,
            timestamp: new Date().toISOString()
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
