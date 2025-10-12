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
const PKRSC_TOKEN_ADDRESS = '0x220aC54E22056B834522cD1A6A3DfeCA63bC3C6e'
const PKRSC_DECIMALS = 6

Deno.serve(async (req) => {
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
    const { depositId, action, rejectionReason } = body

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
      // Calculate 0.5% transaction fee
      const FEE_PERCENTAGE = 0.5
      const feeAmount = (deposit.amount_pkr * FEE_PERCENTAGE) / 100
      const netAmount = deposit.amount_pkr - feeAmount

      console.log(`Deposit fee calculation: Original=${deposit.amount_pkr} PKR, Fee=${feeAmount} PKR (${FEE_PERCENTAGE}%), Net=${netAmount} PKR`)

      // Automatically mint PKRSC tokens to user's wallet
      let mintTxHash: string
      try {
        const { ethers } = await import('https://esm.sh/ethers@6.9.0')
        const provider = new ethers.JsonRpcProvider('https://mainnet.base.org')
        
        // Get master minter wallet
        const masterMinterPrivateKey = Deno.env.get('MASTER_MINTER_PRIVATE_KEY')
        if (!masterMinterPrivateKey) {
          throw new Error('Master minter private key not configured')
        }
        
        const masterMinterWallet = new ethers.Wallet(masterMinterPrivateKey, provider)
        console.log(`Master minter wallet: ${masterMinterWallet.address}`)

        // PKRSC token contract ABI (mint function)
        const tokenABI = [
          'function mint(address to, uint256 amount) returns (bool)',
          'function decimals() view returns (uint8)'
        ]
        
        const tokenContract = new ethers.Contract(PKRSC_TOKEN_ADDRESS, tokenABI, masterMinterWallet)
        
        // Convert net amount to token units (with decimals)
        const amountInTokenUnits = ethers.parseUnits(netAmount.toFixed(PKRSC_DECIMALS), PKRSC_DECIMALS)
        
        console.log(`Minting ${netAmount} PKRSC (${amountInTokenUnits.toString()} units) to ${deposit.user_id}`)
        
        // Execute mint transaction
        const tx = await tokenContract.mint(deposit.user_id, amountInTokenUnits)
        console.log(`Mint transaction submitted: ${tx.hash}`)
        
        // Wait for confirmation
        const receipt = await tx.wait()
        
        if (receipt.status !== 1) {
          throw new Error('Mint transaction failed on-chain')
        }
        
        mintTxHash = tx.hash
        console.log(`Mint transaction confirmed: ${mintTxHash}`)
        
        // Mark transaction hash as used
        await markTransactionHashUsed(supabase, mintTxHash, 'mint', deposit.user_id)
      } catch (error) {
        console.error('Error minting tokens:', error)
        return new Response(
          JSON.stringify({ error: `Failed to mint tokens: ${error.message}` }),
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

      // Update PKR bank reserves (with net amount after fee deduction)
      const { error: reserveError } = await supabase.rpc('update_pkr_reserves', {
        amount_change: netAmount,
        updated_by_wallet: walletAddress.toLowerCase()
      })

      if (reserveError) {
        console.error('Error updating PKR reserves:', reserveError)
        // Log but don't fail the approval
      } else {
        console.log(`Updated PKR reserves: +${netAmount} PKR`)
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
          feeAmount: feeAmount,
          netAmount: netAmount,
          mintTxHash,
          reserveUpdated: !reserveError,
          feeRecorded: !feeError,
          timestamp: new Date().toISOString()
        },
        nonce,
        signature,
        signedMessage
      )

      // Fetch and decrypt email if available
      let userEmail = null
      const { data: emailData } = await supabase
        .from('encrypted_emails')
        .select('encrypted_email')
        .ilike('wallet_address', deposit.user_id)
        .single()
      
      if (emailData?.encrypted_email) {
        try {
          userEmail = await decryptEmail(emailData.encrypted_email)
        } catch (error) {
          console.error('Failed to decrypt email:', error)
        }
      }

      if (userEmail) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: [userEmail],
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