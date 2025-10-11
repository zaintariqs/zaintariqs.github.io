import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'npm:resend@2.0.0'
import { decryptEmail } from '../_shared/email-encryption.ts'
import { 
  verifyWalletSignature, 
  hasAdminPermission, 
  checkRateLimit, 
  isTransactionHashUsed,
  markTransactionHashUsed,
  logAdminAction,
  isNonceValid
} from '../_shared/security.ts'

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'team@pkrsc.org'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-wallet-address, x-wallet-signature, x-signature-message, x-nonce',
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
    const signature = req.headers.get('x-wallet-signature')
    const messageHeaderEncoded = req.headers.get('x-signature-message')
    const signedMessage = messageHeaderEncoded ? atob(messageHeaderEncoded) : null
    const nonce = req.headers.get('x-nonce')
    
    if (!walletAddress || !signature || !signedMessage || !nonce) {
      return new Response(
        JSON.stringify({ error: 'Wallet address, signature, message, and nonce required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate nonce timestamp
    if (!isNonceValid(nonce)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired nonce' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Verify wallet signature
    const sigVerification = await verifyWalletSignature(
      supabase,
      walletAddress,
      signature,
      signedMessage,
      nonce
    )

    if (!sigVerification.valid) {
      return new Response(
        JSON.stringify({ error: sigVerification.error || 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check admin permission
    const hasPermission = await hasAdminPermission(supabase, walletAddress, 'approve_deposits')
    
    if (!hasPermission) {
      console.error('Admin lacks approve_deposits permission:', walletAddress)
      return new Response(
        JSON.stringify({ error: 'Unauthorized: approve_deposits permission required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limit (max 20 approvals per 5 minutes)
    const rateLimitResult = await checkRateLimit(supabase, walletAddress, 'approve_deposit', 20, 5)
    if (!rateLimitResult.allowed) {
      return new Response(
        JSON.stringify({ 
          error: 'Rate limit exceeded',
          retryAfter: rateLimitResult.retryAfter 
        }),
        { 
          status: 429, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Retry-After': String(rateLimitResult.retryAfter || 300)
          } 
        }
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

      // Check if transaction hash was already used (prevent replay attacks)
      const txHashUsed = await isTransactionHashUsed(supabase, mintTxHash)
      if (txHashUsed) {
        return new Response(
          JSON.stringify({ error: 'Transaction hash already used (replay attack prevented)' }),
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

        // Enhanced validation: Check transaction is recent (within last 24 hours)
        const block = await provider.getBlock(receipt.blockNumber)
        const txTimestamp = block?.timestamp || 0
        const currentTime = Math.floor(Date.now() / 1000)
        const twentyFourHours = 24 * 60 * 60

        if (currentTime - txTimestamp > twentyFourHours) {
          return new Response(
            JSON.stringify({ error: 'Transaction is too old (must be within last 24 hours)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Enhanced validation: Check minimum confirmations (at least 3 blocks)
        const currentBlock = await provider.getBlockNumber()
        const confirmations = currentBlock - receipt.blockNumber
        if (confirmations < 3) {
          return new Response(
            JSON.stringify({ error: `Transaction needs more confirmations (${confirmations}/3)` }),
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
        
        // Mark transaction hash as used
        await markTransactionHashUsed(supabase, mintTxHash, 'mint', deposit.user_id)
      } catch (error) {
        console.error('Error verifying mint transaction:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to verify mint transaction on-chain' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Calculate 0.5% transaction fee
      const FEE_PERCENTAGE = 0.5
      const feeAmount = (deposit.amount_pkr * FEE_PERCENTAGE) / 100
      const netAmount = deposit.amount_pkr - feeAmount

      console.log(`Deposit fee calculation: Original=${deposit.amount_pkr} PKR, Fee=${feeAmount} PKR (${FEE_PERCENTAGE}%), Net=${netAmount} PKR`)

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

      // Record transaction fee
      const { error: feeError } = await supabase
        .from('transaction_fees')
        .insert({
          transaction_type: 'deposit',
          transaction_id: depositId,
          user_id: deposit.user_id.toLowerCase(),
          original_amount: deposit.amount_pkr,
          fee_percentage: FEE_PERCENTAGE,
          fee_amount: feeAmount,
          net_amount: netAmount
        })

      if (feeError) {
        console.error('Error recording transaction fee:', feeError)
        // Don't fail the approval, just log the error
      } else {
        console.log(`Transaction fee recorded: ${feeAmount} PKR`)
      }

      // Update PKR bank reserves (with full deposit amount - bank receives full PKR)
      const { error: reserveError } = await supabase.rpc('update_pkr_reserves', {
        amount_change: deposit.amount_pkr,
        updated_by_wallet: walletAddress.toLowerCase()
      })

      if (reserveError) {
        console.error('Error updating PKR reserves:', reserveError)
        // Log but don't fail the approval
      } else {
        console.log(`Updated PKR reserves: +${deposit.amount_pkr} PKR`)
      }

      // Log admin action with signature
      await logAdminAction(
        supabase,
        'deposit_approved',
        walletAddress,
        { 
          depositId,
          userId: deposit.user_id,
          amount: deposit.amount_pkr,
          mintTxHash,
          reserveUpdated: !reserveError,
          timestamp: new Date().toISOString()
        },
        nonce,
        signature,
        signedMessage
      )

      // Send success email notification
      const { data: whitelistData } = await supabase
        .from('whitelist_requests')
        .select('email')
        .ilike('wallet_address', deposit.user_id)
        .single()

      if (whitelistData?.email) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: [whitelistData.email],
            subject: 'PKRSC Deposit Confirmed',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #059669;">Deposit Successful!</h2>
                
                <p>Dear User,</p>
                
                <p>Your PKRSC deposit has been successfully processed and confirmed.</p>
                
                <div style="background-color: #f0fdf4; border-left: 4px solid #059669; padding: 16px; margin: 20px 0;">
                  <strong>Deposit Details:</strong><br><br>
                  <strong>Amount Deposited:</strong> ${deposit.amount_pkr} PKR<br>
                  <strong>Transaction Fee (0.5%):</strong> ${feeAmount.toFixed(2)} PKR<br>
                  <strong>PKRSC Tokens Received:</strong> ${netAmount.toFixed(2)} PKRSC<br>
                  <strong>Payment Method:</strong> ${deposit.payment_method}<br>
                  <strong>Your Wallet:</strong> ${deposit.user_id}
                </div>
                
                <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <strong>Blockchain Transaction:</strong><br>
                  <a href="https://basescan.org/tx/${mintTxHash}" style="color: #2563eb; word-break: break-all;">
                    ${mintTxHash}
                  </a>
                </div>
                
                ${deposit.user_transaction_id ? `
                  <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                    <strong>Banking Transaction ID:</strong> ${deposit.user_transaction_id}
                  </div>
                ` : ''}
                
                <p>Your PKRSC tokens are now available in your wallet and ready to use.</p>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #6b7280; font-size: 12px;">
                  If you have any questions, contact us at <a href="mailto:team@pkrsc.org">team@pkrsc.org</a>
                </p>
              </div>
            `,
          })
          console.log(`Deposit success email sent to ${userEmail}`)
        } catch (emailError) {
          console.error('Error sending deposit success email:', emailError)
        }
      }

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

      // Log admin action with signature
      await logAdminAction(
        supabase,
        'deposit_rejected',
        walletAddress,
        { 
          depositId,
          userId: deposit.user_id,
          rejectionReason,
          timestamp: new Date().toISOString()
        },
        nonce,
        signature,
        signedMessage
      )

      // Send rejection email notification
      const { data: whitelistData } = await supabase
        .from('whitelist_requests')
        .select('email')
        .ilike('wallet_address', deposit.user_id)
        .single()

      if (whitelistData?.email) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: [whitelistData.email],
            subject: 'PKRSC Deposit - Action Required',
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #dc2626;">Deposit Could Not Be Processed</h2>
                
                <p>Dear User,</p>
                
                <p>Unfortunately, your PKRSC deposit could not be processed at this time.</p>
                
                <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; margin: 20px 0;">
                  <strong>Deposit Details:</strong><br><br>
                  <strong>Amount:</strong> ${deposit.amount_pkr} PKR<br>
                  <strong>Payment Method:</strong> ${deposit.payment_method}<br>
                  <strong>Your Wallet:</strong> ${deposit.user_id}
                </div>
                
                <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <strong>Reason:</strong> ${rejectionReason}
                </div>
                
                <p><strong>What to do next:</strong></p>
                <ul>
                  <li>Review the reason above carefully</li>
                  <li>Correct any issues with your transaction</li>
                  <li>Submit a new deposit request</li>
                </ul>
                
                <p>If you believe this was rejected in error or need assistance, please contact our support team:</p>
                
                <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
                  <strong>Email:</strong> <a href="mailto:team@pkrsc.org">team@pkrsc.org</a>
                </div>
                
                <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
                
                <p style="color: #6b7280; font-size: 12px;">
                  This is an automated notification from PKRSC.
                </p>
              </div>
            `,
          })
          console.log(`Deposit rejection email sent to ${userEmail}`)
        } catch (emailError) {
          console.error('Error sending deposit rejection email:', emailError)
        }
      }

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